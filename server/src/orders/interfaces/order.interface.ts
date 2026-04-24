import { Prisma } from '@prisma/client';

/**
 * Kiểu mô tả một CartItem đã được include variant từ Prisma.
 * Dùng trong validateStock() và calculateTotal() thay cho any[].
 *
 * Cách Prisma generate: khi query CartItem include { variant: true }
 * thì mỗi item có shape = CartItem & { variant: ProductVariant }
 */
export type CartItemWithVariant = Prisma.CartItemGetPayload<{
  include: { variant: { include: { product: true } } };
}>;

/**
 * Kết quả tính toán giá trị đơn hàng trước khi lưu vào DB.
 * Trả về từ hàm calculateTotal().
 */
export interface OrderTotals {
  /** Tổng giá gốc (chưa giảm, chưa ship) */
  subtotal: number;

  /** Số tiền được giảm từ coupon */
  discount_amount: number;

  /** Phí vận chuyển (= 0 nếu subtotal - discount >= 500.000đ) */
  shipping_fee: number;

  /** Tổng tiền thực tế cần thanh toán */
  total: number;
}

/**
 * Kết quả phân trang — wrapper chung dùng cho findByUser, adminList, v.v.
 *
 * @template T  kiểu của từng item trong mảng data
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
