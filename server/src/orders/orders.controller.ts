import {
  Controller,
  Get,
  Post,
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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetCurrentUserId } from '@/common/decorators';
import { AtGuard } from '@/auth/guards/at.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role, OrderStatus, PaymentStatus } from '@/common/enums';
import { IsEnum } from 'class-validator';

// ─── DTOs cho admin update ────────────────────────────────────────────────────
class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * OrdersController — Quản lý đơn hàng.
 *
 * Base URL: /api/orders
 *
 * Tất cả route đều yêu cầu đăng nhập (AtGuard áp dụng cho toàn controller).
 * Một số route chỉ dành cho Admin (thêm @Roles(Role.ADMIN) + RolesGuard).
 */
@UseGuards(AtGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── User endpoints ──────────────────────────────────────────────────────────

  /**
   * POST /api/orders
   * Tạo đơn hàng từ giỏ hàng hiện tại.
   *
   * Input  (Body): CreateOrderDto { address_id, payment_method, coupon_code? }
   * Output: Order object mới tạo (include items)
   * Auth:   ✅ Cần đăng nhập
   *
   * Sau khi tạo đơn thành công với payment_method = 'vnpay' hoặc 'momo',
   * frontend cần gọi thêm POST /api/payments/vnpay/create/:orderId để lấy link thanh toán.
   * Với COD: đơn tạo xong là xong, không cần bước thanh toán online.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createFromCart(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createFromCart(userId, dto);
  }

  /**
   * GET /api/orders?page=1&limit=10
   * Lấy danh sách đơn hàng của user đang đăng nhập (có phân trang).
   *
   * Query params:
   *   page  (number, default 1)  — trang hiện tại
   *   limit (number, default 10) — số đơn mỗi trang
   *
   * Output: { data: Order[], total, page, limit, total_pages }
   * Auth:   ✅ Cần đăng nhập
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  findMyOrders(
    @GetCurrentUserId() userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findByUser(userId, page, limit, status);
  }

  /**
   * GET /api/orders/:id
   * Lấy chi tiết 1 đơn hàng.
   *
   * Params: id — UUID của đơn hàng
   * Output: Order đầy đủ { items, payment, address }
   * Auth:   ✅ Cần đăng nhập (chỉ được xem đơn của mình)
   * Lỗi:   403 nếu đơn của người khác, 404 nếu không tìm thấy
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.ordersService.findById(id, userId);
  }

  /**
   * POST /api/orders/:id/cancel
   * User tự hủy đơn của mình.
   *
   * Params: id — UUID đơn hàng
   * Output: 204 No Content
   * Auth:   ✅ Cần đăng nhập (chỉ được hủy đơn của mình)
   * Lỗi:   400 nếu đơn không thể hủy (đã shipped hoặc delivered)
   *
   * Chỉ cho phép hủy khi status là PENDING hoặc CONFIRMED.
   * Nếu đã thanh toán → sẽ tự động refund.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelOrder(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.ordersService.cancel(id, userId);
  }

  // ─── Admin endpoints ─────────────────────────────────────────────────────────

  /**
   * GET /api/orders/admin/all?page=1&limit=20
   * [ADMIN] Lấy TẤT CẢ đơn hàng trong hệ thống.
   *
   * Query params:
   *   page  (number, default 1)
   *   limit (number, default 20)
   *
   * Output: { data: Order[], total, page, limit, total_pages }
   *         Mỗi Order có thêm { user: { id, full_name, email } }
   * Auth:   ✅ Cần đăng nhập + ✅ Phải là ADMIN
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  adminListOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.ordersService.adminList(page, limit, userId, status, search);
  }

  /**
   * PATCH /api/orders/admin/:id/status
   * [ADMIN] Cập nhật trạng thái đơn hàng.
   *
   * Params: id — UUID đơn hàng
   * Body:   { status: OrderStatus }
   * Output: Order đã cập nhật
   * Auth:   ✅ Cần đăng nhập + ✅ Phải là ADMIN
   *
   * Luồng trạng thái hợp lệ:
   * pending → confirmed → processing → shipping → delivered
   *                                             → cancelled (nếu có vấn đề)
   * Khi chuyển sang DELIVERED với COD:
   *   → payment_status tự động = PAID
   *   → stock_quantity thực sự giảm
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id/status')
  @HttpCode(HttpStatus.OK)
  adminUpdateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.adminUpdateStatus(id, dto.status);
  }

  /**
   * PATCH /api/orders/admin/:id/payment-status
   * [ADMIN] Cập nhật trạng thái thanh toán.
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id/payment-status')
  @HttpCode(HttpStatus.OK)
  adminUpdatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.adminUpdatePaymentStatus(id, dto.status);
  }
}
