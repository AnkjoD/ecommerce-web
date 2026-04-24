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
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from '../products.service';
import { CreateProductDto, CreateVariantDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '@/common/enums';
import { CloudinaryService } from '@/cloudinary/cloudinary.service';

@ApiTags('Admin - Products')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private productsService: ProductsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.cloudinaryService.uploadFile(file, 'products');
    return this.productsService.create(dto, result.secure_url);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/metadata')
  @HttpCode(HttpStatus.OK)
  updateMetadata(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateMetadata(id, dto);
  }

  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    // We use the variant structure from CreateProductDto
    return this.productsService.addVariant(id, dto as any);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
  
  @Delete('variants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteVariant(@Param('id') id: string) {
    return this.productsService.deleteVariant(id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  syncAll() {
    return this.productsService.syncAllProductsData();
  }
}
