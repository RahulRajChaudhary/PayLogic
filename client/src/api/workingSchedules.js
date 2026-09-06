import { http } from './http';

export const workingSchedulesApi = {
  list: ({ page, limit } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return http.get(`/working-schedules${qs ? `?${qs}` : ''}`);
  },
  get: (id) => http.get(`/working-schedules/${id}`),
  create: (data) => http.post('/working-schedules', data),
  update: (id, data) => http.put(`/working-schedules/${id}`, data),
};
