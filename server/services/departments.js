const pool = require('../db/pool');

async function listDepartments() {
  const { rows } = await pool.query('SELECT id, name FROM departments ORDER BY name');
  return rows;
}

async function createDepartment(name) {
  const { rows } = await pool.query(
    'INSERT INTO departments (name) VALUES ($1) RETURNING id, name',
    [name]
  );
  return rows[0];
}

module.exports = { listDepartments, createDepartment };
