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
  ApiBody,
} from '@nestjs/swagger';
import { CartService } from './carts.service';
import { AtGuard } from '@/auth/guards/at.guard';
import { GetCurrentUser } from '@/common/decorators';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '@/common/dto/api-response.dto';

@ApiTags('Carts')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('carts')
export class CartsController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOkResponse({ description: 'Lấy thông tin giỏ hàng hiện tại của user' })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập',
    type: ErrorResponseDto,
  })
  getCart(@GetCurrentUser('sub') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiCreatedResponse({ description: 'Thêm sản phẩm vào giỏ hàng thành công' })
  @ApiBadRequestResponse({
    description: 'Variant ID không tồn tại hoặc hết hàng',
    type: ValidationErrorResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variant_id: { type: 'string', example: 'uuid-variant-id' },
        quantity: { type: 'number', example: 1 },
      },
      required: ['variant_id', 'quantity'],
    },
  })
  addItem(
    @GetCurrentUser('sub') userId: string,
    @Body('variant_id') variantId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.addItem(userId, variantId, quantity);
  }

  @Patch('items/:variantId')
  @ApiOkResponse({ description: 'Cập nhật số lượng sản phẩm thành công' })
  @ApiBadRequestResponse({
    description: 'Số lượng không hợp lệ hoặc hết hàng',
    type: ValidationErrorResponseDto,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', example: 2 },
      },
      required: ['quantity'],
    },
  })
  updateItem(
    @GetCurrentUser('sub') userId: string,
    @Param('variantId') variantId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateItem(userId, variantId, quantity);
  }

  @Delete('items/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({
    description: 'Xóa sản phẩm khỏi giỏ hàng thành công (No Content)',
  })
  removeItem(
    @GetCurrentUser('sub') userId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.cartService.removeItem(userId, variantId);
  }
}
