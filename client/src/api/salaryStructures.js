import { http } from './http';

export const salaryStructuresApi = {
  list: () => http.get('/salary-structures'),
  get: (id) => http.get(`/salary-structures/${id}`),
  create: (data) => http.post('/salary-structures', data),
  update: (id, data) => http.put(`/salary-structures/${id}`, data),
};
