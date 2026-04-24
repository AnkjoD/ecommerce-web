import http from '~/utils/http'
import {type SuccessResponseApi as SuccessResponse } from '~/types/utils.type'
import type { User } from '~/types/user.type'
import { type ChangePasswordSchema } from '~/utils/rules'

const userApi = {
  /** Lấy profile cá nhân từ server */
  getProfile() {
    return http.get<SuccessResponse<User>>('/users/me')
  },

  /** Cập nhật profile (PATCH /users/me) */
  updateProfile(body: Partial<Omit<User, 'id' | 'email' | 'role'>>) {
    return http.patch<SuccessResponse<User>>('/users/me', body)
  },

  /** Upload ảnh đại diện (POST /users/me/avatar) */
  uploadAvatar(body: FormData) {
    return http.post<SuccessResponse<string>>('/users/me/avatar', body, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /** Đổi mật khẩu (POST /users/me/change-password) */
  changePassword(body: Pick<ChangePasswordSchema, 'password' | 'new_password'>) {
    return http.post<SuccessResponse<void>>('/users/me/change-password', body)
  }
}

export default userApi