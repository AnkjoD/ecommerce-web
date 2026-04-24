// Aligned with Prisma schema

export type UserRole = 'customer' | 'admin';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'payment_failed';
export type PaymentMethod = 'vnpay' | 'momo' | 'cod';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  brand: string | null;
  status: 'draft' | 'active' | 'archived';
  description: Record<string, any>;
  attributes: Record<string, any>;
  media: Record<string, any>;
  seo: Record<string, any>;
  tags: string[];
  category_path: string[];
  rating_avg: number;
  rating_count: number;
  created_at: Date;
  updated_at: Date;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  stock_quantity: number;
  reserved_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_value: number;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
  expires_at: Date | null;
  created_at: Date;
}

export interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
}

export interface OrderItem {
  id: string;
  product_name: string;
  variant_info: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  user_id: string;
  address_id: string;
  order_code: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  address: Address;
  items: OrderItem[];
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: Date;
}
