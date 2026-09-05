import { http } from './http';

export const tagsApi = {
  list: () => http.get('/tags'),
};
