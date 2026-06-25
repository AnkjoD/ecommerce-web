import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CouponsService } from '../coupons.service';
import { ValidateCouponDto } from '../dto/validate-coupon.dto';
import { AtGuard } from '@/auth/guards/at.guard';

@ApiTags('Coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  // Public — không cần đăng nhập
  @Get('active')
  @ApiOkResponse({ description: 'Lấy danh sách mã giảm giá đang hoạt động' })
  findActive() {
    return this.couponsService.findActive();
  }

  @UseGuards(AtGuard)
  @Post('validate')
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }
}
