import http from '../utils/http';

const auditLogsApi = {
  getAll: (page = 1, limit = 50) => 
    http.get<any>(`/admin/audit-logs?page=${page}&limit=${limit}`),
};

export default auditLogsApi;
