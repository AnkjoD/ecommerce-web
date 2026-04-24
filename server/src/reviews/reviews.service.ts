// reviews/reviews.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus, Prisma } from '@prisma/client';

interface RatingDistribution {
  rating: number;
  _count: { rating: number };
}

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findByProduct(
    productId: string,
    page = 1,
    limit = 10,
    rating?: number,
  ) {
    const where: Prisma.ReviewWhereInput = { product_id: productId };
    if (rating) where.rating = rating;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, full_name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const distribution = (await this.prisma.review.groupBy({
      by: ['rating'],
      where: { product_id: productId },
      _count: { rating: true },
    })) as unknown as RatingDistribution[];

    const dist: Record<number, number> = Object.fromEntries(
      [1, 2, 3, 4, 5].map((s) => [
        s,
        distribution.find((d) => d.rating === s)?._count.rating ?? 0,
      ]),
    );

    const avg =
      total > 0
        ? Math.round(
            (Object.entries(dist).reduce(
              (sum, [star, count]) => sum + Number(star) * Number(count),
              0,
            ) /
              total) *
              10,
          ) / 10
        : 0;

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      stats: { avg, distribution: dist },
    };
  }

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        user_id: userId,
        status: OrderStatus.delivered,
        items: {
          some: {
            variant: { product_id: dto.product_id },
          },
        },
      },
    });

    if (!order) {
      throw new BadRequestException(
        'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        user_id_product_id: { user_id: userId, product_id: dto.product_id },
      },
    });

    if (existing) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi');
    }

    const review = await this.prisma.review.create({
      data: {
        user_id: userId,
        product_id: dto.product_id,
        order_id: order.id,
        rating: dto.rating,
        comment: dto.comment,
        is_verified: true,
      },
      include: { user: { select: { id: true, full_name: true } } },
    });

    this.eventEmitter.emit('review.created', {
      productId: dto.product_id,
      rating: dto.rating,
    });

    return review;
  }

  async update(id: string, userId: string, dto: Partial<CreateReviewDto>) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    if (review.user_id !== userId) throw new ForbiddenException();

    const hoursSince = (Date.now() - review.created_at.getTime()) / 3_600_000;
    if (hoursSince > 24) {
      throw new BadRequestException('Chỉ có thể chỉnh sửa trong vòng 24 giờ');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating ?? review.rating,
        comment: dto.comment ?? review.comment,
      },
    });

    if (dto.rating && dto.rating !== review.rating) {
      this.eventEmitter.emit('review.updated', {
        productId: review.product_id,
      });
    }

    return updated;
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        include: {
          user: { select: { id: true, full_name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    if (review.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');
    }

    await this.prisma.review.delete({ where: { id } });
    this.eventEmitter.emit('review.deleted', {
      productId: review.product_id,
    });
  }

  async adminRemove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');

    await this.prisma.review.delete({ where: { id } });
    this.eventEmitter.emit('review.deleted', {
      productId: review.product_id,
    });
  }

  async adminUpdate(id: string, data: Partial<Prisma.ReviewUpdateInput>) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');

    const updated = await this.prisma.review.update({
      where: { id },
      data,
    });

    if (data.rating && data.rating !== review.rating) {
      this.eventEmitter.emit('review.updated', {
        productId: review.product_id,
      });
    }

    return updated;
  }
}
