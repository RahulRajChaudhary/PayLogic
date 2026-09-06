import { http } from './http';

export const attendanceApi = {
  checkIn: () => http.post('/attendance/check-in'),
  checkOut: () => http.post('/attendance/check-out'),
  me: (month) => http.get(`/attendance/me${month ? `?month=${month}` : ''}`),
  list: ({ employeeId, departmentId, month, date } = {}) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (departmentId) params.set('department_id', departmentId);
    if (date) params.set('date', date);
    else if (month) params.set('month', month);
    return http.get(`/attendance?${params.toString()}`);
  },
  update: (id, data) => http.put(`/attendance/${id}`, data),
  count: (employeeId) => http.get(`/attendance/count?employee_id=${employeeId}`),
};
