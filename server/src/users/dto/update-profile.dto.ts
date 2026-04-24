import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Nguyễn Văn B',
    description: 'Họ và tên mới',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  full_name?: string;

  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại VN mới',
  })
  @IsOptional()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;
}
