import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { user_id: userId },
      orderBy: { is_default: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');
    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    // Nếu là địa chỉ đầu tiên của user thì ép làm mặc định
    const count = await this.prisma.address.count({
      where: { user_id: userId },
    });
    const isDefault = count === 0 ? true : dto.is_default || false;

    return this.prisma.$transaction(async (tx) => {
      // Nếu địa chỉ mới là mặc định, hủy mặc định các địa chỉ khác
      if (isDefault) {
        await tx.address.updateMany({
          where: { user_id: userId, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.address.create({
        data: {
          ...dto,
          user_id: userId,
          is_default: isDefault,
        },
      });
    });
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');

    return this.prisma.$transaction(async (tx) => {
      // Nếu cập nhật thành mặc định, hủy mặc định các địa chỉ khác
      if (dto.is_default) {
        await tx.address.updateMany({
          where: { user_id: userId, is_default: true, id: { not: id } },
          data: { is_default: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: dto,
      });
    });
  }

  async remove(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');

    if (address.is_default) {
      // Nếu xóa địa chỉ mặc định, thử đặt địa chỉ khác làm mặc định (nếu có)
      await this.prisma.$transaction(async (tx) => {
        await tx.address.delete({ where: { id } });
        const nextAddress = await tx.address.findFirst({
          where: { user_id: userId },
        });
        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { is_default: true },
          });
        }
      });
    } else {
      await this.prisma.address.delete({ where: { id } });
    }
  }

  async setDefault(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại');

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });

      return tx.address.update({
        where: { id },
        data: { is_default: true },
      });
    });
  }
}
