import { http } from './http';

export const salaryRulesApi = {
  list: ({ structureId } = {}) => {
    const params = new URLSearchParams();
    if (structureId) params.set('structure_id', structureId);
    return http.get(`/salary-rules?${params.toString()}`);
  },
  create: (data) => http.post('/salary-rules', data),
  update: (id, data) => http.put(`/salary-rules/${id}`, data),
};
