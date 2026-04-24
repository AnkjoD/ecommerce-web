import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { GetCurrentUser } from '@/common/decorators';
import { AtGuard } from '../auth/guards/at.guard';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách địa chỉ của người dùng' })
  @ApiOkResponse({ description: 'Thành công' })
  findAll(@GetCurrentUser('sub') userId: string) {
    return this.addressesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một địa chỉ' })
  @ApiOkResponse({ description: 'Thành công' })
  findOne(@Param('id') id: string, @GetCurrentUser('sub') userId: string) {
    return this.addressesService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm địa chỉ mới' })
  @ApiCreatedResponse({ description: 'Thêm địa chỉ thành công' })
  create(@GetCurrentUser('sub') userId: string, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  @ApiOkResponse({ description: 'Cập nhật thành công' })
  update(
    @Param('id') id: string,
    @GetCurrentUser('sub') userId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, userId, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Đặt địa chỉ làm mặc định' })
  @ApiOkResponse({ description: 'Đặt mặc định thành công' })
  setDefault(@Param('id') id: string, @GetCurrentUser('sub') userId: string) {
    return this.addressesService.setDefault(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa địa chỉ' })
  @ApiOkResponse({ description: 'Xóa thành công' })
  remove(@Param('id') id: string, @GetCurrentUser('sub') userId: string) {
    return this.addressesService.remove(id, userId);
  }
}
