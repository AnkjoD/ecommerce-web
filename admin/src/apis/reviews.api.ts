import http from '../utils/http';

const reviewsApi = {
  getAll: (page = 1, limit = 20) => 
    http.get<any>(`/admin/reviews?page=${page}&limit=${limit}`),
  
  adminUpdate: (id: string, data: any) => 
    http.patch<any>(`/admin/reviews/${id}`, data),
  
  adminDelete: (id: string) => 
    http.delete<void>(`/admin/reviews/${id}`),
};

export default reviewsApi;
