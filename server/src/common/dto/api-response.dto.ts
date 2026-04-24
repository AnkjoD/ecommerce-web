import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Access Denied' })
  message: string;

  @ApiProperty({ example: '2024-04-03T15:20:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/auth/login' })
  path: string;
}

export class ValidationErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    example: 'Mật khẩu phải có chữ hoa, chữ thường và số',
    description: 'Thông báo lỗi chi tiết cho user',
  })
  message: string;

  @ApiProperty({ example: '2024-04-03T15:20:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/auth/register' })
  path: string;
}

export class InternalServerErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ example: 500 })
  declare statusCode: number;

  @ApiProperty({ example: 'Internal server error' })
  declare message: string;

  @ApiProperty({
    example: 'Cannot read properties of undefined...',
    description: 'Thông tin lỗi chi tiết (chỉ hiện trong môi trường Dev/Admin)',
    required: false,
  })
  debug?: string;
}
