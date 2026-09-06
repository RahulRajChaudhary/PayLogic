import { http } from './http';

export const workingSchedulesApi = {
  list: () => http.get('/working-schedules'),
  get: (id) => http.get(`/working-schedules/${id}`),
  create: (data) => http.post('/working-schedules', data),
  update: (id, data) => http.put(`/working-schedules/${id}`, data),
};
