import { http } from './http';

export const departmentsApi = {
  list: ({ page, limit } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return http.get(`/departments${qs ? `?${qs}` : ''}`);
  },
  create: (name) => http.post('/departments', { name }),
  update: (id, name) => http.put(`/departments/${id}`, { name }),
};
