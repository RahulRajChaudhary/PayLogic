const pool = require('../db/pool');

const DEFAULT_ALLOCATIONS = {
  'Annual Leave': 20,
  'Sick Leave': 10,
  'Casual Leave': 7,
};

async function listTypes() {
  const { rows } = await pool.query(
    'SELECT id, name, requires_allocation FROM time_off_types ORDER BY id'
  );
  return rows;
}

async function ensureDefaultAllocations(client, employeeId) {
  const { rows: types } = await client.query('SELECT id, name FROM time_off_types');
  for (const type of types) {
    const allocated = DEFAULT_ALLOCATIONS[type.name] ?? 0;
    await client.query(
      `INSERT INTO time_off_allocations (employee_id, type_id, allocated)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, type_id) DO NOTHING`,
      [employeeId, type.id, allocated]
    );
  }
}

async function getAllocations(employeeId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.type_id, t.name AS type_name, a.allocated, a.taken,
            (a.allocated - a.taken) AS remaining
     FROM time_off_allocations a
     JOIN time_off_types t ON t.id = a.type_id
     WHERE a.employee_id = $1
     ORDER BY t.id`,
    [employeeId]
  );
  return rows;
}

function daysInclusive(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end - start) / (24 * 3600 * 1000)) + 1;
}

async function hasOverlap(client, employeeId, startDate, endDate) {
  const { rows } = await client.query(
    `SELECT id FROM time_off_requests
     WHERE employee_id = $1 AND status IN ('pending', 'approved')
       AND start_date <= $3 AND end_date >= $2`,
    [employeeId, startDate, endDate]
  );
  return rows.length > 0;
}

async function createRequest(employeeId, { type_id, start_date, end_date, reason }) {
  if (new Date(start_date) > new Date(end_date)) {
    const err = new Error('start_date must be before or equal to end_date');
    err.code = 'INVALID_RANGE';
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (await hasOverlap(client, employeeId, start_date, end_date)) {
      const err = new Error('Overlaps an existing pending or approved request');
      err.code = 'OVERLAP';
      throw err;
    }

    const { rows: typeRows } = await client.query(
      'SELECT requires_allocation FROM time_off_types WHERE id = $1',
      [type_id]
    );
    if (typeRows.length === 0) {
      const err = new Error('Unknown time off type');
      err.code = 'UNKNOWN_TYPE';
      throw err;
    }

    const duration = daysInclusive(start_date, end_date);

    if (typeRows[0].requires_allocation) {
      const { rows: allocRows } = await client.query(
        'SELECT allocated, taken FROM time_off_allocations WHERE employee_id = $1 AND type_id = $2',
        [employeeId, type_id]
      );
      const allocation = allocRows[0];
      if (!allocation || Number(allocation.allocated) - Number(allocation.taken) < duration) {
        const err = new Error('Insufficient leave balance');
        err.code = 'INSUFFICIENT_BALANCE';
        throw err;
      }
    }

    const { rows } = await client.query(
      `INSERT INTO time_off_requests (employee_id, type_id, start_date, end_date, duration, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [employeeId, type_id, start_date, end_date, duration, reason ?? null]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listRequests({ employeeId, status } = {}) {
  const conditions = [];
  const params = [];
  if (employeeId) {
    params.push(employeeId);
    conditions.push(`r.employee_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT r.id, r.employee_id, e.name AS employee_name, r.type_id, t.name AS type_name,
            r.start_date, r.end_date, r.duration, r.reason, r.status, r.created_at
     FROM time_off_requests r
     JOIN employees e ON e.id = r.employee_id
     JOIN time_off_types t ON t.id = r.type_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  return rows;
}

async function cancelRequest(id, employeeId) {
  const { rows } = await pool.query(
    `UPDATE time_off_requests
     SET status = 'cancelled'
     WHERE id = $1 AND employee_id = $2 AND status = 'pending'
     RETURNING *`,
    [id, employeeId]
  );
  return rows[0] ?? null;
}

async function approveRequest(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: reqRows } = await client.query(
      `SELECT r.*, t.requires_allocation
       FROM time_off_requests r JOIN time_off_types t ON t.id = r.type_id
       WHERE r.id = $1 AND r.status = 'pending'
       FOR UPDATE`,
      [id]
    );
    if (reqRows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const request = reqRows[0];

    if (request.requires_allocation) {
      const { rows: allocRows } = await client.query(
        `UPDATE time_off_allocations
         SET taken = taken + $3
         WHERE employee_id = $1 AND type_id = $2 AND (taken + $3) <= allocated
         RETURNING *`,
        [request.employee_id, request.type_id, request.duration]
      );
      if (allocRows.length === 0) {
        await client.query('ROLLBACK');
        const err = new Error('Approving this request would exceed the allocated balance');
        err.code = 'INSUFFICIENT_BALANCE';
        throw err;
      }
    }

    const { rows } = await client.query(
      `UPDATE time_off_requests SET status = 'approved' WHERE id = $1 RETURNING *`,
      [id]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function refuseRequest(id) {
  const { rows } = await pool.query(
    `UPDATE time_off_requests SET status = 'refused' WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id]
  );
  return rows[0] ?? null;
}

module.exports = {
  listTypes,
  ensureDefaultAllocations,
  getAllocations,
  createRequest,
  listRequests,
  cancelRequest,
  approveRequest,
  refuseRequest,
};
