import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    example: '65f1234567890abcdef12345',
    description: 'ID của sản phẩm (MongoDB ObjectID)',
  })
  @IsString()
  product_id: string;

  @ApiProperty({
    minimum: 1,
    maximum: 5,
    example: 5,
    description: 'Số sao đánh giá (1-5)',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    maxLength: 1000,
    example: 'Sản phẩm tuyệt vời, giao hàng nhanh!',
    description: 'Nội dung đánh giá',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
