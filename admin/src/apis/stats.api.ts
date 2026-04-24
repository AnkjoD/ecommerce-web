import http from '../utils/http';

const statsApi = {
  getOverview: () => 
    http.get<any>('/admin/stats/overview'),
};

export default statsApi;
