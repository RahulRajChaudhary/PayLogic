const { z } = require('zod');
const pool = require('../db/pool');

const employeeSchema = z.object({
  name: z.string().min(1),
  department_id: z.number().int().nullable().optional(),
  manager_id: z.number().int().nullable().optional(),
  job_position: z.string().optional(),
  employee_type: z.enum(['full_time', 'part_time', 'contract']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// Self-join for manager name; left joins so a missing department/manager doesn't drop the row.
const EMPLOYEE_SELECT = `
  SELECT e.id, e.name, e.job_position, e.employee_type, e.status, e.user_id,
         e.department_id, d.name AS department_name,
         e.manager_id, m.name AS manager_name
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN employees m ON m.id = e.manager_id
`;

async function listEmployees({ status, search } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`e.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(e.name ILIKE $${params.length} OR e.job_position ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`${EMPLOYEE_SELECT} ${where} ORDER BY e.name`, params);
  return rows;
}

async function getEmployee(id) {
  const { rows } = await pool.query(`${EMPLOYEE_SELECT} WHERE e.id = $1`, [id]);
  return rows[0] ?? null;
}

async function getEmployeeByUserId(userId) {
  const { rows } = await pool.query(`${EMPLOYEE_SELECT} WHERE e.user_id = $1`, [userId]);
  return rows[0] ?? null;
}

async function createEmployee(data) {
  const { rows } = await pool.query(
    `INSERT INTO employees (name, department_id, manager_id, job_position, employee_type, status)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'full_time'), COALESCE($6, 'active'))
     RETURNING id`,
    [
      data.name,
      data.department_id ?? null,
      data.manager_id ?? null,
      data.job_position ?? null,
      data.employee_type ?? null,
      data.status ?? null,
    ]
  );
  return getEmployee(rows[0].id);
}

async function updateEmployee(id, data) {
  const { rowCount } = await pool.query(
    `UPDATE employees
     SET name = $1, department_id = $2, manager_id = $3, job_position = $4,
         employee_type = COALESCE($5, 'full_time'), status = COALESCE($6, 'active')
     WHERE id = $7`,
    [
      data.name,
      data.department_id ?? null,
      data.manager_id ?? null,
      data.job_position ?? null,
      data.employee_type ?? null,
      data.status ?? null,
      id,
    ]
  );
  if (rowCount === 0) return null;
  return getEmployee(id);
}

module.exports = {
  employeeSchema,
  listEmployees,
  getEmployee,
  getEmployeeByUserId,
  createEmployee,
  updateEmployee,
};
