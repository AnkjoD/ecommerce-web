import http from '../utils/http';
import { Product, ProductVariant } from '../types/ecommerce';

const productsApi = {
  getAdminProducts: (params?: { page?: number; limit?: number; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.q) query.append('q', params.q);
    return http.get<{ data: any[]; total: number }>(`/products?${query.toString()}`);
  },
  
  createProduct: (data: any) => 
    http.post<any>('/admin/products', data),
  
  updateProduct: (id: string, data: any) => 
    http.patch<any>(`/admin/products/${id}`, data),
  
  updateMetadata: (id: string, data: any) => 
    http.patch<any>(`/admin/products/${id}/metadata`, data),
  
  addVariant: (productId: string, data: any) =>
    http.post<any>(`/admin/products/${productId}/variants`, data),
  
  deleteProduct: (id: string) => 
    http.delete<void>(`/admin/products/${id}`),

  deleteVariant: (id: string) => 
    http.delete<void>(`/admin/products/variants/${id}`),

  syncAll: () => 
    http.post<{ message: string }>('/admin/products/sync'),

  getUniqueTags: () =>
    http.get<string[]>('/products/meta/unique-tags'),
};

export default productsApi;
