import { http } from './http';

export const employeesApi = {
  list: ({ status, search, page, limit } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return http.get(`/employees${qs ? `?${qs}` : ''}`);
  },
  get: (id) => http.get(`/employees/${id}`),
  me: () => http.get('/employees/me'),
  create: (data) => http.post('/employees', data),
  update: (id, data) => http.put(`/employees/${id}`, data),
};
