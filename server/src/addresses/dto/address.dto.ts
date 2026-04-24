import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Matches,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người nhận' })
  @IsString()
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  recipient_name: string;

  @ApiProperty({
    example: '0912345678',
    description: 'Số điện thoại người nhận',
  })
  @IsString()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @ApiProperty({
    example: 'Thành phố Hồ Chí Minh',
    description: 'Tỉnh/Thành phố',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  province: string;

  @ApiProperty({ example: 'Quận 1', description: 'Quận/Huyện' })
  @IsString()
  @IsNotEmpty({ message: 'Quận/Huyện không được để trống' })
  district: string;

  @ApiProperty({ example: 'Phường Bến Nghé', description: 'Phường/Xã' })
  @IsString()
  @IsNotEmpty({ message: 'Phường/Xã không được để trống' })
  ward: string;

  @ApiProperty({ example: '123 Đường ABC', description: 'Số nhà, tên đường' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ cụ thể không được để trống' })
  street: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Đặt làm địa chỉ mặc định',
  })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsOptional()
  recipient_name?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsString()
  @IsOptional()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Thành phố Hồ Chí Minh' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ example: 'Quận 1' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ example: '123 Đường ABC' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}
