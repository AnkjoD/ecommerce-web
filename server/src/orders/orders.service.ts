import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  Prisma,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '@prisma/client';
import {
  CartItemWithVariant,
  OrderTotals,
  PaginatedResult,
} from './interfaces/order.interface';

// ─── Kiểu Coupon từ Prisma ────────────────────────────────────────────────────
type CouponRecord = Prisma.CouponGetPayload<Record<string, never>>;

// Cấu hình mã trạng thái GHTK (Tham khảo GHTK_Full_Docs.md)
export const GHTK_STATUS = {
  CANCELLED: -1,
  PENDING: 1,
  ACCEPTED: 2,
  PICKED: 3,
  DELIVERING: 4,
  DELIVERED: 5,
  AUDITED: 6,
  RETURNED: 21,
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Tạo đơn hàng từ giỏ ────────────────────────────────────────────────────

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });
    if (!cart?.items.length) throw new BadRequestException('Giỏ hàng trống');

    // 🛡️ BẢO MẬT: Kiểm tra quyền sở hữu địa chỉ
    const address = await this.prisma.address.findUnique({
      where: { id: dto.address_id },
    });
    if (!address || address.user_id !== userId) {
      throw new ForbiddenException('Địa chỉ giao hàng không hợp lệ');
    }

    const typedItems = cart.items as unknown as CartItemWithVariant[];

    const coupon: CouponRecord | null = dto.coupon_code
      ? await this.validateCoupon(dto.coupon_code)
      : null;

    const totals = this.calculateTotal(typedItems, coupon, address.province);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          user_id: userId,
          address_id: dto.address_id,
          order_code: this.generateOrderCode(),
          payment_method: dto.payment_method as unknown as PaymentMethod,
          status: OrderStatus.pending,
          payment_status: PaymentStatus.unpaid,
          ...totals,
          items: {
            create: typedItems.map((ci) => ({
              variant_id: ci.variant_id,
              product_name: ci.variant.product.name,
              variant_info: ci.variant.options 
                ? Object.entries(ci.variant.options as Record<string, string>)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' / ')
                : '',
              unit_price: ci.variant.price,
              quantity: ci.quantity,
              subtotal: Number(ci.variant.price) * ci.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // THẮT CHẶT KHO (Atomic Stock Check)
      for (const ci of typedItems) {
        const rowsAffected = await tx.$executeRaw`
          UPDATE "product_variants"
          SET "reserved_quantity" = "reserved_quantity" + ${ci.quantity}
          WHERE "id" = ${ci.variant_id}
            AND ("stock_quantity" - "reserved_quantity") >= ${ci.quantity}
        `;

        if (rowsAffected === 0) {
          throw new BadRequestException(
            `Sản phẩm "${ci.variant.product.name} (${ci.variant.sku})" đã hết hàng`,
          );
        }
      }

      // THẮT CHẶT COUPON (Atomic Usage Check)
      if (coupon) {
        const updateResult = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            used_count: { lt: coupon.usage_limit },
            is_active: true,
          },
          data: {
            used_count: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException(
            'Mã giảm giá vừa hết lượt sử dụng trong lúc bạn đặt hàng',
          );
        }

        await tx.orderCoupon.create({
          data: {
            order_id: order.id,
            coupon_id: coupon.id,
            discount_applied: totals.discount_amount,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cart_id: cart.id } });

      // Phát sự kiện để GhtkService (hoặc listener) đẩy đơn sang GHTK (nếu là COD)
      if (order.payment_method === PaymentMethod.cod) {
        this.eventEmitter.emit('order.created', order);
      }

      return order;
    });
  }

  /**
   * CHỐT KHO THỰC TẾ (Commit Inventory)
   * Hàm này sẽ chuyển từ hàng "Giữ chỗ" (reserved) sang "Đã bán" (decrement stock_quantity).
   * Đảm bảo chỉ được gọi 1 lần duy nhất cho mỗi đơn hàng.
   */
  async commitInventory(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.status === OrderStatus.cancelled) return;

    for (const item of order.items) {
      // Trừ stock_quantity và giải phóng reserved_quantity cùng lúc
      const rowsAffected = await tx.$executeRaw`
        UPDATE "product_variants" 
        SET "stock_quantity" = "stock_quantity" - ${item.quantity},
            "reserved_quantity" = "reserved_quantity" - ${item.quantity},
            "sold_count" = "sold_count" + ${item.quantity}
        WHERE "id" = ${item.variant_id}
          AND "stock_quantity" >= ${item.quantity}
      `;

      if (rowsAffected === 0) {
        throw new BadRequestException(
          `Lỗi kho khi xử lý đơn hàng: Sản phẩm ID ${item.variant_id} không đủ tồn kho vật lý`,
        );
      }
    }
  }

  // ─── Tự động hủy đơn hàng quá hạn (Cron Job) ────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoCancelOrders() {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() - 30);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.pending,
        created_at: { lt: expirationTime },
      },
      select: { id: true, user_id: true },
    });

    if (expiredOrders.length > 0) {
      console.log(
        `[Auto-Cancel] Đang hủy ${expiredOrders.length} đơn hàng quá hạn...`,
      );
      for (const order of expiredOrders) {
        try {
          await this.cancel(order.id, order.user_id);
          console.log(`[Auto-Cancel] Thành công: ${order.id}`);
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `[Auto-Cancel] Thất bại cho đơn ${order.id}: ${errMsg}`,
          );
        }
      }
    }
  }

  // ─── Các hàm khác ───────────────────────────────────────────────────────────

  async findByUser(
    userId: string,
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.OrderWhereInput = { user_id: userId };

    if (status) {
      const statusArray = status.split(',');
      where.status = { in: statusArray as OrderStatus[] };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { user_id: userId } }),
    ]);

    return { data, total, page, limit, total_pages: Math.ceil(total / limit) };
  }

  async findById(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payment: true,
        address: true,
      },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.user_id !== userId) {
      throw new ForbiddenException('Không có quyền truy cập đơn hàng này');
    }
    return order;
  }

  async cancel(id: string, userId: string, isSystem = false): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (!isSystem && order.user_id !== userId) {
      throw new ForbiddenException('Không có quyền hủy đơn hàng này');
    }

    const cancellableStatuses: string[] = [
      OrderStatus.pending,
      OrderStatus.confirmed,
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Không thể hủy đơn hàng ở trạng thái "${order.status}"`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.cancelled },
      });

      const isCommitted =
        order.payment_status === PaymentStatus.paid ||
        order.status === OrderStatus.delivered;

      for (const item of order.items) {
        if (isCommitted) {
          // Nếu đã trừ vào stock_quantity -> Trả lại stock_quantity và giảm sold_count
          await tx.productVariant.update({
            where: { id: item.variant_id },
            data: {
              stock_quantity: { increment: item.quantity },
              sold_count: { decrement: item.quantity },
            },
          });
        } else {
          // Nếu mới chỉ ở dạng reserved -> Chỉ cần giải phóng reserved_quantity
          await tx.productVariant.update({
            where: { id: item.variant_id },
            data: { reserved_quantity: { decrement: item.quantity } },
          });
        }
      }

      if (order.payment_status === PaymentStatus.paid && order.payment) {
        await this.paymentsService.refund(
          order.payment.id,
          Number(order.total),
        );
      }
    });
  }

  async adminList(
    page = 1,
    limit = 20,
    userId?: string,
    status?: string,
    search?: string,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.OrderWhereInput = {};

    if (userId) {
      where.user_id = userId;
    }

    if (status) {
      where.status = status as OrderStatus;
    }

    if (search) {
      where.OR = [
        { order_code: { contains: search, mode: 'insensitive' } },
        { user: { full_name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
          user: { select: { id: true, full_name: true, email: true } },
          address: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit, total_pages: Math.ceil(total / limit) };
  }

  async adminUpdateStatus(orderId: string, newStatus: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    return this.prisma.$transaction(async (tx) => {
      const isDelivered = newStatus === OrderStatus.delivered;
      const isCod = (order.payment_method as string) === 'cod';

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          payment_status:
            isDelivered && isCod ? PaymentStatus.paid : order.payment_status,
        },
      });

      // Nếu chuyển sang DELIVERED và là COD -> thì mới trừ kho (vì COD chưa trừ lúc thanh toán)
      if (isDelivered && isCod) {
        await this.commitInventory(tx, orderId);
      }
      return updatedOrder;
    });
  }

  async adminUpdatePaymentStatus(orderId: string, newStatus: PaymentStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { payment_status: newStatus },
    });
  }

  private calculateTotal(
    items: CartItemWithVariant[],
    coupon: CouponRecord | null,
    province: string,
  ): OrderTotals {
    const subtotal = items.reduce(
      (sum, i) => sum + Number(i.variant.price) * i.quantity,
      0,
    );
    let discount_amount = 0;
    if (coupon && subtotal >= Number(coupon.min_order_value)) {
      discount_amount =
        coupon.discount_type === 'percent'
          ? subtotal * (Number(coupon.discount_value) / 100)
          : Math.min(Number(coupon.discount_value), subtotal);
    }
    const afterDiscount = subtotal - discount_amount;

    // Tính phí giao hàng chuẩn nghiệp vụ
    let shipping_fee = 0;
    if (afterDiscount < 500000) {
      if (province.includes('Hồ Chí Minh')) {
        shipping_fee = 20000;
      } else if (province.includes('Hà Nội') || province.includes('Đà Nẵng')) {
        shipping_fee = 30000;
      } else {
        shipping_fee = 40000;
      }
    }

    const total = afterDiscount + shipping_fee;
    return { subtotal, discount_amount, shipping_fee, total };
  }

  private async validateCoupon(code: string): Promise<CouponRecord> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code, is_active: true, expires_at: { gt: new Date() } },
    });
    if (!coupon) {
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    }
    if (coupon.used_count >= coupon.usage_limit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt dùng');
    }
    return coupon;
  }

  private generateOrderCode(): string {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
  }

  // ─── Các hàm xử lý Webhook GHTK ─────────────────────────────────────────────

  async handleGhtkSuccess(orderId: string, label: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) return;

      // Nếu đơn hàng chưa được ghi nhận là Đã giao
      if (order.status !== OrderStatus.delivered) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.delivered,
            payment_status: PaymentStatus.paid,
            ghtk_label: label,
            shipping_log: data,
          },
        });

        // Với COD, chỉ trừ kho khi giao hàng thành công
        if (order.payment_method === PaymentMethod.cod) {
          await this.commitInventory(tx, orderId);
        }
      }
    });
  }

  async handleGhtkFailure(orderId: string, label: string, data: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) return;

    // Logic hủy đơn tự động từ vận chuyển (Ví dụ: khách từ chối nhận, trả hàng)
    // Gọi hàm cancel có sẵn nhưng bỏ qua kiểm tra quyền user (vì đây là system call)
    await this.cancel(order.id, order.user_id, true);

    // Lưu log lỗi
    await this.prisma.order.update({
      where: { id: orderId },
      data: { shipping_log: data },
    });
  }

  async updateGhtkStatus(orderId: string, label: string, data: any) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        ghtk_label: label,
        shipping_log: data,
      },
    });
  }
}
