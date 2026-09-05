import { http } from './http';

export const timeOffApi = {
  types: () => http.get('/time-off/types'),
  myAllocations: () => http.get('/time-off/me/allocations'),
  myRequests: () => http.get('/time-off/me/requests'),
  createRequest: (data) => http.post('/time-off/requests', data),
  cancelRequest: (id) => http.post(`/time-off/requests/${id}/cancel`),
  list: ({ employeeId, status } = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status', status);
    return http.get(`/time-off/requests?${params.toString()}`);
  },
  approve: (id) => http.post(`/time-off/requests/${id}/approve`),
  refuse: (id) => http.post(`/time-off/requests/${id}/refuse`),
};
