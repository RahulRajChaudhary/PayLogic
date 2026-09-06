import { http } from './http';

export const payrunsApi = {
  list: () => http.get('/payruns'),
  get: (id) => http.get(`/payruns/${id}`),
  eligibleEmployees: ({ structureId, periodStart, periodEnd }) => {
    const params = new URLSearchParams({ structure_id: structureId, period_start: periodStart, period_end: periodEnd });
    return http.get(`/payruns/eligible-employees?${params.toString()}`);
  },
  create: (data) => http.post('/payruns', data),
  compute: (id) => http.post(`/payruns/${id}/compute`),
  validate: (id) => http.post(`/payruns/${id}/validate`),
  markPaid: (id) => http.post(`/payruns/${id}/mark-paid`),
  send: (id) => http.post(`/payruns/${id}/send`),
};
