import { http } from './http';

export const contractsApi = {
  list: ({ employeeId, status, page, limit } = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status', status);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    return http.get(`/contracts?${params.toString()}`);
  },
  get: (id) => http.get(`/contracts/${id}`),
  create: (data) => http.post('/contracts', data),
  update: (id, data) => http.put(`/contracts/${id}`, data),
};
