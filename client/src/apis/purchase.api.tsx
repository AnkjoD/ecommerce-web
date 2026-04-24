import http from "~/utils/http";
import type { SuccessResponseApi } from "~/types/utils.type";
import type { Purchase, Cart, Order, PurchaseListStatus } from "~/types/purchase.type";

const CART_URL = "/carts";

const purchaseApi = {
    // Thêm vào giỏ hàng
    addToCart: (variant_id: string, quantity: number) => {
        return http.post<SuccessResponseApi<Purchase>>(`${CART_URL}/items`, { variant_id, quantity });
    },

    // Lấy thông tin Giỏ hàng (NestJS trả về Cart object)
    getPurchases(params?: { status?: number }) {
        return http.get<SuccessResponseApi<Cart>>(`${CART_URL}`, { params });
    },

    // Lấy danh sách đơn hàng (History)
    getOrders(params?: { status?: PurchaseListStatus; page?: number; limit?: number }) {
        return http.get<SuccessResponseApi<{ data: Order[]; total: number; page: number; limit: number; total_pages: number }>>('/orders', { params });
    },

    // Xóa sản phẩm khỏi giỏ
    deletePurchases(variantId: string) {
        return http.delete(`${CART_URL}/items/${variantId}`);
    },

    // Cập nhật số lượng
    updatePurchase(variantId: string, quantity: number) {
        return http.patch<SuccessResponseApi<Purchase>>(`${CART_URL}/items/${variantId}`, { quantity });
    },

    // Mua sản phẩm (Checkout)
    buyPurchases(body: { address_id: string; payment_method: string; coupon_code?: string; save_card?: boolean }) {
        return http.post<SuccessResponseApi<Order>>(`/orders`, body);
    },
}

export default purchaseApi;