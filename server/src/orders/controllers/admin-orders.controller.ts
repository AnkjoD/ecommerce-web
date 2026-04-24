import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { OrdersService } from '../orders.service';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import { AtGuard } from '@/auth/guards/at.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role, OrderStatus, PaymentStatus } from '@/common/enums';
import { IsEnum } from 'class-validator';

class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.SHIPPING })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PAID })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

@ApiTags('Admin - Orders')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * GET /api/admin/orders
   * [ADMIN] Lấy TẤT CẢ đơn hàng.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Lấy toàn bộ danh sách đơn hàng (Admin)' })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền Admin',
    type: ErrorResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.ordersService.adminList(page, limit);
  }

  /**
   * PATCH /api/admin/orders/:id/status
   * [ADMIN] Cập nhật trạng thái đơn hàng.
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Cập nhật trạng thái đơn hàng thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đơn hàng',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền Admin',
    type: ErrorResponseDto,
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.adminUpdateStatus(id, dto.status);
  }

  /**
   * PATCH /api/admin/orders/:id/payment-status
   * [ADMIN] Cập nhật trạng thái thanh toán.
   */
  @Patch(':id/payment-status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Cập nhật trạng thái thanh toán thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đơn hàng',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền Admin',
    type: ErrorResponseDto,
  })
  updatePaymentStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.ordersService.adminUpdatePaymentStatus(id, dto.status);
  }
}
