const { z } = require('zod');
const pool = require('../db/pool');
const { syncEmployeeTags } = require('./tags');
const { ensureDefaultAllocations } = require('./timeOff');

const employeeSchema = z.object({
  name: z.string().min(1),
  department_id: z.number().int().nullable().optional(),
  manager_id: z.number().int().nullable().optional(),
  job_position: z.string().optional(),
  employee_type: z.enum(['full_time', 'part_time', 'contract']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  work_email: z.string().email().nullable().optional(),
  work_phone: z.string().min(7).nullable().optional(),
  private_email: z.string().email().nullable().optional(),
  private_phone: z.string().min(7).nullable().optional(),
  home_address: z.string().nullable().optional(),
  home_city: z.string().nullable().optional(),
  home_state: z.string().nullable().optional(),
  home_country: z.string().nullable().optional(),
  date_of_birth: z.string().date().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed']).nullable().optional(),
  working_schedule: z.string().nullable().optional(),
  working_schedule_id: z.number().int().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  tags: z.array(z.string().min(1)).optional(),
});

// Self-join for manager name; left joins so a missing department/manager doesn't drop the row.
// Tags aggregated via correlated subquery so a missing tag row still returns an empty array.
const EMPLOYEE_SELECT = `
  SELECT e.id, e.employee_code, e.name, e.job_position, e.employee_type, e.status, e.user_id,
         e.department_id, d.name AS department_name,
         e.manager_id, m.name AS manager_name,
         e.work_email, e.work_phone, e.private_email, e.private_phone,
         e.home_address, e.home_city, e.home_state, e.home_country,
         e.date_of_birth, e.gender, e.marital_status, e.working_schedule, e.bank_account,
         e.working_schedule_id, ws.name AS working_schedule_name,
         COALESCE(
           (SELECT array_agg(t.name ORDER BY t.name)
            FROM employee_tags et JOIN tags t ON t.id = et.tag_id
            WHERE et.employee_id = e.id),
           '{}'
         ) AS tags
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN employees m ON m.id = e.manager_id
  LEFT JOIN working_schedules ws ON ws.id = e.working_schedule_id
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

function scalarParams(data) {
  return [
    data.name,
    data.department_id ?? null,
    data.manager_id ?? null,
    data.job_position ?? null,
    data.employee_type ?? null,
    data.status ?? null,
    data.work_email ?? null,
    data.work_phone ?? null,
    data.private_email ?? null,
    data.private_phone ?? null,
    data.home_address ?? null,
    data.home_city ?? null,
    data.home_state ?? null,
    data.home_country ?? null,
    data.date_of_birth ?? null,
    data.gender ?? null,
    data.marital_status ?? null,
    data.working_schedule ?? null,
    data.bank_account ?? null,
    data.working_schedule_id ?? null,
  ];
}

async function createEmployee(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO employees (
         name, department_id, manager_id, job_position, employee_type, status,
         work_email, work_phone, private_email, private_phone,
         home_address, home_city, home_state, home_country,
         date_of_birth, gender, marital_status, working_schedule, bank_account,
         working_schedule_id
       )
       VALUES ($1, $2, $3, $4, COALESCE($5, 'full_time'), COALESCE($6, 'active'),
               $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING id`,
      scalarParams(data)
    );
    const id = rows[0].id;
    await syncEmployeeTags(client, id, data.tags ?? []);
    await ensureDefaultAllocations(client, id);
    await client.query('COMMIT');
    return getEmployee(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateEmployee(id, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE employees
       SET name = $1, department_id = $2, manager_id = $3, job_position = $4,
           employee_type = COALESCE($5, 'full_time'), status = COALESCE($6, 'active'),
           work_email = $7, work_phone = $8, private_email = $9, private_phone = $10,
           home_address = $11, home_city = $12, home_state = $13, home_country = $14,
           date_of_birth = $15, gender = $16, marital_status = $17, working_schedule = $18,
           bank_account = $19, working_schedule_id = $20
       WHERE id = $21`,
      [...scalarParams(data), id]
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    await syncEmployeeTags(client, id, data.tags ?? []);
    await client.query('COMMIT');
    return getEmployee(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  employeeSchema,
  listEmployees,
  getEmployee,
  getEmployeeByUserId,
  createEmployee,
  updateEmployee,
};
