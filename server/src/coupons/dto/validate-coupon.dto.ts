import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ example: 'SUMMER2024' })
  @IsString()
  code: string;

  @ApiProperty({ example: 1500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  order_total: number;
}
