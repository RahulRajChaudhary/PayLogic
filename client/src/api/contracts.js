import { http } from './http';

export const contractsApi = {
  list: ({ employeeId, status } = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status', status);
    return http.get(`/contracts?${params.toString()}`);
  },
  get: (id) => http.get(`/contracts/${id}`),
  create: (data) => http.post('/contracts', data),
  update: (id, data) => http.put(`/contracts/${id}`, data),
};
