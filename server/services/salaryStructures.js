const pool = require('../db/pool');

const STRUCTURE_SELECT = `
  SELECT s.id, s.name, s.created_at,
    (SELECT COUNT(*) FROM salary_rules r WHERE r.structure_id = s.id) AS rule_count,
    (SELECT COUNT(DISTINCT c.employee_id) FROM contracts c
       WHERE c.salary_structure_id = s.id AND c.status = 'active') AS employee_count
  FROM salary_structures s
`;

async function listStructures() {
  const { rows } = await pool.query(`${STRUCTURE_SELECT} ORDER BY s.name`);
  return rows;
}

async function getStructure(id) {
  const { rows } = await pool.query(`${STRUCTURE_SELECT} WHERE s.id = $1`, [id]);
  if (!rows[0]) return null;
  const { rows: rules } = await pool.query(
    `SELECT id, structure_id, name, code, category, sequence, computation_method,
            amount, percentage, percentage_of_code, formula
     FROM salary_rules WHERE structure_id = $1 ORDER BY sequence`,
    [id]
  );
  return { ...rows[0], rules };
}

async function createStructure(name) {
  const { rows } = await pool.query(
    `INSERT INTO salary_structures (name) VALUES ($1) RETURNING id, name, created_at`,
    [name]
  );
  return { ...rows[0], rule_count: 0, employee_count: 0 };
}

async function updateStructure(id, name) {
  const { rows } = await pool.query(
    `UPDATE salary_structures SET name = $2 WHERE id = $1 RETURNING id, name, created_at`,
    [id, name]
  );
  return rows[0] ?? null;
}

module.exports = { listStructures, getStructure, createStructure, updateStructure };
