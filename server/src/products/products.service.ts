import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { Prisma, ProductVariant } from '@prisma/client';
import { PaginatedResult } from '../orders/interfaces/order.interface';
import { slugify } from '@/common/utils/slug.util';

// ─── Kiểu trả về ─────────────────────────────────────────────────────────────

/**
 * Kiểu dữ liệu đầy đủ của một Variant bao gồm thông tin Product mẹ
 */
export type ProductVariantFull = Prisma.ProductVariantGetPayload<{
  include: {
    product: {
      include: {
        category: true;
        variants: true;
      };
    };
  };
}>;

/**
 * Interface cho sản phẩm kết hợp variants
 */
export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { variants: true };
}>;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── Tìm tất cả (có filter + phân trang) ─────────────────────────────────────

  async findAll(
    filter: ProductFilterDto,
  ): Promise<PaginatedResult<ProductWithVariants>> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: 'active',
      ...(filter.q
        ? {
            OR: [
              { name: { contains: filter.q, mode: 'insensitive' } },
              { brand: { contains: filter.q, mode: 'insensitive' } },
              {
                variants: {
                  some: { sku: { contains: filter.q, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
      ...(filter.brand ? { brand: { contains: filter.brand } } : {}),
      // Lọc theo đánh giá sao (Rating)
      ...(filter.rating_filter !== undefined
        ? { rating_avg: { gte: Number(filter.rating_filter) } }
        : {}),
      ...(filter.min_price !== undefined || filter.max_price !== undefined
        ? {
            variants: {
              some: {
                price: {
                  ...(filter.min_price !== undefined
                    ? { gte: Number(filter.min_price) }
                    : {}),
                  ...(filter.max_price !== undefined
                    ? { lte: Number(filter.max_price) }
                    : {}),
                },
                is_active: true,
              },
            },
          }
        : {}),
    };

    // 💎 ELITE FEATURE: Lọc danh mục đệ quy (Recursive Filtering)
    if (filter.category) {
      // Tìm danh mục gốc dựa trên slug
      const rootCategory = await this.prisma.category.findUnique({
        where: { slug: filter.category },
        select: { id: true },
      });

      if (rootCategory) {
        // Lấy tất cả danh mục con (đệ quy)
        const allCategoryIds = await this.getDescendantCategoryIds(
          rootCategory.id,
        );
        where.category_id = { in: [rootCategory.id, ...allCategoryIds] };
      } else {
        // Nếu không tìm thấy danh mục, trả về kết quả rỗng thay vì bỏ qua filter
        where.category_id = 'non-existent-id';
      }
    }

    const sortField = filter.sort || 'created_at';
    const sortOrder = filter.order || 'desc';

    let orderBy: Prisma.ProductOrderByWithRelationInput = {};

    switch (sortField) {
      case 'price':
        orderBy = { min_price: sortOrder as Prisma.SortOrder };
        break;
      case 'rating':
        orderBy = { rating_avg: sortOrder as Prisma.SortOrder };
        break;
      case 'sold_count':
        orderBy = { sold_count: sortOrder as Prisma.SortOrder };
        break;
      case 'view_count':
        orderBy = { view_count: sortOrder as Prisma.SortOrder };
        break;
      default:
        orderBy = { created_at: sortOrder as Prisma.SortOrder };
        break;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          variants: {
            where: { is_active: true },
            orderBy: { price: 'asc' },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((p) =>
        this.ensureDefaultImages(p),
      ) as ProductWithVariants[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  private ensureDefaultImages(product: any) {
    const defaultImg = 'https://placehold.co/600x400?text=Homura+Mall';
    if (product.media && typeof product.media === 'object') {
      if (!product.media['thumbnail']) {
        product.media['thumbnail'] = defaultImg;
      }
    }
    if (product.variants) {
      product.variants.forEach((v: any) => {
        if (!v.image_url) v.image_url = defaultImg;
      });
    }
    return product;
  }

  // ─── Tìm 1 variant theo ID ────────────────────────────────────────────────────

  async findById(id: string): Promise<ProductVariantFull> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: true,
            variants: { where: { is_active: true } },
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Sản phẩm với ID "${id}" không tồn tại`);
    }

    // Tăng lượt xem cho cả Variant và Product mẹ (không đồng bộ)
    this.prisma
      .$transaction([
        this.prisma.productVariant.update({
          where: { id },
          data: { view_count: { increment: 1 } },
        }),
        this.prisma.product.update({
          where: { id: variant.product_id },
          data: { view_count: { increment: 1 } },
        }),
      ])
      .catch((err) => console.error('Lỗi khi tăng view_count:', err));

    if (variant.product) {
      this.ensureDefaultImages(variant.product);
      if (!variant.image_url)
        variant.image_url = 'https://placehold.co/600x400?text=Homura+Mall';
    }

    return variant as ProductVariantFull;
  }

  // ─── Tạo sản phẩm mới [ADMIN] ────────────────────────────────────────────────

  async create(
    dto: CreateProductDto,
    imageUrl?: string,
  ): Promise<ProductWithVariants> {
    if (dto.variants?.length) {
      const skus = dto.variants.map((v) => v.sku);
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: { in: skus } },
      });
      if (existing) {
        throw new ConflictException(`SKU "${existing.sku}" đã tồn tại`);
      }
    }

    const media = {
      ...(dto.media || {}),
      images: imageUrl
        ? [...(dto.media?.images || []), imageUrl]
        : dto.media?.images || [],
      thumbnail: imageUrl || dto.media?.thumbnail,
    };

    let minPrice = 0;
    let maxPrice = 0;
    if (dto.variants && dto.variants.length > 0) {
      const prices = dto.variants.map((v) => Number(v.price));
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug || slugify(dto.name),
        category_path: dto.category_path,
        brand: dto.brand,
        description: dto.description as unknown as Prisma.InputJsonValue,
        attributes: dto.attributes as unknown as Prisma.InputJsonValue,
        tags: dto.tags,
        media: media as unknown as Prisma.InputJsonValue,
        seo: dto.seo as unknown as Prisma.InputJsonValue,
        status: 'active',
        min_price: minPrice,
        max_price: maxPrice,
        primary_variant_id: dto.primary_variant_id,
        attribute_order: dto.attribute_order || [],
        variants: {
          create:
            dto.variants?.map((v) => ({
              sku: v.sku,
              color: v.color,
              size: v.size,
              price: v.price,
              price_before_discount: v.price_before_discount,
              stock_quantity: v.stock_quantity,
              weight: v.weight || 500,
              options: (v.options || {}) as any,
              image_url: v.image_url || imageUrl,
            })) || [],
        },
      },
      include: { variants: true },
    });

    return product as ProductWithVariants;
  }

  // ─── Cập nhật sản phẩm [ADMIN] ───────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto): Promise<ProductVariant> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!variant) {
      throw new NotFoundException(`Sản phẩm với ID "${id}" không tồn tại`);
    }

    const variantUpdate = dto.variants?.[0];

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.productVariant.update({
        where: { id },
        data: {
          ...(variantUpdate?.sku ? { sku: variantUpdate.sku } : {}),
          ...(variantUpdate?.price !== undefined
            ? { price: variantUpdate.price }
            : {}),
          ...(variantUpdate?.color !== undefined
            ? { color: variantUpdate.color }
            : {}),
          ...(variantUpdate?.size !== undefined
            ? { size: variantUpdate.size }
            : {}),
          ...(variantUpdate?.stock_quantity !== undefined
            ? { stock_quantity: variantUpdate.stock_quantity }
            : {}),
          ...(variantUpdate?.image_url !== undefined
            ? { image_url: variantUpdate.image_url }
            : {}),
          ...(variantUpdate?.weight !== undefined
            ? { weight: variantUpdate.weight }
            : {}),
          ...(variantUpdate?.price_before_discount !== undefined
            ? { price_before_discount: variantUpdate.price_before_discount }
            : {}),
          ...(variantUpdate?.options !== undefined
            ? { options: variantUpdate.options as any }
            : {}),
        },
      });

      // Also update name/slug if provided in the variant-centric update
      if (dto.name || dto.description || dto.brand || dto.category_id || dto.category_path || dto.media || dto.seo) {
        await tx.product.update({
          where: { id: variant.product_id },
          data: {
            ...(dto.name
              ? { name: dto.name, slug: dto.slug || slugify(dto.name) }
              : {}),
            ...(dto.description
              ? {
                  description:
                    dto.description as unknown as Prisma.InputJsonValue,
                }
              : {}),
            ...(dto.category_path ? { category_path: dto.category_path } : {}),
            ...(dto.category_id ? { category_id: dto.category_id } : {}),
            ...(dto.brand ? { brand: dto.brand } : {}),
            ...(dto.attributes
              ? { attributes: dto.attributes as unknown as Prisma.InputJsonValue }
              : {}),
            ...(dto.tags ? { tags: dto.tags } : {}),
            ...(dto.media
              ? { media: dto.media as unknown as Prisma.InputJsonValue }
              : {}),
            ...(dto.seo
              ? { seo: dto.seo as unknown as Prisma.InputJsonValue }
              : {}),
            ...(dto.status ? { status: dto.status } : {}),
          },
        });
      }

      return updatedVariant;
    });

    await this.syncProductStats(variant.product_id);

    return result;
  }

  async updateMetadata(id: string, dto: UpdateProductDto): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID "${id}" không tồn tại`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name, slug: dto.slug || slugify(dto.name) } : {}),
        ...(dto.description ? { description: dto.description as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.category_id ? { category_id: dto.category_id } : {}),
        ...(dto.category_path ? { category_path: dto.category_path } : {}),
        ...(dto.brand ? { brand: dto.brand } : {}),
        ...(dto.attributes ? { attributes: dto.attributes as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.tags ? { tags: dto.tags } : {}),
        ...(dto.media ? { media: dto.media as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.seo ? { seo: dto.seo as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.primary_variant_id ? { primary_variant_id: dto.primary_variant_id } : {}),
        ...(dto.attribute_order ? { attribute_order: dto.attribute_order } : {}),
      },
      include: { variants: true },
    });

    return updated;
  }

  // ─── Hàm bổ trợ: Đồng bộ thống kê (Min Price, Sold, View) ───────────────────

  private async syncProductStats(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { product_id: productId, is_active: true },
    });

    if (variants.length === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          min_price: 0,
          max_price: 0,
          sold_count: 0,
          view_count: 0,
        },
      });
      return;
    }

    const prices = variants.map((v) => Number(v.price));
    const soldCount = variants.reduce((acc, v) => acc + (v.sold_count || 0), 0);
    const viewCount = variants.reduce((acc, v) => acc + (v.view_count || 0), 0);

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        min_price: Math.min(...prices),
        max_price: Math.max(...prices),
        sold_count: soldCount,
        view_count: viewCount,
      },
    });
  }

  // ─── Script chạy một lần: Đồng bộ toàn bộ DB ─────────────────────────────────

  async syncAllProductsData() {
    const products = await this.prisma.product.findMany({
      select: { id: true },
    });
    for (const p of products) {
      await this.syncProductStats(p.id);
    }
    return { message: `Đồng bộ thành công ${products.length} sản phẩm.` };
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID "${id}" không tồn tại`);
    }

    await this.prisma.product.delete({ where: { id } });
  }

  // ─── Xóa biến thể [ADMIN] ───────────────────────────────────────────────────

  async deleteVariant(id: string): Promise<void> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException(`Biến thể với ID "${id}" không tồn tại`);
    }

    const productId = variant.product_id;
    await this.prisma.productVariant.delete({ where: { id } });
    await this.syncProductStats(productId);
  }

  // ─── Tìm biến thể theo Product ID ───────────────────────────────────────────

  async findVariantsByProduct(
    productId: string,
  ): Promise<ProductVariantFull[]> {
    const variants = await this.prisma.productVariant.findMany({
      where: { product_id: productId, is_active: true },
      include: { product: true },
    });
    return variants as ProductVariantFull[];
  }

  async addVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với ID "${productId}" không tồn tại`);
    }

    const existing = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku },
    });
    if (existing) {
      throw new ConflictException(`SKU "${dto.sku}" đã tồn tại`);
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        product_id: productId,
        sku: dto.sku,
        color: dto.color,
        size: dto.size,
        price: dto.price,
        price_before_discount: dto.price_before_discount,
        stock_quantity: dto.stock_quantity,
        weight: dto.weight || 500,
        options: (dto.options || {}) as any,
        image_url: dto.image_url,
      },
    });

    await this.syncProductStats(productId);
    return variant;
  }

  /**
   * 🛡️ Elite Optimization: Lấy toàn bộ ID của danh mục con đệ quy bằng Single-Query
   */
  private async getDescendantCategoryIds(parentId: string): Promise<string[]> {
    // 1. Chỉ lấy đúng 1 lần toàn bộ cây danh mục đang active
    const allCategories = await this.prisma.category.findMany({
      where: { is_active: true },
      select: { id: true, parent_id: true },
    });

    // 2. Thuật toán thu gom "Vết dầu loang" (Spread-out)
    const descendantIds: string[] = [];
    const stack: string[] = [parentId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      // Tìm các con trực tiếp của node hiện tại
      const children = allCategories.filter((c) => c.parent_id === currentId);

      children.forEach((child) => {
        descendantIds.push(child.id);
        stack.push(child.id);
      });
    }

    return descendantIds;
  }

  // ─── Lấy danh sách tags độc nhất [ADMIN] ────────────────────────────────────

  async getUniqueTags(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      select: { tags: true },
    });
    const allTags = products.flatMap((p) => p.tags || []);
    return Array.from(new Set(allTags)).sort();
  }
}
