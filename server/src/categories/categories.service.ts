// categories/categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { slugify } from '@/common/utils/slug.util';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // Trả về cây danh mục đầy đủ
  async findTree() {
    const all = await this.prisma.category.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    return this.buildTree(all, null);
  }

  // Flat list cho admin
  async findAll() {
    return this.prisma.category.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parent_id) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parent_id },
      });
      if (!parent) throw new NotFoundException('Danh mục cha không tồn tại');
    }

    const data = {
      ...dto,
      slug: dto.slug || slugify(dto.name),
    };

    return this.prisma.category.create({ data });
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    await this.findById(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');
    if (category._count.children > 0) {
      // Soft delete — tránh break children
      return this.prisma.category.update({
        where: { id },
        data: { is_active: false },
      });
    }
    return this.prisma.category.delete({ where: { id } });
  }

  private buildTree(items: any[], parentId: string | null): any[] {
    return items
      .filter((i) => i.parent_id === parentId)
      .map((i) => ({
        ...i,
        children: this.buildTree(items, i.id),
      }));
  }
}
