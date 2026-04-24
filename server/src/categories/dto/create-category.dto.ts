import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Đồ gia dụng', description: 'Tên danh mục' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'do-gia-dung',
    description: 'Slug duy nhất cho URL (tự động tạo nếu để trống)',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-parent',
    description: 'ID của danh mục cha (nếu có)',
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.com/category.jpg',
    description: 'Ảnh đại diện danh mục',
  })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ example: 0, description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
