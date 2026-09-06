import { http } from './http';

export const timeOffApi = {
  types: ({ page, limit } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return http.get(`/time-off/types${qs ? `?${qs}` : ''}`);
  },
  myAllocations: () => http.get('/time-off/me/allocations'),
  myRequests: ({ page, limit } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return http.get(`/time-off/me/requests${qs ? `?${qs}` : ''}`);
  },
  createRequest: (data) => http.post('/time-off/requests', data),
  cancelRequest: (id) => http.post(`/time-off/requests/${id}/cancel`),
  list: ({ employeeId, status, page, limit } = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status', status);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    return http.get(`/time-off/requests?${params.toString()}`);
  },
  approve: (id) => http.post(`/time-off/requests/${id}/approve`),
  refuse: (id) => http.post(`/time-off/requests/${id}/refuse`),

  createType: (data) => http.post('/time-off/types', data),
  updateType: (id, data) => http.put(`/time-off/types/${id}`, data),

  allocations: ({ employeeId, status, page, limit } = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (status) params.set('status', status);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    return http.get(`/time-off/allocations?${params.toString()}`);
  },
  createAllocation: (data) => http.post('/time-off/allocations', data),
  updateAllocation: (id, data) => http.put(`/time-off/allocations/${id}`, data),
  approveAllocation: (id) => http.post(`/time-off/allocations/${id}/approve`),
  refuseAllocation: (id) => http.post(`/time-off/allocations/${id}/refuse`),
};
