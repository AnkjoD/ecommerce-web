import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProductDescriptionDto {
  @ApiPropertyOptional({ example: 'Siêu phẩm iPhone 15 Pro Max' })
  @IsOptional()
  @IsString()
  short?: string;

  @ApiPropertyOptional({
    example: 'Mô tả chi tiết về hiệu năng, camera và thời lượng pin...',
  })
  @IsOptional()
  @IsString()
  full?: string;

  @ApiPropertyOptional({ example: '<p>Nội dung HTML chi tiết</p>' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ example: 'Mô tả sản phẩm' })
  @IsOptional()
  @IsString()
  text?: string;
}

class ProductMediaDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['https://cdn.com/ip15-1.jpg'],
  })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ example: 'https://youtube.com/v=...' })
  @IsOptional()
  @IsString()
  video_url?: string;

  @ApiPropertyOptional({ example: 'https://cdn.com/ip15-thumb.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ example: '📦' })
  @IsOptional()
  @IsString()
  icon?: string;
}

class ProductSeoDto {
  @ApiPropertyOptional({ example: 'iPhone 15 Pro Max - Giá tốt nhất' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Mua ngay iPhone 15 Pro Max chính hãng tại...',
  })
  @IsOptional()
  @IsString()
  meta_desc?: string;

  @ApiPropertyOptional({ type: [String], example: ['iphone', 'apple'] })
  @IsOptional()
  @IsArray()
  keywords?: string[];
}

export class CreateVariantDto {
  @ApiProperty({ example: 'IP15PM-BLK-256', description: 'Mã kho duy nhất' })
  @IsString()
  sku!: string;

  @ApiPropertyOptional({ example: 'Titan Đen' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '256GB' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ example: 34990000 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    example: 39990000,
    description: 'Giá bán gốc trước khi giảm',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price_before_discount?: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stock_quantity!: number;

  @ApiPropertyOptional({ example: { "Màu": "Đỏ", "Size": "XL" } })
  @IsOptional()
  @IsObject()
  options?: Record<string, string>;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 'https://cdn.com/ip15-black.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'iphone-15-pro-max',
    description: 'Slug duy nhất cho URL (tự động tạo nếu để trống)',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ type: [String], example: ['Điện tử', 'Điện thoại', 'Apple'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category_path?: string[];

  @ApiPropertyOptional({ example: 'category-id' })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({ example: 'Apple' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDescriptionDto)
  description?: ProductDescriptionDto;

  @ApiPropertyOptional({ example: { cpu: 'A17 Pro', ram: '8GB' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ type: [String], example: ['flagship', 'ios'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductMediaDto)
  media?: ProductMediaDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSeoDto)
  seo?: ProductSeoDto;
  
  @ApiPropertyOptional({ example: 'variant-id' })
  @IsOptional()
  @IsString()
  primary_variant_id?: string;

  @ApiPropertyOptional({ type: [String], example: ['Màu sắc', 'Dung lượng'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attribute_order?: string[];

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
