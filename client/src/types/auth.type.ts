import { type SuccessResponseApi } from './utils.type'
import { type User } from './user.type'
export type AuthResponse = SuccessResponseApi<{
  access_token: string
  refresh_token: string
  expires: number
  expires_refresh_token: number
  user: User
}>
