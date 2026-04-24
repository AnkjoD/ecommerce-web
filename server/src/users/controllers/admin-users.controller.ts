import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@/common/dto/api-response.dto';
import { UsersService } from '../users.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '@/common/enums';

@ApiTags('Admin - Users')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOkResponse({
    description: 'Lấy danh sách người dùng thành công (Phân trang)',
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền Admin',
    type: ErrorResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm theo tên hoặc email',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllUsers(+page, +limit, search);
  }

  @Patch(':id/toggle-active')
  @ApiOkResponse({ description: 'Thay đổi trạng thái tài khoản thành công' })
  @ApiNotFoundResponse({
    description: 'Người dùng không tồn tại',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền Admin',
    type: ErrorResponseDto,
  })
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }
}
