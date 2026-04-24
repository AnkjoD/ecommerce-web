import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@/common/enums';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get('tree')
  @ApiOkResponse({ description: 'Lấy cây danh mục sản phẩm (phân cấp)' })
  findTree() {
    return this.categoriesService.findTree();
  }

  @Public()
  @Get()
  @ApiOkResponse({ description: 'Lấy danh sách phẳng tất cả danh mục' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ description: 'Lấy chi tiết danh mục kèm danh sách con' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy danh mục',
    type: ErrorResponseDto,
  })
  findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @ApiCreatedResponse({ description: 'Tạo danh mục mới thành công' })
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
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOkResponse({ description: 'Cập nhật danh mục thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy danh mục',
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoriesService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({
    description:
      'Xóa danh mục thành công (Nếu có con thì chỉ chuyển is_active=false)',
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy danh mục',
    type: ErrorResponseDto,
  })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
