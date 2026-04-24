import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './controllers/orders.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { CartsModule } from '@/carts/carts.module';
import { PaymentsModule } from '@/payments/payments.module';

@Module({
  imports: [PrismaModule, CartsModule, PaymentsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
