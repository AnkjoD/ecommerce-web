import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123!', description: 'Mật khẩu hiện tại' })
  @IsString()
  current_password: string;

  @ApiProperty({
    example: 'NewPass456!',
    description: 'Mật khẩu mới (tối thiểu 8 ký tự, có hoa, thường và số)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu mới phải có chữ hoa, chữ thường và số',
  })
  new_password: string;
}
