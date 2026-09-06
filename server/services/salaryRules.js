const pool = require('../db/pool');

const RULE_SELECT = `
  SELECT r.id, r.structure_id, s.name AS structure_name, r.name, r.code, r.category,
         r.sequence, r.computation_method, r.amount, r.percentage, r.percentage_of_code,
         r.formula
  FROM salary_rules r
  JOIN salary_structures s ON s.id = r.structure_id
`;

async function listRules({ structureId, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (structureId) { params.push(structureId); conditions.push(`r.structure_id = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(
    `SELECT r.*, COUNT(*) OVER() AS total_count FROM (
       ${RULE_SELECT} ${where}
     ) r
     ORDER BY r.structure_name, r.sequence
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { rows: rows.map(({ total_count, ...r }) => r), total };
}

async function createRule({ structure_id, name, code, category, sequence, computation_method,
  amount, percentage, percentage_of_code, formula }) {
  const { rows } = await pool.query(
    `INSERT INTO salary_rules
       (structure_id, name, code, category, sequence, computation_method, amount, percentage, percentage_of_code, formula)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [structure_id, name, code, category, sequence, computation_method,
      amount ?? null, percentage ?? null, percentage_of_code ?? null, formula ?? null]
  );
  return rows[0];
}

async function updateRule(id, { name, code, category, sequence, computation_method,
  amount, percentage, percentage_of_code, formula }) {
  const { rows } = await pool.query(
    `UPDATE salary_rules
     SET name=$2, code=$3, category=$4, sequence=$5, computation_method=$6,
         amount=$7, percentage=$8, percentage_of_code=$9, formula=$10
     WHERE id = $1 RETURNING *`,
    [id, name, code, category, sequence, computation_method,
      amount ?? null, percentage ?? null, percentage_of_code ?? null, formula ?? null]
  );
  return rows[0] ?? null;
}

module.exports = { listRules, createRule, updateRule };
