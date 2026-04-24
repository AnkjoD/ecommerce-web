import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './controllers/coupons.controller';
import { AdminCouponsController } from './controllers/admin-coupons.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CouponsController, AdminCouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
