import { http } from './http';

export const salaryStructuresApi = {
  list: ({ page, limit } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return http.get(`/salary-structures${qs ? `?${qs}` : ''}`);
  },
  get: (id) => http.get(`/salary-structures/${id}`),
  create: (data) => http.post('/salary-structures', data),
  update: (id, data) => http.put(`/salary-structures/${id}`, data),
};
