import { http } from './http';

export const salaryRulesApi = {
  list: ({ structureId, page, limit } = {}) => {
    const params = new URLSearchParams();
    if (structureId) params.set('structure_id', structureId);
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    return http.get(`/salary-rules?${params.toString()}`);
  },
  create: (data) => http.post('/salary-rules', data),
  update: (id, data) => http.put(`/salary-rules/${id}`, data),
};
