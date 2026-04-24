import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@/common/enums';
import { JwtPayload, Tokens, AuthResponse, AuthUser } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const hash = await bcrypt.hash(dto.password, 12);

    try {
      const newUser = await this.prisma.user.create({
        data: {
          email: dto.email,
          password_hash: hash,
          full_name: dto.full_name,
          phone: dto.phone,
          role: Role.CUSTOMER,
        },
      });

      const tokens = await this.getTokens(
        newUser.id,
        newUser.email,
        newUser.role as Role,
      );
      await this.updateRtHash(newUser.id, tokens.refresh_token);

      return {
        tokens,
        user: this.mapToAuthUser(newUser),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('email')) {
            throw new ConflictException('Email already exists');
          }
          if (target?.includes('phone')) {
            throw new ConflictException(
              'Số điện thoại đã được đăng ký bởi một tài khoản khác',
            );
          }
        }
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.is_active)
      throw new UnauthorizedException('Access Denied');

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatches) throw new UnauthorizedException('Access Denied');

    // Prevent Admin from logging in through public endpoint
    if (user.role === Role.ADMIN) {
      throw new UnauthorizedException(
        'Vui lòng sử dụng cổng đăng nhập dành cho Quản trị viên',
      );
    }

    const tokens = await this.getTokens(user.id, user.email, user.role as Role);
    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      tokens,
      user: this.mapToAuthUser(user),
    };
  }

  async loginAdmin(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.is_active || user.role !== Role.ADMIN) {
      throw new UnauthorizedException('Access Denied');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatches) throw new UnauthorizedException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email, user.role as Role);
    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      tokens,
      user: this.mapToAuthUser(user),
    };
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Người dùng không tồn tại hoặc đã bị xóa',
      );
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    return this.mapToAuthUser(user);
  }

  async logout(userId: string): Promise<boolean> {
    await this.prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
      },
    });
    return true;
  }

  async refreshTokens(userId: string, rt: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.is_active) throw new ForbiddenException('Access Denied');

    const rtHash = this.hashData(rt);
    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        user_id: userId,
        token_hash: rtHash,
        is_revoked: false,
        expires_at: { gt: new Date() },
      },
    });

    if (!refreshToken) throw new ForbiddenException('Access Denied');

    // Token Rotation
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { is_revoked: true },
    });

    const tokens = await this.getTokens(user.id, user.email, user.role as Role);
    await this.updateRtHash(user.id, tokens.refresh_token);

    return {
      tokens,
      user: this.mapToAuthUser(user),
    };
  }

  async updateRtHash(userId: string, rt: string): Promise<void> {
    const hash = this.hashData(rt);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Dùng transaction để đảm bảo atomicity
    // Tránh race condition khi 2 refresh requests chạy đồng thời
    await this.prisma.$transaction(async (tx) => {
      // Revoke tất cả token cũ
      await tx.refreshToken.updateMany({
        where: { user_id: userId, is_revoked: false },
        data: { is_revoked: true },
      });

      // Thử tạo token mới, nếu hash đã tồn tại (race condition) thì bỏ qua
      try {
        await tx.refreshToken.create({
          data: {
            user_id: userId,
            token_hash: hash,
            expires_at: expiresAt,
          },
        });
      } catch (err: any) {
        // P2002 = Unique constraint violation → token này đã được tạo bởi request song song
        // Đây là safe to ignore vì token đó đã valid
        if (err?.code !== 'P2002') throw err;
      }
    });
  }

  async getTokens(userId: string, email: string, role: Role): Promise<Tokens> {
    const jwtPayload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  private mapToAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar:
        user.avatar ||
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id,
    };
  }

  private hashData(data: string) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async seedAdmin() {
    const firstUser = await this.prisma.user.findFirst({
      orderBy: { created_at: 'asc' },
    });

    if (!firstUser) {
      throw new BadRequestException('Chưa có người dùng nào trong hệ thống');
    }

    await this.prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'admin' },
    });

    return {
      message: 'Đã nâng cấp tài khoản đầu tiên lên Admin',
      email: firstUser.email,
    };
  }
}
