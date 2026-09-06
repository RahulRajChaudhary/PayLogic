const pool = require('../db/pool');

// Weekly hours are computed on read, never stored: for each line,
// (end - start) minus break, summed across the week.
// $1 IS NULL → list all; otherwise filter to one schedule. Weekly hours computed on read.
const SCHEDULE_SELECT = `
  SELECT s.id, s.name,
    COUNT(l.id) AS day_count,
    COALESCE(ROUND(SUM(
      EXTRACT(EPOCH FROM (l.end_time - l.start_time)) / 3600 - l.break_minutes / 60.0
    )::numeric, 2), 0) AS weekly_hours
  FROM working_schedules s
  LEFT JOIN schedule_lines l ON l.schedule_id = s.id
  WHERE ($1::int IS NULL OR s.id = $1)
  GROUP BY s.id
  ORDER BY s.name
`;

async function listSchedules() {
  const { rows } = await pool.query(SCHEDULE_SELECT, [null]);
  return rows;
}

async function getSchedule(id) {
  const { rows } = await pool.query(SCHEDULE_SELECT, [id]);
  if (!rows[0]) return null;
  const { rows: lines } = await pool.query(
    `SELECT id, day, start_time, end_time, break_minutes
     FROM schedule_lines WHERE schedule_id = $1 ORDER BY id`,
    [id]
  );
  return { ...rows[0], lines };
}

async function insertLines(client, scheduleId, lines) {
  for (const line of lines ?? []) {
    await client.query(
      `INSERT INTO schedule_lines (schedule_id, day, start_time, end_time, break_minutes)
       VALUES ($1, $2, $3, $4, $5)`,
      [scheduleId, line.day, line.start_time, line.end_time, line.break_minutes ?? 0]
    );
  }
}

async function createSchedule({ name, lines }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO working_schedules (name) VALUES ($1) RETURNING id', [name]);
    await insertLines(client, rows[0].id, lines);
    await client.query('COMMIT');
    return getSchedule(rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateSchedule(id, { name, lines }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query('UPDATE working_schedules SET name = $2 WHERE id = $1', [id, name]);
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('DELETE FROM schedule_lines WHERE schedule_id = $1', [id]);
    await insertLines(client, id, lines);
    await client.query('COMMIT');
    return getSchedule(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listSchedules, getSchedule, createSchedule, updateSchedule };
