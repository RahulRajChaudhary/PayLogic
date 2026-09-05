const pool = require('../db/pool');

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthBounds(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  return { start, end };
}

function dayBounds(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return { start: d, end: d };
}

async function checkIn(employeeId) {
  const { rows } = await pool.query(
    `INSERT INTO attendance (employee_id, check_in, is_late)
     SELECT $1, now(), now()::time > expected_start_time
     FROM employees WHERE id = $1
     RETURNING *`,
    [employeeId]
  );
  return rows[0];
}

async function checkOut(employeeId) {
  const { rows } = await pool.query(
    `UPDATE attendance a
     SET check_out = now(),
         worked_hours = ROUND(EXTRACT(EPOCH FROM (now() - a.check_in)) / 3600, 2),
         is_overtime = EXTRACT(EPOCH FROM (now() - a.check_in)) / 3600
           > EXTRACT(EPOCH FROM (e.expected_end_time - e.expected_start_time)) / 3600
     FROM employees e
     WHERE a.employee_id = $1 AND a.check_out IS NULL AND e.id = a.employee_id
     RETURNING a.*`,
    [employeeId]
  );
  if (rows.length === 0) {
    const err = new Error('Not currently checked in');
    err.code = 'NOT_CHECKED_IN';
    throw err;
  }
  return rows[0];
}

async function updateAttendance(id, { check_in, check_out }) {
  const { rows } = await pool.query(
    `UPDATE attendance a
     SET check_in = $2::timestamp,
         check_out = $3::timestamp,
         worked_hours = CASE WHEN $3::timestamp IS NULL THEN NULL
           ELSE ROUND(EXTRACT(EPOCH FROM ($3::timestamp - $2::timestamp)) / 3600, 2) END,
         is_late = $2::timestamp::time > e.expected_start_time,
         is_overtime = CASE WHEN $3::timestamp IS NULL THEN FALSE
           ELSE EXTRACT(EPOCH FROM ($3::timestamp - $2::timestamp)) / 3600
             > EXTRACT(EPOCH FROM (e.expected_end_time - e.expected_start_time)) / 3600
           END
     FROM employees e
     WHERE a.id = $1 AND e.id = a.employee_id
     RETURNING a.*`,
    [id, check_in, check_out ?? null]
  );
  return rows[0] ?? null;
}

// Shared by getMonthlyAttendance (one employee) and getAttendanceReport (many employees):
// maps raw attendance rows for ONE employee into display records and fills in synthetic
// 'absent' rows for weekdays with no punch, gated by that employee's own createdAt so a
// mid-month hire never shows absent for days before they existed.
function buildEmployeeRecords({ createdAt, monthRows, start, end, today, todayKey }) {
  const records = monthRows.map((r) => {
    const recordDate = dateKey(new Date(r.check_in));
    let status;
    if (r.check_out) status = 'present';
    else if (recordDate === todayKey) status = 'checked_in';
    else status = 'missing_checkout';
    return {
      id: r.id,
      date: recordDate,
      check_in: r.check_in,
      check_out: r.check_out,
      worked_hours: r.worked_hours,
      is_late: r.is_late,
      is_overtime: r.is_overtime,
      status,
    };
  });

  const recordedDates = new Set(records.map((r) => r.date));
  const absenceStart = createdAt > start ? createdAt : start;

  for (
    let d = new Date(absenceStart.getFullYear(), absenceStart.getMonth(), absenceStart.getDate());
    d < today && d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) continue;
    const key = dateKey(d);
    if (!recordedDates.has(key)) {
      records.push({
        date: key,
        check_in: null,
        check_out: null,
        worked_hours: null,
        is_late: false,
        is_overtime: false,
        status: 'absent',
      });
    }
  }

  return records;
}

function summarize(records) {
  return records.reduce(
    (acc, r) => {
      if (r.status === 'absent') acc.absent += 1;
      else if (r.status === 'missing_checkout') acc.missingCheckout += 1;
      else if (r.status === 'present') {
        acc.present += 1;
        if (r.is_late) acc.late += 1;
        if (r.is_overtime) acc.overtime += 1;
      }
      return acc;
    },
    { present: 0, late: 0, overtime: 0, absent: 0, missingCheckout: 0 }
  );
}

async function getMonthlyAttendance(employeeId, yearMonth) {
  const { start, end } = monthBounds(yearMonth);
  const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

  const { rows: empRows } = await pool.query(
    'SELECT created_at FROM employees WHERE id = $1',
    [employeeId]
  );
  if (empRows.length === 0) return null;
  const employeeCreatedAt = new Date(empRows[0].created_at);

  const { rows: monthRows } = await pool.query(
    `SELECT id, check_in, check_out, worked_hours, is_late, is_overtime
     FROM attendance
     WHERE employee_id = $1 AND check_in >= $2 AND check_in < $3
     ORDER BY check_in`,
    [employeeId, start, rangeEnd]
  );

  const { rows: openRows } = await pool.query(
    'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND check_out IS NULL',
    [employeeId]
  );
  const openRecord = openRows[0] ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  const records = buildEmployeeRecords({
    createdAt: employeeCreatedAt,
    monthRows,
    start,
    end,
    today,
    todayKey,
  });
  records.sort((a, b) => a.date.localeCompare(b.date));

  return { records, summary: summarize(records), openRecord };
}

// HR-facing report across one or many employees, optionally filtered by employeeId and/or
// departmentId, scoped to either a single day (date) or a whole month (yearMonth) — date
// takes precedence when both are given. Exactly 2 queries total regardless of employee count
// (no N+1): one to fetch the matching employees, one to fetch all their attendance rows for
// the range in bulk. The per-employee absence-fill loop still runs once per employee in
// memory so each employee's own createdAt is respected.
async function getAttendanceReport({ employeeId, departmentId, yearMonth, date }) {
  const { start, end } = date ? dayBounds(date) : monthBounds(yearMonth);
  const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

  const conditions = [];
  const params = [];
  if (employeeId) {
    params.push(employeeId);
    conditions.push(`e.id = $${params.length}`);
  }
  if (departmentId) {
    params.push(departmentId);
    conditions.push(`e.department_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: employeeRows } = await pool.query(
    `SELECT e.id, e.name, e.created_at, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     ${where}
     ORDER BY e.name`,
    params
  );

  const emptySummary = { present: 0, late: 0, overtime: 0, absent: 0, missingCheckout: 0 };
  if (employeeRows.length === 0) return { records: [], summary: emptySummary };

  const employeeIds = employeeRows.map((e) => e.id);
  const { rows: monthRows } = await pool.query(
    `SELECT id, employee_id, check_in, check_out, worked_hours, is_late, is_overtime
     FROM attendance
     WHERE employee_id = ANY($1::int[]) AND check_in >= $2 AND check_in < $3
     ORDER BY check_in`,
    [employeeIds, start, rangeEnd]
  );

  const rowsByEmployee = new Map();
  for (const row of monthRows) {
    if (!rowsByEmployee.has(row.employee_id)) rowsByEmployee.set(row.employee_id, []);
    rowsByEmployee.get(row.employee_id).push(row);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  const records = [];
  for (const emp of employeeRows) {
    const empRecords = buildEmployeeRecords({
      createdAt: new Date(emp.created_at),
      monthRows: rowsByEmployee.get(emp.id) ?? [],
      start,
      end,
      today,
      todayKey,
    });
    for (const r of empRecords) {
      records.push({
        ...r,
        employee_id: emp.id,
        employee_name: emp.name,
        department_name: emp.department_name,
      });
    }
  }

  records.sort((a, b) => a.date.localeCompare(b.date) || a.employee_name.localeCompare(b.employee_name));

  return { records, summary: summarize(records) };
}

module.exports = { checkIn, checkOut, updateAttendance, getMonthlyAttendance, getAttendanceReport };
