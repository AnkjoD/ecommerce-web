import { Role } from '@/common/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface JwtPayloadWithRt extends JwtPayload {
  refreshToken: string;
}
