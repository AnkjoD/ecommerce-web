import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetCurrentUser } from '@/common/decorators';
import { AtGuard } from '../auth/guards/at.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@/common/enums';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiCreatedResponse({ description: 'Gửi đánh giá thành công' })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ hoặc đã đánh giá sản phẩm này',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  create(@GetCurrentUser('sub') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Lấy tất cả đánh giá' })
  findAll() {
    return this.reviewsService.findAll();
  }

  @Get('product/:productId')
  @ApiOkResponse({ description: 'Lấy đánh giá của một sản phẩm' })
  findByProduct(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rating') rating?: string,
  ) {
    return this.reviewsService.findByProduct(
      productId,
      page ? +page : 1,
      limit ? +limit : 10,
      rating ? +rating : undefined,
    );
  }

  @Patch(':id')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Cập nhật đánh giá thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đánh giá hoặc không có quyền',
    type: ErrorResponseDto,
  })
  update(
    @Param('id') id: string,
    @GetCurrentUser('sub') userId: string,
    @Body() dto: Partial<CreateReviewDto>,
  ) {
    return this.reviewsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(AtGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Xóa đánh giá thành công (No Content)' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đánh giá hoặc không có quyền',
    type: ErrorResponseDto,
  })
  remove(@Param('id') id: string, @GetCurrentUser('sub') userId: string) {
    return this.reviewsService.remove(id, userId);
  }

  // ─── Admin endpoints ─────────────────────────────────────────────────────────

  @Patch('admin/:id/verify')
  @Roles(Role.ADMIN)
  @UseGuards(AtGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Xác minh đánh giá thành công' })
  adminVerify(@Param('id') id: string) {
    return this.reviewsService.adminUpdate(id, { is_verified: true });
  }

  @Delete('admin/:id')
  @Roles(Role.ADMIN)
  @UseGuards(AtGuard, RolesGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Admin xóa đánh giá thành công' })
  adminRemove(@Param('id') id: string) {
    return this.reviewsService.adminRemove(id);
  }
}
