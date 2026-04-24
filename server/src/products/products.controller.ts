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
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AtGuard } from '../auth/guards/at.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@/common/enums';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

/**
 * ProductsController — Quản lý sản phẩm.
 *
 * Base URL: /api/products
 *
 * Kiến trúc sản phẩm:
 * - Metadata (name, description, ảnh, brand, category...) → MongoDB (chưa implement)
 * - Variants (SKU, giá, màu, size, tồn kho) → PostgreSQL qua Prisma
 *
 * Hiện tại API này trả về ProductVariant từ Prisma.
 * Sau khi tích hợp MongoDB, sẽ join thêm data từ MongoDB để có full product info.
 */
@UseGuards(AtGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────────

  /**
   * GET /api/products?q=shirt&min_price=100000&max_price=500000&sort=price&order=asc&page=1&limit=20
   * Lấy danh sách sản phẩm/variant có filter và phân trang.
   *
   * Query params (tất cả optional):
   *   q         (string) — tìm theo SKU
   *   category  (string) — tên danh mục (chưa hoạt động, cần MongoDB)
   *   brand     (string) — thương hiệu (chưa hoạt động, cần MongoDB)
   *   min_price (number) — giá tối thiểu
   *   max_price (number) — giá tối đa
   *   sort      ('price' | 'created_at') — cột sắp xếp, default: created_at
   *   order     ('asc' | 'desc') — chiều sắp xếp, default: desc
   *   page      (number, default 1)
   *   limit     (number, default 20, max 100)
   *
   * Output: { data: ProductVariant[], total, page, limit, total_pages }
   * Auth:   ❌ Public
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Lấy danh sách sản phẩm thành công (Phân trang & Filter)',
  })
  findAll(@Query() filter: ProductFilterDto) {
    return this.productsService.findAll(filter);
  }

  /**
   * GET /api/products/:id
   * Lấy chi tiết một ProductVariant theo UUID.
   *
   * Params: id — UUID của variant
   * Output: ProductVariant object { id, product_id, sku, color, size, price, stock_quantity, ... }
   * Auth:   ❌ Public
   * Lỗi:   404 nếu không tồn tại
   */
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Lấy chi tiết variant sản phẩm thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy sản phẩm',
    type: ErrorResponseDto,
  })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  /**
   * GET /api/products/by-product/:productId
   * Lấy tất cả variant của một sản phẩm (theo MongoDB product_id).
   *
   * Params: productId — MongoDB ObjectId string của sản phẩm
   * Output: ProductVariant[] (tất cả màu/size của sản phẩm)
   * Auth:   ❌ Public
   *
   * Dùng cho trang chi tiết sản phẩm — frontend lấy productId từ MongoDB,
   * sau đó gọi API này để render bộ chọn màu/size và giá.
   */
  @Public()
  @Get(':productId/variants')
  @HttpCode(HttpStatus.OK)
  findVariantsByProduct(@Param('productId') productId: string) {
    return this.productsService.findVariantsByProduct(productId);
  }

  /**
   * GET /api/products/meta/unique-tags
   * Lấy danh sách tất cả các tag độc nhất đã tồn tại.
   * Dùng để gợi ý (autocomplete) trong Admin Dashboard.
   */
  @Public()
  @Get('meta/unique-tags')
  @HttpCode(HttpStatus.OK)
  getUniqueTags() {
    return this.productsService.getUniqueTags();
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────────

  /**
   * POST /api/products
   * [ADMIN] Tạo sản phẩm mới cùng với các variant.
   *
   * Body: CreateProductDto
   *   {
   *     name: "iPhone 15 Pro Max",
   *     slug: "iphone-15-pro-max",
   *     category_path: ["Điện tử", "Điện thoại"],
   *     brand: "Apple",
   *     description: { short: "...", full: "...", html?: "..." },
   *     attributes?: { ram: "8GB", storage: "256GB" },
   *     tags?: ["flagship", "ios"],
   *     media?: { images: ["url"], thumbnail: "url" },
   *     seo?: { title: "...", meta_desc: "..." },
   *     variants: [
   *       { sku: "IP15PM-BLK-256", color: "Đen", size: null, price: 33990000, stock_quantity: 50 },
   *       { sku: "IP15PM-WHT-256", color: "Trắng", size: null, price: 33990000, stock_quantity: 30 }
   *     ]
   *   }
   *
   * Output: ProductVariant[] (các variant vừa tạo)
   * Auth:   ✅ Bearer + Role: admin
   * Lỗi:   409 nếu SKU đã tồn tại
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Tạo sản phẩm và các variant thành công' })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền Admin',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /**
   * PATCH /api/products/:id
   * [ADMIN] Cập nhật một ProductVariant.
   *
   * Params: id — UUID của variant cần update
   * Body:   UpdateProductDto (Partial của CreateProductDto, có thêm status?)
   *         Để cập nhật variant: truyền variants[0] với các field cần thay đổi.
   *
   * Output: ProductVariant đã cập nhật
   * Auth:   ✅ Bearer + Role: admin
   * Lỗi:   404 nếu không tồn tại, 409 nếu SKU mới bị trùng
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Cập nhật sản phẩm thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy variant',
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  /**
   * DELETE /api/products/:id
   * [ADMIN] Xóa một ProductVariant.
   *
   * Params: id — UUID của variant
   * Output: 204 No Content
   * Auth:   ✅ Bearer + Role: admin
   * Lỗi:   404 nếu không tồn tại
   *         400/500 nếu variant đang được dùng trong OrderItem (foreign key)
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Xóa sản phẩm thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy variant',
    type: ErrorResponseDto,
  })
  delete(@Param('id') id: string) {
    return this.productsService.deleteVariant(id);
  }

  // ─── Commented: AI Features (chưa implement) ─────────────────────────────────

  // /**
  //  * GET /api/products/:id/recommendations
  //  * Gợi ý sản phẩm tương tự (dùng Vector Search từ AI module).
  //  *
  //  * TODO: Uncomment khi VectorSearchService đã được implement.
  //  */
  // @Public()
  // @Get(':id/recommendations')
  // getRecommendations(@Param('id') id: string, @GetCurrentUserId() userId?: string) {
  //   return this.productsService.getRecommendations(id, userId);
  // }

  // /**
  //  * POST /api/products/:id/sync-embedding
  //  * [ADMIN] Đồng bộ embedding vector của sản phẩm lên vector DB.
  //  *
  //  * TODO: Uncomment khi AI module + vector DB đã được setup.
  //  */
  // @UseGuards(RolesGuard)
  // @Roles(Role.ADMIN)
  // @Post(':id/sync-embedding')
  // syncEmbedding(@Param('id') id: string) {
  //   return this.productsService.syncEmbedding({ productId: id });
  // }
}
