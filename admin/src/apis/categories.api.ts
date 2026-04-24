import http from '../utils/http';

const categoriesApi = {
  getTree: () => http.get<any[]>('/categories/tree'),
  getAll: () => http.get<any[]>('/categories'),
  create: (data: { name: string; parent_id?: string | null }) => 
    http.post<any>('/admin/categories', data),
  update: (id: string, data: any) => 
    http.patch<any>(`/admin/categories/${id}`, data),
  delete: (id: string) => 
    http.delete<void>(`/admin/categories/${id}`),
};

export default categoriesApi;
