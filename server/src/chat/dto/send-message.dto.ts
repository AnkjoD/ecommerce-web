import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Tôi muốn tìm điện thoại tầm 10 triệu' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;
}
