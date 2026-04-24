import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '@/auth/auth.service';
import { RequestWithUser } from '@/auth/interfaces/user.interface';
import { AuthController } from './auth.controller';
import { AtStrategy, RtStrategy } from '@/auth/strategies';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), MailModule],
  controllers: [AuthController],
  providers: [AuthService, AtStrategy, RtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
