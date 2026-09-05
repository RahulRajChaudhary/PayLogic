import { http } from './http';

export const usersApi = {
  list: () => http.get('/users'),
  create: (data) => http.post('/users', data),
};
