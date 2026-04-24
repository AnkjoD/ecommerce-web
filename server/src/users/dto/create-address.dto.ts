import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  recipient_name: string;

  @ApiProperty({ example: '0901234567' })
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Quận 1' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  @IsString()
  ward: string;

  @ApiProperty({ example: '123 Lê Lợi' })
  @IsString()
  street: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
