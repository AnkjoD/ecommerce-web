import { Role } from '@/common/enums';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar?: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  tokens: Tokens;
  user: AuthUser;
}
