const pool = require('../db/pool');

async function listPayslips({ employeeId, payrunId, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (employeeId) { params.push(employeeId); conditions.push(`ps.employee_id = $${params.length}`); }
  if (payrunId) { params.push(payrunId); conditions.push(`ps.payrun_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`ps.status = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(
    `SELECT sub.*, COUNT(*) OVER() AS total_count FROM (
       SELECT ps.id, ps.payrun_id, pr.name AS payrun_name, pr.period_start, pr.period_end,
              ps.employee_id, e.name AS employee_name, ps.contract_id, ps.worked_days,
              ps.status, ps.warnings, ps.sent_at, s.name AS structure_name,
         (SELECT COALESCE(SUM(amount), 0) FROM payslip_lines pl WHERE pl.payslip_id = ps.id AND pl.category = 'basic') AS basic_amount,
         (SELECT COALESCE(SUM(amount), 0) FROM payslip_lines pl WHERE pl.payslip_id = ps.id AND pl.category = 'gross') AS gross_amount,
         (SELECT COALESCE(SUM(amount), 0) FROM payslip_lines pl WHERE pl.payslip_id = ps.id AND pl.category = 'net') AS net_amount
       FROM payslips ps
       JOIN payruns pr ON pr.id = ps.payrun_id
       JOIN employees e ON e.id = ps.employee_id
       JOIN salary_structures s ON s.id = pr.structure_id
       ${where}
     ) sub
     ORDER BY sub.period_start DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { rows: rows.map(({ total_count, ...r }) => r), total };
}

async function getPayslip(id) {
  const { rows } = await pool.query(
    `SELECT ps.id, ps.payrun_id, pr.name AS payrun_name, pr.period_start, pr.period_end,
            ps.employee_id, e.name AS employee_name, e.employee_code, e.work_email,
            ps.contract_id, ps.worked_days, ps.status, ps.warnings, ps.sent_at,
            s.name AS structure_name
     FROM payslips ps
     JOIN payruns pr ON pr.id = ps.payrun_id
     JOIN employees e ON e.id = ps.employee_id
     JOIN salary_structures s ON s.id = pr.structure_id
     WHERE ps.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const { rows: lines } = await pool.query(
    'SELECT id, code, name, category, amount FROM payslip_lines WHERE payslip_id = $1 ORDER BY id',
    [id]
  );
  return { ...rows[0], lines };
}

module.exports = { listPayslips, getPayslip };
