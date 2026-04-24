import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { GetCurrentUserId } from '@/common/decorators';
import { AtGuard } from '../../auth/guards/at.guard';
import { CloudinaryService } from '@/cloudinary/cloudinary.service';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  @ApiOkResponse({ description: 'Lấy thông tin cá nhân thành công' })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  getProfile(@GetCurrentUserId() userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh định dạng jpg, png, webp (max 5MB)',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Upload ảnh đại diện thành công' })
  @ApiBadRequestResponse({
    description: 'File không hợp lệ',
    type: ErrorResponseDto,
  })
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: any,
  ) {
    return this.cloudinaryService.uploadFile(file, 'avatars');
  }

  @Patch('me')
  @ApiOkResponse({ description: 'Cập nhật profile thành công' })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ',
    type: ValidationErrorResponseDto,
  })
  updateProfile(
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/change-password')
  @HttpCode(204)
  @ApiOkResponse({ description: 'Đổi mật khẩu thành công (No Content)' })
  @ApiBadRequestResponse({
    description: 'Mật khẩu cũ không đúng hoặc mật khẩu mới không hợp lệ',
    type: ValidationErrorResponseDto,
  })
  changePassword(
    @GetCurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }
}
