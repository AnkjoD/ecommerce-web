import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, OrderStatus } from '@/common/enums';

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly returnUrl: string;
  private readonly notifyUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE') ?? '';
    this.accessKey = this.configService.get<string>('MOMO_ACCESS_KEY') ?? '';
    this.secretKey = this.configService.get<string>('MOMO_SECRET_KEY') ?? '';
    this.endpoint = this.configService.get<string>('MOMO_ENDPOINT') ?? '';
    this.returnUrl = this.configService.get<string>('MOMO_RETURN_URL') ?? '';
    this.notifyUrl = this.configService.get<string>('MOMO_NOTIFY_URL') ?? '';
  }

  async createPaymentUrl(orderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    
    if (!order) {
      throw new BadRequestException('Đơn hàng không tồn tại');
    }

    const amount = order.total.toString();
    const orderCode = order.order_code;
    const orderInfo = `Thanh toán đơn hàng ${orderCode}`;
    const requestId = orderCode + '-' + Date.now();
    const extraData = '';
    const requestType = 'captureWallet';

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.notifyUrl}&orderId=${orderCode}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId: requestId,
      amount: amount,
      orderId: orderCode,
      orderInfo: orderInfo,
      redirectUrl: this.returnUrl,
      ipnUrl: this.notifyUrl,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      lang: 'vi'
    };

    try {
      const response = await axios.post(this.endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { payUrl, resultCode, message } = response.data;
      
      if (resultCode !== 0) {
        this.logger.error(`MoMo Create URL Error: ${message}`, response.data);
        throw new BadRequestException(`Lỗi tạo thanh toán MoMo: ${message}`);
      }

      await this.prisma.payment.create({
        data: {
          order_id: orderId,
          provider: 'momo',
          provider_order_id: orderCode,
          amount: order.total,
          status: PaymentStatus.UNPAID,
        },
      });

      return payUrl;
    } catch (error: any) {
      this.logger.error(`Giao dịch thất bại: ${error.message}`);
      throw new BadRequestException('Không thể kết nối thanh toán MoMo');
    }
  }

  async handleCallback(data: any): Promise<any> {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = data;

    // Validate signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new BadRequestException('Chữ ký không hợp lệ');
    }

    const isSuccess = resultCode === 0;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { provider_order_id: orderId },
      });

      if (!payment) {
        throw new BadRequestException('Không tìm thấy giao dịch');
      }
      
      // Idempotency: Ignore if payment is already processed
      if (payment.status !== PaymentStatus.UNPAID) {
         return payment;
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED,
          transaction_id: transId?.toString() || null,
          raw_response: data,
          paid_at: isSuccess ? new Date() : null,
        },
      });

      await tx.order.update({
        where: { order_code: orderId },
        data: {
          payment_status: isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED,
          status: isSuccess ? OrderStatus.CONFIRMED : OrderStatus.PAYMENT_FAILED,
        },
      });

      if (isSuccess) {
        const orderInfo = await tx.order.findUnique({
          where: { order_code: orderId },
          include: { items: true },
        });

        if (orderInfo) {
          for (const item of orderInfo.items) {
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
                `Lỗi kho khi xử lý giao dịch: Sản phẩm ID ${item.variant_id} không đủ tồn kho`,
              );
            }
          }
        }
      }

      return updatedPayment;
    });
  }
}
