// coupons/coupons.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponsService } from './coupons.service';
import { AtGuard } from '../auth/guards/at.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@/common/enums';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

@ApiTags('Coupons')
@Controller('coupons')
@ApiBearerAuth('access-token')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post('validate')
  @ApiOkResponse({ description: 'Kiểm tra mã giảm giá hợp lệ' })
  @ApiBadRequestResponse({
    description: 'Mã không tồn tại hoặc đã hết hạn/hết lượt dùng',
    type: ErrorResponseDto,
  })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }

  @Get('active')
  @ApiOkResponse({ description: 'Lấy danh sách mã giảm giá đang hoạt động (Public)' })
  findActive() {
    return this.couponsService.findActive();
  }

  @Roles(Role.ADMIN)
  @UseGuards(AtGuard, RolesGuard)
  @Get()
  @ApiOkResponse({ description: 'Lấy danh sách mã giảm giá (Admin)' })
  @ApiForbiddenResponse({
    description: 'Không có quyền Admin',
    type: ErrorResponseDto,
  })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.couponsService.findAll(+page, +limit);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AtGuard, RolesGuard)
  @Post()
  @ApiCreatedResponse({ description: 'Tạo mã giảm giá mới' })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ',
    type: ValidationErrorResponseDto,
  })
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AtGuard, RolesGuard)
  @Patch(':id')
  @ApiOkResponse({ description: 'Cập nhật mã giảm giá thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy mã',
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.couponsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.couponsService.deactivate(id);
  }
}
