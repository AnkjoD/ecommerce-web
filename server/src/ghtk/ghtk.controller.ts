import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { GhtkService } from './ghtk.service';
import { OrdersService } from '../orders/orders.service';

@Controller('ghtk')
export class GhtkController {
  private readonly logger = new Logger(GhtkController.name);

  constructor(
    private readonly ghtkService: GhtkService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() data: any, @Query('hash') hash: string) {
    this.logger.log(
      `Received GHTK Webhook for order ${data.partner_id}, label: ${data.label_id}, status: ${data.status_id}`,
    );

    // GHTK Status mapping (simplified):
    // 5: Đã giao hàng / Chưa đối soát
    // 6: Đã đối soát (Giao hàng thành công hoàn toàn)
    // -1: Hủy đơn hàng
    // 21: Đã trả hàng

    const partnerId = data.partner_id; // Đây là Order Id của mình
    const labelId = data.label_id;
    const statusId = Number(data.status_id);

    try {
      if (statusId === 5 || statusId === 6) {
        // Giao hàng thành công -> Trừ kho thực tế (Commit inventory)
        this.logger.log(
          `Order ${partnerId} delivered. Triggering inventory commitment.`,
        );
        await this.ordersService.handleGhtkSuccess(partnerId, labelId, data);
      } else if (statusId === -1 || statusId === 21) {
        // Hủy hoặc trả hàng -> Hoàn kho (Release reserved stock)
        this.logger.log(
          `Order ${partnerId} cancelled or returned. Releasing inventory.`,
        );
        await this.ordersService.handleGhtkFailure(partnerId, labelId, data);
      } else {
        // Các trạng thái khác -> Cập nhật log hoặc trạng thái hiển thị
        await this.ordersService.updateGhtkStatus(partnerId, labelId, data);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing GHTK webhook for order ${partnerId}`,
        error.stack,
      );
      // Vẫn trả về 200 để GHTK không gửi lại liên tục nếu đây là lỗi logic bên mình
      return { success: false, message: error.message };
    }
  }
}
