import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from '../payments.service';
import { MomoService } from '../momo.service';
import { Public } from '../../auth/decorators/public.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { GetCurrentUser } from '@/common/decorators';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private momoService: MomoService,
  ) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AtGuard)
  @Post('vnpay/create/:orderId')
  @ApiOkResponse({
    description: 'Tạo URL thanh toán VNPay thành công (trả về chuỗi URL)',
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đơn hàng',
    type: ErrorResponseDto,
  })
  createPaymentUrl(
    @Param('orderId') orderId: string,
    @GetCurrentUser('sub') userId: string,
    @Query('saveCard') saveCard: string,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    return this.paymentsService.createPaymentUrl(
      orderId,
      ip,
      userId,
      saveCard === 'true',
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AtGuard)
  @Get('methods')
  @ApiOkResponse({ description: 'Lấy danh sách thẻ đã lưu' })
  getSavedMethods(@GetCurrentUser('sub') userId: string) {
    return this.paymentsService.getSavedMethods(userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AtGuard)
  @Delete('methods/:id')
  @ApiOkResponse({ description: 'Xóa thẻ đã lưu' })
  deleteSavedMethod(
    @Param('id') id: string,
    @GetCurrentUser('sub') userId: string,
  ) {
    return this.paymentsService.deleteSavedMethod(id, userId);
  }

  @Public()
  @Get('vnpay/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Xử lý phản hồi từ VNPay thành công' })
  @ApiQuery({
    name: 'vnp_ResponseCode',
    required: false,
    description: 'Mã phản hồi từ VNPAY',
  })
  handleCallback(@Query() params: Record<string, string>) {
    return this.paymentsService.handleCallback(params);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AtGuard)
  @Post('momo/create/:orderId')
  @ApiOkResponse({ description: 'Tạo URL thanh toán MoMo thành công' })
  createMomoPaymentUrl(@Param('orderId') orderId: string) {
    return this.momoService.createPaymentUrl(orderId);
  }

  @Public()
  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Xử lý IPN từ MoMo thành công' })
  handleMomoIpn(@Req() req: Request) {
    // MoMo sends data as application/json to notifyUrl
    return this.momoService.handleCallback(req.body);
  }
}
