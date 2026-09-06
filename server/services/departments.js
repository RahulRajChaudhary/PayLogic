const pool = require('../db/pool');

async function listDepartments({ page = 1, limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT d.id, d.name,
       (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'active') AS employee_count,
       COUNT(*) OVER() AS total_count
     FROM departments d
     ORDER BY d.name
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { rows: rows.map(({ total_count, ...r }) => r), total };
}

async function createDepartment(name) {
  const { rows } = await pool.query(
    'INSERT INTO departments (name) VALUES ($1) RETURNING id, name',
    [name]
  );
  return { ...rows[0], employee_count: 0 };
}

async function updateDepartment(id, name) {
  const { rows } = await pool.query(
    'UPDATE departments SET name = $2 WHERE id = $1 RETURNING id, name',
    [id, name]
  );
  return rows[0] ?? null;
}

module.exports = { listDepartments, createDepartment, updateDepartment };
