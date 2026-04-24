// src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên đầy đủ' })
  @IsString()
  @MinLength(2)
  full_name: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email dùng để đăng nhập',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: '0901234567',
    description: 'Số điện thoại Việt Nam hợp lệ',
  })
  @IsOptional()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description:
      'Mật khẩu tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải có chữ hoa, chữ thường và số',
  })
  password: string;
}
