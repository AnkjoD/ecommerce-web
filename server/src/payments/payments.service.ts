// payments/payments.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, OrderStatus } from '@/common/enums';

@Injectable()
export class PaymentsService {
  private readonly vnpUrl =
    'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly returnUrl: string;
  private readonly apiUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // configService.get() trả về string | undefined — dùng ?? '' để đảm bảo là string
    // (Nếu env không có VNPAY_* → sẽ throw lỗi khi tạo URL, cần đặt đúng trong .env)
    this.tmnCode = this.configService.get<string>('VNPAY_TMN_CODE') ?? '';
    this.hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET') ?? '';
    this.returnUrl = this.configService.get<string>('VNPAY_RETURN_URL') ?? '';
    this.apiUrl =
      this.configService.get<string>('VNPAY_API_URL') ??
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
  }

  async createPaymentUrl(
    orderId: string,
    ipAddr: string,
    userId: string,
    saveCard = false,
  ): Promise<{ url: string; params: Record<string, string> }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('Đơn hàng không tồn tại');

    const date = new Date();
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: String(Math.round(Number(order.total) * 100)),
      vnp_CreateDate: this.formatDate(date),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${order.order_code}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: this.returnUrl,
      vnp_TxnRef: order.order_code,
      vnp_ExpireDate: this.formatDate(new Date(date.getTime() + 15 * 60_000)),
    };

    // Chuẩn hóa IpAddr (VNPAY không nhận ::1)
    if (
      params['vnp_IpAddr'] === '::1' ||
      params['vnp_IpAddr'] === '127.0.0.1'
    ) {
      params['vnp_IpAddr'] = '127.0.0.1';
    }

    // Nếu người dùng muốn lưu thẻ (Tokenization)
    if (saveCard) {
      params['vnp_AppUserId'] = userId; // ID định danh người dùng trong hệ thống
    }

    const sorted: Record<string, string> = {};
    const keys = Object.keys(params).sort();
    keys.forEach((key) => {
      sorted[key] = params[key];
    });

    // Tạo chuỗi ký tự để tạo mã băm (VNPAY 2.1.0 yêu cầu encode khoẳng trắng là +)
    const signData = keys
      .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
      .join('&');

    const signature = crypto
      .createHmac('sha512', this.hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    sorted['vnp_SecureHash'] = signature;

    await this.prisma.payment.upsert({
      where: { order_id: orderId },
      update: {
        provider: 'vnpay',
        provider_order_id: order.order_code,
        amount: order.total,
        status: PaymentStatus.UNPAID,
      },
      create: {
        order_id: orderId,
        provider: 'vnpay',
        provider_order_id: order.order_code,
        amount: order.total,
        status: PaymentStatus.UNPAID,
      },
    });

    return {
      url: this.vnpUrl,
      params: sorted,
    };
  }

  async handleCallback(params: Record<string, string>) {
    const secureHash = params['vnp_SecureHash'];
    const sortedKeys = Object.keys(params)
      .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash')
      .sort();

    const signData = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
      .join('&');

    const expectedHash = crypto
      .createHmac('sha512', this.hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    if (secureHash !== expectedHash) {
      throw new BadRequestException('Chữ ký không hợp lệ');
    }

    const orderCode = params['vnp_TxnRef'];
    const isSuccess = params['vnp_ResponseCode'] === '00';

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { provider_order_id: orderCode },
      });

      // Không tìm thấy payment record — có thể bị tấn công replay callback giả
      if (!payment)
        throw new BadRequestException('Không tìm thấy payment record');

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED,
          transaction_id: params['vnp_TransactionNo'],
          raw_response: params,
          paid_at: isSuccess ? new Date() : null,
        },
      });

      // Nếu có Token (Lưu thẻ), lưu vào DB
      const vnpToken = params['vnp_Token'];
      if (isSuccess && vnpToken) {
        const userId = await tx.order
          .findUnique({
            where: { order_code: orderCode },
            select: { user_id: true },
          })
          .then((o) => o?.user_id);

        if (userId) {
          await tx.userPaymentMethod.upsert({
            where: { token: vnpToken },
            update: {
              bank_code: params['vnp_BankCode'],
              card_type: params['vnp_CardType'],
            },
            create: {
              user_id: userId,
              provider: 'vnpay',
              token: vnpToken,
              bank_code: params['vnp_BankCode'],
              card_type: params['vnp_CardType'],
            },
          });
        }
      }

      await tx.order.update({
        where: { order_code: orderCode },
        data: {
          payment_status: isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED,
          // Thanh toán thành công → confirmed để tiếp tục xử lý
          // Thanh toán thất bại → payment_failed để user biết cần thanh toán lại
          status: isSuccess
            ? OrderStatus.CONFIRMED
            : OrderStatus.PAYMENT_FAILED,
        },
      });

      // Nếu success → giảm stock thực tế (không còn giữ hàng, đã bán hẳn)
      if (isSuccess) {
        const order = await tx.order.findUnique({
          where: { order_code: orderCode },
          include: { items: true },
        });

        if (order) {
          for (const item of order.items) {
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
                `Lỗi kho khi thanh toán: Sản phẩm ID ${item.variant_id} không đủ tồn kho vật lý`,
              );
            }
          }
        }
      }

      return {
        isSuccess,
        order_code: orderCode,
        amount: Number(params['vnp_Amount']) / 100,
      };
    });
  }

  /**
   * Hoàn tiền cho đơn hàng bị hủy sau khi đã thanh toán.
   *
   * Input:  paymentId, amount (số tiền cần hoàn)
   * Output: void
   *
   * Hiện tại chỉ cập nhật status trong DB.
   * TODO: Tích hợp VNPay Refund API để hoàn tiền thực tế.
   */
  async refund(paymentId: string, amount: number): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
    // TODO: gọi VNPay refund API với amount
    void amount; // tạm thời unused — sẽ dùng khi tích hợp API
  }

  async getSavedMethods(userId: string) {
    return this.prisma.userPaymentMethod.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async deleteSavedMethod(id: string, userId: string) {
    return this.prisma.userPaymentMethod.delete({
      where: { id, user_id: userId },
    });
  }

  private formatDate(date: Date): string {
    // VNPAY yêu cầu định dạng yyyyMMddHHmmss theo múi giờ Việt Nam (GMT+7)
    // toISOString() trả về giờ UTC (GMT+0), ta cần cộng thêm 7 tiếng.
    const vnpTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return vnpTime
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
  }
}
