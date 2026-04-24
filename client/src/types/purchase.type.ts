import type { ProductVariant } from './product.type'

export type PurchaseStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'payment_failed'
export type PurchaseListStatus = PurchaseStatus | 'all'

/**
 * Đại diện cho một mục trong giỏ hàng (Cart Item)
 */
export interface Purchase {
  id: string // Chuyển từ _id sang id (UUID)
  quantity: number // Chuyển từ buy_count sang quantity
  variant_id: string
  variant: ProductVariant // Chứa thông tin biến thể và product mẹ
  added_at: string
}

/**
 * Đối tượng Giỏ hàng tổng thể
 */
export interface Cart {
  id: string
  user_id: string
  items: Purchase[]
  subtotal: number
  total_items: number
  created_at: string
  updated_at: string
}

/**
 * Mục trong đơn hàng
 */
export interface OrderItem {
  id: string
  order_id: string
  variant_id: string
  product_name: string
  variant_info: string
  unit_price: number
  quantity: number
  subtotal: number
  variant: ProductVariant
}

/**
 * Đơn hàng (Order)
 */
export interface Order {
  id: string
  user_id: string
  address_id: string
  order_code: string
  status: PurchaseStatus
  payment_status: string
  payment_method: string
  subtotal: number
  discount_amount: number
  shipping_fee: number
  total: number
  items: OrderItem[]
  created_at: string
  updated_at: string
}
