const pool = require('../db/pool');
const { getApplicableContract } = require('./contracts');
const { computePayslip } = require('./payrollEngine');
const { getPayslip } = require('./payslips');
const { generatePayslipPdfBuffer } = require('./payslipPdf');
const { getTransporter, sendPayslipEmail } = require('./mailer');

const PAYRUN_SELECT = `
  SELECT p.id, p.name, p.structure_id, s.name AS structure_name,
         p.period_start, p.period_end, p.status, p.created_at,
    (SELECT COUNT(*) FROM payslips ps WHERE ps.payrun_id = p.id) AS payslip_count,
    (SELECT COUNT(*) FROM payslips ps WHERE ps.payrun_id = p.id AND array_length(ps.warnings, 1) > 0) AS warning_count
  FROM payruns p
  JOIN salary_structures s ON s.id = p.structure_id
`;

function notFound(message) {
  const err = new Error(message);
  err.code = 'NOT_FOUND';
  return err;
}
function immutable() {
  const err = new Error('This Payrun is paid and can no longer be changed');
  err.code = 'IMMUTABLE';
  return err;
}

async function listPayruns({ page = 1, limit = 20 } = {}) {
  const { rows } = await pool.query(
    `SELECT p.*, COUNT(*) OVER() AS total_count FROM (
       ${PAYRUN_SELECT}
     ) p
     ORDER BY p.period_start DESC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { rows: rows.map(({ total_count, ...r }) => r), total };
}

async function getPayrunRaw(id) {
  const { rows } = await pool.query('SELECT * FROM payruns WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function getPayrun(id) {
  const { rows } = await pool.query(`${PAYRUN_SELECT} WHERE p.id = $1`, [id]);
  if (!rows[0]) return null;
  const { rows: payslips } = await pool.query(
    `SELECT ps.id, ps.employee_id, e.name AS employee_name, ps.contract_id, ps.worked_days,
            ps.status, ps.warnings, ps.sent_at,
       (SELECT COALESCE(SUM(amount), 0) FROM payslip_lines pl WHERE pl.payslip_id = ps.id AND pl.category = 'basic') AS basic_amount,
       (SELECT COALESCE(SUM(amount), 0) FROM payslip_lines pl WHERE pl.payslip_id = ps.id AND pl.category = 'gross') AS gross_amount,
       (SELECT COALESCE(SUM(amount), 0) FROM payslip_lines pl WHERE pl.payslip_id = ps.id AND pl.category = 'net') AS net_amount
     FROM payslips ps
     JOIN employees e ON e.id = ps.employee_id
     WHERE ps.payrun_id = $1
     ORDER BY e.name`,
    [id]
  );
  return { ...rows[0], payslips };
}

async function getEligibleEmployees(structureId, periodStart, periodEnd) {
  const { rows } = await pool.query(
    `SELECT DISTINCT e.id, e.name, e.employee_code, c.wage, c.contract_code
     FROM employees e
     JOIN contracts c ON c.employee_id = e.id
     WHERE c.status = 'active' AND c.salary_structure_id = $1
       AND c.start_date <= $3 AND (c.end_date IS NULL OR c.end_date >= $2)
     ORDER BY e.name`,
    [structureId, periodStart, periodEnd]
  );
  return rows;
}

async function createPayrun({ name, structureId, periodStart, periodEnd, employeeIds }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO payruns (name, structure_id, period_start, period_end) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, structureId, periodStart, periodEnd]
    );
    const payrunId = rows[0].id;
    for (const employeeId of employeeIds) {
      await client.query(
        `INSERT INTO payslips (payrun_id, employee_id) VALUES ($1, $2)`,
        [payrunId, employeeId]
      );
    }
    await client.query('COMMIT');
    return getPayrun(payrunId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Recomputes every payslip in the Payrun. Safe to call more than once (e.g. after fixing
// a missing contract) as long as the Payrun isn't paid yet — each call fully replaces the
// previous computation's line items rather than appending to them.
async function computePayrun(id) {
  const payrun = await getPayrunRaw(id);
  if (!payrun) throw notFound('Payrun not found');
  if (payrun.status === 'paid') throw immutable();

  const { rows: rules } = await pool.query(
    'SELECT * FROM salary_rules WHERE structure_id = $1 ORDER BY sequence',
    [payrun.structure_id]
  );
  const { rows: payslips } = await pool.query('SELECT * FROM payslips WHERE payrun_id = $1', [id]);

  for (const payslip of payslips) {
    const warnings = [];
    let contract = null;
    try {
      contract = await getApplicableContract(payslip.employee_id, payrun.period_start, payrun.period_end);
    } catch (err) {
      warnings.push(
        err.code === 'NO_APPLICABLE_CONTRACT'
          ? 'No applicable contract for this period'
          : 'Multiple overlapping contracts found for this employee (data error)'
      );
    }

    // Duplicate check: another Payrun already covering this employee for an overlapping period.
    const { rows: dupes } = await pool.query(
      `SELECT p.id FROM payslips ps JOIN payruns p ON p.id = ps.payrun_id
       WHERE ps.employee_id = $1 AND ps.payrun_id != $2
         AND p.period_start <= $4 AND p.period_end >= $3`,
      [payslip.employee_id, id, payrun.period_start, payrun.period_end]
    );
    if (dupes.length > 0) {
      warnings.push('Duplicate payslip: another Payrun already covers this employee for an overlapping period');
    }

    const { rows: empRows } = await pool.query('SELECT bank_account FROM employees WHERE id = $1', [payslip.employee_id]);
    if (!empRows[0]?.bank_account) {
      warnings.push('Missing bank account details');
    }

    if (contract?.end_date) {
      const daysUntilExpiry = (new Date(contract.end_date) - new Date(payrun.period_end)) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
        warnings.push('Contract expiring within 30 days of this period');
      }
    }

    let lines = [];
    let workedDays = 0;
    if (contract) {
      const { rows: attRows } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM attendance
         WHERE employee_id = $1 AND check_in::date BETWEEN $2 AND $3 AND check_out IS NOT NULL`,
        [payslip.employee_id, payrun.period_start, payrun.period_end]
      );
      workedDays = attRows[0].count;
      lines = computePayslip(rules, contract, { workedDays });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM payslip_lines WHERE payslip_id = $1', [payslip.id]);
      for (const line of lines) {
        await client.query(
          `INSERT INTO payslip_lines (payslip_id, code, name, category, amount) VALUES ($1, $2, $3, $4, $5)`,
          [payslip.id, line.code, line.name, line.category, line.amount]
        );
      }
      await client.query(
        `UPDATE payslips SET contract_id = $2, worked_days = $3, status = 'computed', warnings = $4 WHERE id = $1`,
        [payslip.id, contract?.id ?? null, workedDays, warnings]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.query(`UPDATE payruns SET status = 'computed' WHERE id = $1`, [id]);
  return getPayrun(id);
}

async function validatePayrun(id) {
  const payrun = await getPayrunRaw(id);
  if (!payrun) throw notFound('Payrun not found');
  if (payrun.status === 'paid') throw immutable();
  if (payrun.status === 'draft') {
    const err = new Error('Compute this Payrun before validating it');
    err.code = 'NOT_COMPUTED';
    throw err;
  }
  if (payrun.status === 'validated') {
    const err = new Error('This Payrun is already validated');
    err.code = 'ALREADY_VALIDATED';
    throw err;
  }
  const { rows: missingContract } = await pool.query(
    'SELECT id FROM payslips WHERE payrun_id = $1 AND contract_id IS NULL',
    [id]
  );
  if (missingContract.length > 0) {
    const err = new Error(`${missingContract.length} payslip(s) have no applicable contract and cannot be validated`);
    err.code = 'BLOCKING_WARNINGS';
    throw err;
  }
  await pool.query(`UPDATE payruns SET status = 'validated' WHERE id = $1`, [id]);
  await pool.query(`UPDATE payslips SET status = 'validated' WHERE payrun_id = $1`, [id]);
  return getPayrun(id);
}

async function markPaid(id) {
  const payrun = await getPayrunRaw(id);
  if (!payrun) throw notFound('Payrun not found');
  if (payrun.status === 'paid') throw immutable();
  if (payrun.status !== 'validated') {
    const err = new Error('Validate this Payrun before marking it paid');
    err.code = 'NOT_VALIDATED';
    throw err;
  }
  await pool.query(`UPDATE payruns SET status = 'paid' WHERE id = $1`, [id]);
  await pool.query(`UPDATE payslips SET status = 'paid' WHERE payrun_id = $1`, [id]);
  return getPayrun(id);
}

// Emails every Payslip in the Payrun as a PDF attachment. Per-payslip failures (no work
// email on file, SMTP rejection) are collected rather than aborting the whole batch, so
// one bad address doesn't block everyone else's payslip from going out.
async function sendPayslips(id) {
  const payrun = await getPayrunRaw(id);
  if (!payrun) throw notFound('Payrun not found');
  if (!['validated', 'paid'].includes(payrun.status)) {
    const err = new Error('Validate this Payrun before sending payslips');
    err.code = 'NOT_VALIDATED';
    throw err;
  }

  // Fail loudly up front if SMTP isn't configured, instead of silently recording the
  // same "not configured" error N times, one per payslip.
  const transporter = getTransporter();

  const { rows: payslipRows } = await pool.query('SELECT id FROM payslips WHERE payrun_id = $1', [id]);
  const results = [];
  for (const { id: payslipId } of payslipRows) {
    const payslip = await getPayslip(payslipId);
    if (!payslip.work_email) {
      results.push({ payslipId, employeeName: payslip.employee_name, sent: false, error: 'No work email on file' });
      continue;
    }
    try {
      const pdfBuffer = await generatePayslipPdfBuffer(payslip);
      await sendPayslipEmail(transporter, {
        to: payslip.work_email,
        employeeName: payslip.employee_name,
        periodLabel: `${payslip.period_start} to ${payslip.period_end}`,
        pdfBuffer,
      });
      await pool.query('UPDATE payslips SET sent_at = now() WHERE id = $1', [payslipId]);
      results.push({ payslipId, employeeName: payslip.employee_name, sent: true });
    } catch (err) {
      results.push({ payslipId, employeeName: payslip.employee_name, sent: false, error: err.message });
    }
  }
  return { payrun: await getPayrun(id), results };
}

module.exports = {
  listPayruns,
  getPayrun,
  getPayrunRaw,
  getEligibleEmployees,
  createPayrun,
  computePayrun,
  validatePayrun,
  markPaid,
  sendPayslips,
};
