import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productsApi from '../apis/products.api';
import categoriesApi from '../apis/categories.api';
import couponsApi from '../apis/coupons.api';
import reviewsApi from '../apis/reviews.api';
import usersApi from '../apis/users.api';
import ordersApi from '../apis/orders.api';
import auditLogsApi from '../apis/audit-logs.api';
import statsApi from '../apis/stats.api';
import { toast } from 'sonner';

// Audit Logs
export function useAdminAuditLogs(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['admin-audit-logs', { page, limit }],
    queryFn: () => auditLogsApi.getAll(page, limit),
  });
}

// Stats / Overview
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats-overview'],
    queryFn: () => statsApi.getOverview(),
  });
}

// Products
export function useAdminProducts(page = 1, limit = 20, search?: string) {
  return useQuery({
    queryKey: ['admin-products', { page, limit, search }],
    queryFn: () => productsApi.getAdminProducts({ page, limit, q: search }),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => productsApi.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Tạo sản phẩm thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi tạo sản phẩm'),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => productsApi.updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Cập nhật sản phẩm thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật sản phẩm'),
  });
}

export function useUpdateProductMetadata() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => productsApi.updateMetadata(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Cập nhật thông tin sản phẩm thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật sản phẩm'),
  });
}

export function useAddVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string, data: any }) => productsApi.addVariant(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Thêm phiên bản mới thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi thêm phiên bản'),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Xóa toàn bộ sản phẩm thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa sản phẩm'),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteVariant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Xóa biến thể thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa biến thể'),
  });
}

export function useSyncProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => productsApi.syncAll(),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(res.data.message || 'Đồng bộ dữ liệu thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi đồng bộ dữ liệu'),
  });
}

export function useAdminUniqueTags() {
  return useQuery({
    queryKey: ['admin-products-unique-tags'],
    queryFn: () => productsApi.getUniqueTags(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

// Categories
export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => categoriesApi.getAll(),
  });
}

export function useAdminCategoryTree() {
  return useQuery({
    queryKey: ['admin-categories-tree'],
    queryFn: () => categoriesApi.getTree(),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => categoriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories-tree'] });
      toast.success('Tạo danh mục thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi tạo danh mục'),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => categoriesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories-tree'] });
      toast.success('Cập nhật danh mục thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật danh mục'),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories-tree'] });
      toast.success('Xóa danh mục thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa danh mục'),
  });
}

// Coupons
export function useAdminCoupons(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['admin-coupons', { page, limit }],
    queryFn: () => couponsApi.getAll(page, limit),
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => couponsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Tạo mã giảm giá thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi tạo mã giảm giá'),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => couponsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cập nhật mã giảm giá thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật mã giảm giá'),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Xóa mã giảm giá thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa mã giảm giá'),
  });
}

// Reviews
export function useAdminReviews(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['admin-reviews', { page, limit }],
    queryFn: () => reviewsApi.getAll(page, limit),
  });
}

export function useVerifyReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewsApi.adminUpdate(id, { is_verified: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Đã duyệt đánh giá');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi duyệt đánh giá'),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => reviewsApi.adminUpdate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Cập nhật đánh giá thành công');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật đánh giá'),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewsApi.adminDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Đã xóa đánh giá');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa đánh giá'),
  });
}

// Users
export function useAdminUsers(page = 1, limit = 20, search?: string) {
  return useQuery({
    queryKey: ['admin-users', { page, limit, search }],
    queryFn: () => usersApi.getAll(page, limit, search),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Đã cập nhật trạng thái người dùng');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật người dùng'),
  });
}

// Orders
export function useAdminOrders(params: { page?: number, limit?: number, userId?: string, status?: string, search?: string }) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => ordersApi.getAdminOrders(params),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string, status: any }) => ordersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Đã cập nhật trạng thái đơn hàng');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật đơn hàng'),
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string, status: any }) => ordersApi.updatePaymentStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Đã cập nhật trạng thái thanh toán');
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật thanh toán'),
  });
}
