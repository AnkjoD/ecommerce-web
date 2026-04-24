import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GhtkService {
  private readonly logger = new Logger(GhtkService.name);
  private readonly client: AxiosInstance;
  private readonly isMockMode: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiToken = this.configService.get<string>('GHTK_API_TOKEN');
    const forceMock =
      this.configService.get<string>('GHTK_FORCE_MOCK') === 'true';

    this.isMockMode = !apiToken || forceMock;

    if (this.isMockMode) {
      this.logger.warn(
        '⚠️ GHTK is running in MOCK MODE. No real API calls will be made.',
      );
    }

    const baseUrl =
      this.configService.get<string>('GHTK_BASE_URL') ||
      'https://services.giaohangtietkiem.vn';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Token: apiToken,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Tính phí vận chuyển
   * @param data { province, district, ward, address, weight, value }
   */
  async calculateFee(data: {
    province: string;
    district: string;
    ward?: string;
    address?: string;
    weight: number; // gram
    value?: number; // VNĐ
  }) {
    if (this.isMockMode) {
      // Giả lập phí: > 500k free, < 500k là 30k
      const fee = (data.value || 0) >= 500000 ? 0 : 30000;
      return { success: true, fee, insurance_fee: 0 };
    }

    try {
      // Thông tin kho hàng (Pick address) - lấy từ .env hoặc config
      const pickProvince = this.configService.get<string>('GHTK_PICK_PROVINCE');
      const pickDistrict = this.configService.get<string>('GHTK_PICK_DISTRICT');

      if (!pickProvince || !pickDistrict) {
        this.logger.warn(
          'GHTK pick address not configured. Using default 30k fee.',
        );
        return { success: false, fee: 30000 };
      }

      const response = await this.client.get('/services/shipment/fee', {
        params: {
          pick_province: pickProvince,
          pick_district: pickDistrict,
          province: data.province,
          district: data.district,
          ward: data.ward,
          address: data.address,
          weight: data.weight,
          value: data.value,
        },
      });

      if (response.data.success) {
        return {
          success: true,
          fee: response.data.fee.fee,
          insurance_fee: response.data.fee.insurance_fee,
        };
      }

      this.logger.error(`GHTK Fee Error: ${response.data.message}`);
      return { success: false, message: response.data.message, fee: 30000 };
    } catch (error) {
      this.logger.error('Failed to calculate GHTK fee', error.stack);
      return { success: false, fee: 30000 };
    }
  }

  /**
   * Đăng đơn hàng sang GHTK
   */
  async createOrder(data: any) {
    if (this.isMockMode) {
      this.logger.log(
        `[MOCK] Creating GHTK order for partner_id: ${data.order.id}`,
      );
      return {
        success: true,
        order: {
          label: `GHTK.MOCK.${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          area: '1',
          fee: 30000,
          insurance_fee: 0,
          estimated_deliver_time: 'Ngày mai',
          status_id: 1,
        },
      };
    }

    try {
      const response = await this.client.post('/services/shipment/order', data);
      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to create GHTK order',
        error.response?.data || error.message,
      );
      return { success: false, message: error.message };
    }
  }

  /**
   * Hủy đơn hàng GHTK
   */
  async cancelOrder(trackingLabel: string) {
    if (this.isMockMode && trackingLabel.startsWith('GHTK.MOCK.')) {
      return { success: true, message: 'Đã hủy đơn hàng giả lập thành công' };
    }

    try {
      const response = await this.client.post(
        `/services/shipment/cancel/${trackingLabel}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to cancel GHTK order', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Kiểm tra trạng thái đơn hàng
   */
  async getStatus(trackingLabel: string) {
    if (this.isMockMode && trackingLabel.startsWith('GHTK.MOCK.')) {
      return {
        success: true,
        order: {
          label: trackingLabel,
          status: 4,
          status_text: 'Đang giao hàng (Giả lập)',
        },
      };
    }

    try {
      const response = await this.client.get(
        `/services/shipment/v2/${trackingLabel}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get GHTK status', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Listener: Tự động đẩy đơn COD sang GHTK
   */
  @OnEvent('order.created')
  async handleOrderCreated(order: any) {
    this.logger.log(`Auto-pushing order ${order.order_code} to GHTK...`);

    try {
      const fullOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: { include: { variant: true } },
          address: true,
        },
      });

      if (!fullOrder) return;

      const ghtkData = {
        products: fullOrder.items.map((item) => ({
          name: item.product_name,
          weight: item.variant.weight || 0.5,
          quantity: item.quantity,
          price: Number(item.unit_price),
        })),
        order: {
          id: fullOrder.id, // Sử dụng Order UUID trong DB làm Partner ID
          pick_name: this.configService.get('GHTK_PICK_NAME') || 'Shop Admin',
          pick_address:
            this.configService.get('GHTK_PICK_ADDRESS') || '123 Cầu Giấy',
          pick_province:
            this.configService.get('GHTK_PICK_PROVINCE') || 'Hà Nội',
          pick_district:
            this.configService.get('GHTK_PICK_DISTRICT') || 'Quận Cầu Giấy',
          pick_tel: this.configService.get('GHTK_PICK_TEL') || '0987654321',

          name: fullOrder.address.recipient_name,
          address: fullOrder.address.street,
          province: fullOrder.address.province,
          district: fullOrder.address.district,
          ward: fullOrder.address.ward,
          tel: fullOrder.address.phone,

          is_freeship: Number(fullOrder.shipping_fee) === 0 ? '1' : '0',
          pick_money:
            fullOrder.payment_method === 'cod' ? Number(fullOrder.total) : 0,
          value: Number(fullOrder.subtotal),
        },
      };

      const result = await this.createOrder(ghtkData);

      if (result.success) {
        this.logger.log(
          `GHTK Order created successfully: ${result.order.label}`,
        );
        await this.prisma.order.update({
          where: { id: fullOrder.id },
          data: { ghtk_label: result.order.label },
        });
      } else {
        this.logger.error(`GHTK Push Failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error('Error in handleOrderCreated', error.stack);
    }
  }
}
