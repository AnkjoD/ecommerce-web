import { Module } from '@nestjs/common';
import { CartService } from './carts.service';
import { CartsController } from './carts.controller';

@Module({
  controllers: [CartsController],
  providers: [CartService],
})
export class CartsModule {}
