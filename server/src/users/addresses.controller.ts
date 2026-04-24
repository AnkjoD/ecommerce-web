import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AddressesService, CreateAddressDto } from './addresses.service';
import { AtGuard } from '@/auth/guards/at.guard';
import { GetCurrentUser } from '@/common/decorators';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  @Get()
  @ApiOkResponse({ description: 'Lấy tất cả địa chỉ của user' })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  findAll(@GetCurrentUser('sub') userId: string) {
    return this.addressesService.findAll(userId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Thành công' })
  @ApiBadRequestResponse({
    description: 'Dữ hiệu không hợp lệ',
    type: ValidationErrorResponseDto,
  })
  create(@GetCurrentUser('sub') userId: string, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Cập nhật thành công' })
  @ApiNotFoundResponse({
    description: 'Không thấy địa chỉ',
    type: ErrorResponseDto,
  })
  update(
    @Param('id') id: string,
    @GetCurrentUser('sub') userId: string,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    return this.addressesService.update(id, userId, dto);
  }

  @Patch(':id/default')
  @ApiOkResponse({ description: 'Đặt làm mặc định thành công' })
  @ApiNotFoundResponse({
    description: 'Không thấy địa chỉ',
    type: ErrorResponseDto,
  })
  setDefault(@Param('id') id: string, @GetCurrentUser('sub') userId: string) {
    return this.addressesService.setDefault(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Xóa thành công (No Content)' })
  @ApiBadRequestResponse({
    description: 'Không thể xóa địa chỉ mặc định',
    type: ErrorResponseDto,
  })
  delete(@Param('id') id: string, @GetCurrentUser('sub') userId: string) {
    return this.addressesService.delete(id, userId);
  }
}
