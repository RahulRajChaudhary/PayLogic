const { z } = require('zod');
const pool = require('../db/pool');
const { hashPassword } = require('./auth');

const ASSIGNABLE_ROLES = ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const createUserSchema = z.object({
  employee_id: z.number().int(),
  email: z.email(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  role: z.enum(ASSIGNABLE_ROLES),
});

async function listUsers({ page = 1, limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, e.id AS employee_id, e.name AS employee_name,
            COUNT(*) OVER() AS total_count
     FROM users u
     LEFT JOIN employees e ON e.user_id = u.id
     ORDER BY u.email
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { rows: rows.map(({ total_count, ...r }) => r), total };
}

async function createUserForEmployee({ employee_id, email, password, role }) {
  const { rows: employeeRows } = await pool.query(
    'SELECT id, user_id FROM employees WHERE id = $1',
    [employee_id]
  );
  const employee = employeeRows[0];
  if (!employee) {
    const err = new Error('Employee not found');
    err.status = 404;
    throw err;
  }
  if (employee.user_id) {
    const err = new Error('This employee already has a login');
    err.status = 409;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await hashPassword(password);
    const { rows: userRows } = await client.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, passwordHash, role]
    );
    await client.query('UPDATE employees SET user_id = $1 WHERE id = $2', [
      userRows[0].id,
      employee_id,
    ]);
    await client.query('COMMIT');
    return userRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createUserSchema, listUsers, createUserForEmployee };
