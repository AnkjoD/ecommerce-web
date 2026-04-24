import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người nhận' })
  @IsString()
  recipient_name: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại nhận hàng',
  })
  @IsString()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/)
  phone: string;

  @ApiProperty({ example: 'Hà Nội', description: 'Tỉnh/Thành phố' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Cầu Giấy', description: 'Quận/Huyện' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Dịch Vọng', description: 'Phường/Xã' })
  @IsString()
  ward: string;

  @ApiProperty({
    example: 'Số 123, Đường ABC',
    description: 'Địa chỉ chi tiết',
  })
  @IsString()
  street: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Đặt làm địa chỉ mặc định',
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: 'desc' }, { id: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    // NOTE: In Option B, shipping address phones are NOT required to be unique system-wide.
    // This allows multiple users (e.g. family members) to share a delivery phone.

    // Nếu là default → bỏ default cũ
    if (dto.is_default) {
      await this.prisma.address.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });
    }

    // Nếu chưa có địa chỉ nào → tự set default
    const count = await this.prisma.address.count({
      where: { user_id: userId },
    });

    return this.prisma.address.create({
      data: {
        user_id: userId,
        ...dto,
        is_default: dto.is_default ?? count === 0,
      },
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateAddressDto>) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');

    if (dto.is_default) {
      await this.prisma.address.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });
    }

    return this.prisma.address.update({
      where: { id, user_id: userId },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');
    if (address.is_default) {
      throw new BadRequestException(
        'Không thể xóa địa chỉ mặc định. Hãy đặt địa chỉ khác làm mặc định trước',
      );
    }

    await this.prisma.address.delete({
      where: { id, user_id: userId },
    });
  }

  async setDefault(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');

    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      }),
      this.prisma.address.update({
        where: { id },
        data: { is_default: true },
      }),
    ]);

    return this.prisma.address.findUnique({ where: { id } });
  }
}
