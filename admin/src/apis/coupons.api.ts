import http from '../utils/http';

const couponsApi = {
  getAll: (page = 1, limit = 20) => 
    http.get<any>(`/coupons?page=${page}&limit=${limit}`),
  create: (data: any) => 
    http.post<any>('/coupons', data),
  update: (id: string, data: any) => 
    http.patch<any>(`/coupons/${id}`, data),
  delete: (id: string) => 
    http.delete<void>(`/coupons/${id}`),
};

export default couponsApi;
