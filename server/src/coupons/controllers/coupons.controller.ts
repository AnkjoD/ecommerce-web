import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CouponsService } from '../coupons.service';
import { ValidateCouponDto } from '../dto/validate-coupon.dto';
import { AtGuard } from '@/auth/guards/at.guard';

@ApiTags('Coupons')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post('validate')
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }
}
