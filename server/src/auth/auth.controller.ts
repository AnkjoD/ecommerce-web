import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/auth/auth.service';
import { RegisterDto } from '@/auth/dto/register.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { GetCurrentUser, GetCurrentUserId } from '@/common/decorators';
import { Public } from '@/auth/decorators/public.decorator';
import { AtGuard, RtGuard } from './guards';
import { AuthResponse } from './interfaces';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Auth')
@UseGuards(AtGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.register(dto);
    this.setAuthCookies(res, authResponse);
    return authResponse.user;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.login(dto);
    this.setAuthCookies(res, authResponse);
    return authResponse.user;
  }

  // Cửa đăng nhập bí mật cho Admin
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('admin-login-9472')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.loginAdmin(dto);
    this.setAuthCookies(res, authResponse);
    return authResponse.user;
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.refreshTokens(
      userId,
      refreshToken,
    );
    this.setAuthCookies(res, authResponse);
    return authResponse.user;
  }

  @Public()
  @Post('seed-admin')
  @HttpCode(HttpStatus.OK)
  async seedAdmin() {
    return await this.authService.seedAdmin();
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@GetCurrentUser() user: JwtPayload) {
    if (!user || !user.sub) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }

    try {
      // Query DB để lấy thông tin đầy đủ, không chỉ JWT payload
      return await this.authService.getMe(user.sub);
    } catch {
      throw new UnauthorizedException('Không thể lấy thông tin người dùng');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetCurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearAuthCookies(res);
    return this.authService.logout(userId);
  }

  private setAuthCookies(res: Response, authResponse: AuthResponse) {
    const isProd = process.env.NODE_ENV === 'production';

    // Access Token Cookie
    res.cookie('hm-sid', authResponse.tokens.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    // Refresh Token Cookie
    res.cookie('hm-rid', authResponse.tokens.refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const commonOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('hm-sid', commonOptions);
    res.clearCookie('hm-rid', commonOptions);
  }
}
