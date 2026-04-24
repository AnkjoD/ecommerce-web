import {
  Controller,
  Get,
  Post,
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
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from '../orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { GetCurrentUserId } from '@/common/decorators';
import { AtGuard } from '@/auth/guards/at.guard';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Tạo đơn hàng từ giỏ hàng thành công' })
  @ApiBadRequestResponse({
    description: 'Giỏ hàng trống hoặc hết hàng',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  createFromCart(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createFromCart(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Lấy lịch sử mua hàng cá nhân thành công' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findMyOrders(
    @GetCurrentUserId() userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.ordersService.findByUser(userId, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Lấy chi tiết đơn hàng thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đơn hàng',
    type: ErrorResponseDto,
  })
  findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.ordersService.findById(id, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Hủy đơn hàng thành công (No Content)' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đơn hàng',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Đơn hàng không thể hủy ở trạng thái hiện tại',
    type: ErrorResponseDto,
  })
  cancelOrder(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.ordersService.cancel(id, userId);
  }
}
