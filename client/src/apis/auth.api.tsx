import http from "~/utils/http";
import type { FormLogin } from '~/types/FormLogin.type';
import type { User } from "~/types/user.type";
import type { SuccessResponseApi } from "~/types/utils.type";

export const registerAccount = (body: {
  full_name: string
  email: string
  password: string
  phone: string
}) => {
  return http.post<SuccessResponseApi<User>>('/auth/register', body)
}

export const loginAccount = (body: FormLogin) => {
  return http.post<SuccessResponseApi<User>>("/auth/login", body);
}

export const logoutAccount = () => http.post("/auth/logout");

// Elite Note: Dùng để lấy thông tin user dựa trên Cookie
export const getMe = () => http.get<SuccessResponseApi<User>>("/auth/me");