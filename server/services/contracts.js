const pool = require('../db/pool');

// Joined to employees so list views can show Employee Name + Type of Contract without a
// second round-trip — "type of contract" reuses the employee's existing employee_type
// field rather than duplicating it as a separate column on contracts.
const CONTRACT_SELECT = `
  SELECT c.id, c.contract_code, c.employee_id, e.name AS employee_name, e.employee_type,
         c.start_date, c.end_date, c.wage, c.salary_structure_id, s.name AS salary_structure_name,
         c.department_id, d.name AS department_name, c.job_position,
         c.status, c.created_at
  FROM contracts c
  JOIN employees e ON e.id = c.employee_id
  LEFT JOIN salary_structures s ON s.id = c.salary_structure_id
  LEFT JOIN departments d ON d.id = c.department_id
`;

async function listContracts({ employeeId, status } = {}) {
  const conditions = [];
  const params = [];
  if (employeeId) { params.push(employeeId); conditions.push(`c.employee_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`c.status = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(`${CONTRACT_SELECT} ${where} ORDER BY c.start_date DESC`, params);
  return rows;
}

async function getContract(id) {
  const { rows } = await pool.query(`${CONTRACT_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ?? null;
}

// excludeId: pass the contract's own id on update so it doesn't collide with itself.
async function assertNoOverlap(client, employeeId, startDate, endDate, excludeId) {
  const { rows } = await client.query(
    `SELECT id FROM contracts
     WHERE employee_id = $1 AND status = 'active'
       AND ($3::date IS NULL OR start_date <= $3)
       AND (end_date IS NULL OR end_date >= $2)
       AND id != COALESCE($4, -1)`,
    [employeeId, startDate, endDate ?? null, excludeId ?? null]
  );
  if (rows.length > 0) {
    const err = new Error('An active contract already exists for this employee in the given date range');
    err.code = 'OVERLAP';
    throw err;
  }
}

async function createContract(employeeId, { start_date, end_date, wage, salary_structure_id, department_id, job_position, status }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resolvedStatus = status ?? 'active';
    if (resolvedStatus === 'active') {
      await assertNoOverlap(client, employeeId, start_date, end_date ?? null, null);
    }
    const { rows } = await client.query(
      `INSERT INTO contracts (employee_id, start_date, end_date, wage, salary_structure_id, department_id, job_position, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [employeeId, start_date, end_date ?? null, wage, salary_structure_id ?? null, department_id ?? null, job_position ?? null, resolvedStatus]
    );
    await client.query('COMMIT');
    return getContract(rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateContract(id, { start_date, end_date, wage, salary_structure_id, department_id, job_position, status }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query('SELECT employee_id FROM contracts WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const employeeId = existingRows[0].employee_id;
    const resolvedStatus = status ?? 'active';
    if (resolvedStatus === 'active') {
      await assertNoOverlap(client, employeeId, start_date, end_date ?? null, id);
    }
    await client.query(
      `UPDATE contracts SET start_date = $2, end_date = $3, wage = $4, salary_structure_id = $5,
              department_id = $6, job_position = $7, status = $8
       WHERE id = $1`,
      [id, start_date, end_date ?? null, wage, salary_structure_id ?? null, department_id ?? null, job_position ?? null, resolvedStatus]
    );
    await client.query('COMMIT');
    return getContract(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Payroll-side lookup for later Payrun use. Hard invariant: 0 rows = no coverage,
// >1 rows = the overlap guard was bypassed somewhere (data bug, not a UI concern).
async function getApplicableContract(employeeId, periodStart, periodEnd) {
  const { rows } = await pool.query(
    `SELECT id, employee_id, start_date, end_date, wage, status, created_at
     FROM contracts
     WHERE employee_id = $1 AND status = 'active'
       AND start_date <= $3 AND (end_date IS NULL OR end_date >= $2)`,
    [employeeId, periodStart, periodEnd]
  );
  if (rows.length === 0) {
    const err = new Error('No applicable contract found for this employee in the given period');
    err.code = 'NO_APPLICABLE_CONTRACT';
    throw err;
  }
  if (rows.length > 1) {
    const err = new Error('Multiple applicable contracts found for this employee in the given period');
    err.code = 'AMBIGUOUS_CONTRACT';
    throw err;
  }
  return rows[0];
}

module.exports = { listContracts, getContract, createContract, updateContract, getApplicableContract };
