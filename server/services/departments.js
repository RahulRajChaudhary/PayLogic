const pool = require('../db/pool');

async function listDepartments() {
  const { rows } = await pool.query(
    `SELECT d.id, d.name,
       (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'active') AS employee_count
     FROM departments d
     ORDER BY d.name`
  );
  return rows;
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
