import { http } from './http';

export const departmentsApi = {
  list: () => http.get('/departments'),
  create: (name) => http.post('/departments', { name }),
  update: (id, name) => http.put(`/departments/${id}`, { name }),
};
