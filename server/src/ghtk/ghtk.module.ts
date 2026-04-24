import { Module, Global } from '@nestjs/common';
import { GhtkService } from './ghtk.service';
import { GhtkController } from './ghtk.controller';
import { OrdersModule } from '../orders/orders.module';

@Global()
@Module({
  imports: [OrdersModule],
  controllers: [GhtkController],
  providers: [GhtkService],
  exports: [GhtkService],
})
export class GhtkModule {}
