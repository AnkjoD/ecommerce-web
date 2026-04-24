import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 0, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  quantity: number;
}
