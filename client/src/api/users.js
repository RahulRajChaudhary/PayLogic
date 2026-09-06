import { http } from './http';

export const usersApi = {
  list: ({ page, limit } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return http.get(`/users${qs ? `?${qs}` : ''}`);
  },
  create: (data) => http.post('/users', data),
};
