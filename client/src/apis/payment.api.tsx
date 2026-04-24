import http from "~/utils/http";
import type { SuccessResponseApi } from "~/types/utils.type";

const PAYMENT_URL = "/payments";

const paymentApi = {
    // Tạo link thanh toán VNPay cho đơn hàng
    createVnPayUrl: (orderId: string, saveCard = false) => {
        return http.post<SuccessResponseApi<{ url: string; params: Record<string, string> }>>(
            `${PAYMENT_URL}/vnpay/create/${orderId}`, 
            {}, 
            { params: { saveCard } }
        );
    },
    // Tạo link thanh toán MoMo cho đơn hàng
    createMomoUrl: (orderId: string) => {
        return http.post<SuccessResponseApi<string>>(`${PAYMENT_URL}/momo/create/${orderId}`);
    },
    // Lấy danh sách thẻ đã lưu
    getSavedMethods: () => {
        return http.get<SuccessResponseApi<any[]>>(`${PAYMENT_URL}/methods`);
    },
    // Xóa thẻ đã lưu
    deleteSavedMethod: (id: string) => {
        return http.delete(`${PAYMENT_URL}/methods/${id}`);
    },
    // Xác thực kết quả thanh toán VNPay từ URL
    verifyVnpayCallback: (params: Record<string, string>) => {
        return http.get<SuccessResponseApi<{
            isSuccess: boolean;
            order_code: string;
            amount: number;
            message?: string;
        }>>(`${PAYMENT_URL}/vnpay/callback`, { params });
    }
}

export default paymentApi;
