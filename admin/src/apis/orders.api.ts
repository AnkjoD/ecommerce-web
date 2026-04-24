import http from "../utils/http";
import { Order, OrderStatus, PaymentStatus } from "../types/ecommerce";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const ordersApi = {
  getAdminOrders: (params: { page?: number; limit?: number; userId?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.status && params.status !== 'all') searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    
    return http.get<PaginatedResult<Order>>(`/admin/orders?${searchParams.toString()}`);
  },
  updateStatus: (id: string, status: OrderStatus) => {
    return http.patch<Order>(`/admin/orders/${id}/status`, { status });
  },
  updatePaymentStatus: (id: string, status: PaymentStatus) => {
    return http.patch<Order>(`/admin/orders/${id}/payment-status`, { status });
  }
};

export default ordersApi;
