import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { MomoService } from './momo.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MomoService],
  exports: [PaymentsService, MomoService],
})
export class PaymentsModule {}
