import { http } from './http';

export const dashboardApi = {
  summary: ({ periodStart, periodEnd, departmentId, employeeType }) => {
    const params = new URLSearchParams({ period_start: periodStart, period_end: periodEnd });
    if (departmentId) params.set('department_id', departmentId);
    if (employeeType) params.set('employee_type', employeeType);
    return http.get(`/dashboard/summary?${params.toString()}`);
  },
};
