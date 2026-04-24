import http from '../utils/http';

const usersApi = {
  getAll: (page = 1, limit = 20, search?: string) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) query.append('search', search);
    return http.get<any>(`/admin/users?${query.toString()}`);
  },
  toggleActive: (id: string) => 
    http.patch<any>(`/admin/users/${id}/toggle-active`, {}),
};

export default usersApi;
