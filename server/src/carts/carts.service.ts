import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ─── Định nghĩa kiểu dữ liệu giỏ hàng ─────────────────────────────────────────
type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        variant: {
          include: { product: true };
        };
      };
    };
  };
}>;

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string): Promise<any> {
    let cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
          orderBy: { added_at: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { user_id: userId },
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
    }

    return this.enrichCart(cart as CartWithItems);
  }

  async addItem(
    userId: string,
    variantId: string,
    quantity: number,
  ): Promise<any> {
    if (quantity <= 0) throw new BadRequestException('Số lượng phải lớn hơn 0');

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, is_active: true },
      include: { product: true },
    });

    if (!variant || variant.product.status !== 'active') {
      throw new NotFoundException(
        'Sản phẩm không tồn tại, đã ngừng kinh doanh hoặc đang trong trạng thái chờ duyệt',
      );
    }

    const available = variant.stock_quantity - variant.reserved_quantity;
    if (available < quantity) {
      throw new BadRequestException(`Chỉ còn ${available} sản phẩm trong kho`);
    }

    const cart = await this.prisma.cart.upsert({
      where: { user_id: userId },
      create: { user_id: userId },
      update: {},
    });

    await this.prisma.cartItem.upsert({
      where: {
        cart_id_variant_id: { cart_id: cart.id, variant_id: variantId },
      },
      create: {
        cart_id: cart.id,
        variant_id: variantId,
        quantity: quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    variantId: string,
    quantity: number,
  ): Promise<any> {
    if (quantity <= 0) return this.removeItem(userId, variantId);

    const cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
    });
    if (!cart) throw new NotFoundException('Giỏ hàng không tồn tại');

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    const available =
      (variant?.stock_quantity ?? 0) - (variant?.reserved_quantity ?? 0);
    if (quantity > available) {
      throw new BadRequestException(`Chỉ còn ${available} sản phẩm trong kho`);
    }

    await this.prisma.cartItem.update({
      where: {
        cart_id_variant_id: { cart_id: cart.id, variant_id: variantId },
      },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, variantId: string): Promise<any> {
    const cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
    });
    if (!cart) throw new NotFoundException('Giỏ hàng không tồn tại');

    try {
      await this.prisma.cartItem.delete({
        where: {
          cart_id_variant_id: { cart_id: cart.id, variant_id: variantId },
        },
      });
    } catch {
      // Dùng _error để báo cho TS biết chúng ta cố tình không dùng biến này
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { user_id: userId },
    });
    if (!cart) return;
    await this.prisma.cartItem.deleteMany({ where: { cart_id: cart.id } });
  }

  private enrichCart(cart: CartWithItems) {
    const subtotal =
      cart.items?.reduce(
        (sum: number, i) => sum + Number(i.variant.price) * i.quantity,
        0,
      ) ?? 0;
    const total_items =
      cart.items?.reduce((sum: number, i) => sum + i.quantity, 0) ?? 0;
    return { ...cart, subtotal, total_price: subtotal, total_items };
  }
}
