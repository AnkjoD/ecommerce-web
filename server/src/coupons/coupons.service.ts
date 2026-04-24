// coupons/coupons.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async validate(dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: dto.code,
        is_active: true,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
    });

    if (!coupon)
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    if (coupon.used_count >= coupon.usage_limit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt dùng');
    }
    if (dto.order_total < Number(coupon.min_order_value)) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${Number(coupon.min_order_value ?? 0).toLocaleString('vi-VN')}đ để dùng mã này`,
      );
    }

    const discount =
      coupon.discount_type === 'percent'
        ? dto.order_total * (Number(coupon.discount_value) / 100)
        : Number(coupon.discount_value);

    return {
      valid: true,
      coupon_id: coupon.id,
      discount_amount: Math.min(discount, dto.order_total),
      coupon,
    };
  }

  async findActive() {
    return this.prisma.coupon.findMany({
      where: {
        is_active: true,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAll(page = 1, limit = 20) {

    const [data, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coupon.count(),
    ]);
    return { data, total, page, limit };
  }

  async create(dto: CreateCouponDto) {
    const exists = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new BadRequestException('Mã coupon đã tồn tại');

    return this.prisma.coupon.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCouponDto>) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon không tồn tại');
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
