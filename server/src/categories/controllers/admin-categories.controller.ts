import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from '../categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '@/common/enums';
import { CloudinaryService } from '@/cloudinary/cloudinary.service';

@ApiTags('Admin - Categories')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Tạo danh mục mới thành công' })
  @ApiBadRequestResponse({
    description: 'Dữ hiệu không hợp lệ',
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

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh danh mục',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Upload ảnh danh mục lên Cloudinary thành công',
  })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.cloudinaryService.uploadFile(file, 'categories');
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Cập nhật danh mục thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy danh mục',
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Xóa danh mục thành công' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy danh mục',
    type: ErrorResponseDto,
  })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
