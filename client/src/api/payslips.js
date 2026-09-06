import { http } from './http';

const API_BASE = 'http://localhost:4000';

export const payslipsApi = {
  list: ({ employeeId, payrunId, status, page, limit } = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (payrunId) params.set('payrun_id', payrunId);
    if (status) params.set('status', status);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    return http.get(`/payslips?${params.toString()}`);
  },
  get: (id) => http.get(`/payslips/${id}`),
  pdfUrl: (id) => `${API_BASE}/payslips/${id}/pdf`,
};
