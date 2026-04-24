// src/orders/dto/create-order.dto.ts
import { IsUUID, IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'src/common/enums';

export class CreateOrderDto {
  @ApiProperty({
    example: 'uuid-của-địa-chỉ-giao-hàng',
    description: 'ID của địa chỉ nhận hàng (phải thuộc về user)',
  })
  @IsUUID()
  address_id: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.COD,
    description: 'Phương thức thanh toán',
  })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({
    example: 'SUMMER2024',
    description: 'Mã giảm giá (nếu có)',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Lưu thông tin thẻ (chỉ áp dụng cho VNPAY)',
  })
  @IsOptional()
  @IsBoolean()
  save_card?: boolean;
}
