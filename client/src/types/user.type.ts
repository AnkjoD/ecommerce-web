export interface Address {
  id: string
  user_id: string
  recipient_name: string
  phone: string
  province: string
  district: string
  ward: string
  street: string
  is_default: boolean
}

export interface Review {
  id: string
  user_id: string
  product_id: string
  order_id: string
  rating: number
  comment: string | null
  is_verified: boolean
  admin_reply?: string
  admin_reply_at?: string
  created_at: string

  user?: {
    id: string
    full_name: string
  }
}

export interface User {
  id: string
  email: string
  role: 'customer' | 'admin'
  created_at: string
  updated_at: string
  date_of_birth: string | null
  full_name: string
  name?: string // Legacy field for frontend compatibility
  avatar: string | null
  phone: string | null
  gender?: string
  address?: string
  addresses?: Address[]
  reviews?: Review[]
}

export type UpdateUser = Omit<User, '_id' | 'roles' | 'email' | 'createdAt' | 'updatedAt'>

export type UpdatePassword = { password: string; new_password: string }
