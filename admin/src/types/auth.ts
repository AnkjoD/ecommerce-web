import { UserRole } from './ecommerce';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  tokens: Tokens;
  user: AuthUser;
}

export interface SuccessResponseApi<Data> {
  message: string;
  data: Data;
}

export interface ErrorResponseApi<Data = any> {
  message: string;
  data?: Data;
}
