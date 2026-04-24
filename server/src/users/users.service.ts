import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.phone) {
      // SECURITY: Check phone uniqueness across users
      const otherUser = await this.prisma.user.findFirst({
        where: { phone: dto.phone, id: { not: userId } },
      });
      if (otherUser) {
        throw new BadRequestException(
          'Số điện thoại này đã được đăng ký bởi một tài khoản khác',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const valid = await bcrypt.compare(
      dto.current_password,
      user.password_hash,
    );
    if (!valid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    if (dto.new_password.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải ít nhất 8 ký tự');
    }

    const hash = await bcrypt.hash(dto.new_password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: hash },
    });

    // Revoke tất cả refresh tokens sau khi đổi mật khẩu
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId },
      data: { is_revoked: true },
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAllUsers(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          role: true,
          is_active: true,
          created_at: true,
          _count: { select: { orders: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, total_pages: Math.ceil(total / limit) };
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    return this.prisma.user.update({
      where: { id },
      data: { is_active: !user.is_active },
      select: { id: true, is_active: true },
    });
  }
}
