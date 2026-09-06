const pool = require('../db/pool');
const { getAttendanceReport } = require('./attendance');

const EMP_FILTER_SQL = `($1::int IS NULL OR e.department_id = $1) AND ($2::text IS NULL OR e.employee_type = $2)`;

async function getKpis({ departmentId, employeeType, periodStart, periodEnd }) {
  const params = [departmentId ?? null, employeeType ?? null, periodStart, periodEnd];

  const { rows: netRows } = await pool.query(
    `SELECT COALESCE(SUM(pl.amount), 0) AS total_net, COUNT(DISTINCT ps.employee_id) AS paid_employee_count
     FROM payslip_lines pl
     JOIN payslips ps ON ps.id = pl.payslip_id
     JOIN payruns pr ON pr.id = ps.payrun_id
     JOIN employees e ON e.id = ps.employee_id
     WHERE pl.category = 'net' AND ps.status = 'paid'
       AND pr.period_start <= $4 AND pr.period_end >= $3
       AND ${EMP_FILTER_SQL}`,
    params
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE ps.status = 'paid') AS paid,
            COUNT(*) FILTER (WHERE ps.status != 'paid') AS pending,
            COUNT(*) AS total
     FROM payslips ps
     JOIN payruns pr ON pr.id = ps.payrun_id
     JOIN employees e ON e.id = ps.employee_id
     WHERE pr.period_start <= $4 AND pr.period_end >= $3
       AND ${EMP_FILTER_SQL}`,
    params
  );

  const { rows: leaveRows } = await pool.query(
    `SELECT COALESCE(SUM(tr.duration), 0) AS approved_days
     FROM time_off_requests tr
     JOIN employees e ON e.id = tr.employee_id
     WHERE tr.status = 'approved' AND tr.start_date <= $4 AND tr.end_date >= $3
       AND ${EMP_FILTER_SQL}`,
    params
  );

  const attendance = await getAttendanceReport({ departmentId: departmentId ?? undefined, yearMonth: periodStart.slice(0, 7) });
  const { present, late } = attendance.summary;
  const attendanceHealthPct = present > 0 ? Math.round(((present - late) / present) * 1000) / 10 : 100;

  const totalNet = Number(netRows[0].total_net);
  const paidEmployeeCount = Number(netRows[0].paid_employee_count);

  return {
    totalNetSalaryPaid: totalNet,
    payslipsGenerated: {
      paid: Number(countRows[0].paid),
      pending: Number(countRows[0].pending),
      total: Number(countRows[0].total),
    },
    avgSalaryPerEmployee: paidEmployeeCount > 0 ? Math.round((totalNet / paidEmployeeCount) * 100) / 100 : 0,
    approvedTimeOffDays: Number(leaveRows[0].approved_days),
    attendanceHealthPct,
  };
}

async function getSalaryCostByDepartment({ departmentId, employeeType, periodStart, periodEnd }) {
  const params = [departmentId ?? null, employeeType ?? null, periodStart, periodEnd];
  const { rows } = await pool.query(
    `SELECT COALESCE(d.name, 'Unassigned') AS department, COALESCE(SUM(pl.amount), 0) AS cost
     FROM payslip_lines pl
     JOIN payslips ps ON ps.id = pl.payslip_id
     JOIN payruns pr ON pr.id = ps.payrun_id
     JOIN employees e ON e.id = ps.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE pl.category = 'gross' AND ps.status = 'paid'
       AND pr.period_start <= $4 AND pr.period_end >= $3
       AND ${EMP_FILTER_SQL}
     GROUP BY d.name
     ORDER BY cost DESC`,
    params
  );
  return rows.map((r) => ({ department: r.department, cost: Number(r.cost) }));
}

async function getMonthlyNetSalaryTrend({ departmentId, employeeType, periodEnd }) {
  const end = new Date(periodEnd);
  const rangeStart = new Date(end.getFullYear(), end.getMonth() - 5, 1).toISOString().slice(0, 10);
  const params = [departmentId ?? null, employeeType ?? null, rangeStart, periodEnd];
  const { rows } = await pool.query(
    `SELECT to_char(pr.period_start, 'YYYY-MM') AS month, COALESCE(SUM(pl.amount), 0) AS total_net
     FROM payslip_lines pl
     JOIN payslips ps ON ps.id = pl.payslip_id
     JOIN payruns pr ON pr.id = ps.payrun_id
     JOIN employees e ON e.id = ps.employee_id
     WHERE pl.category = 'net' AND ps.status = 'paid'
       AND pr.period_start >= $3 AND pr.period_start <= $4
       AND ${EMP_FILTER_SQL}
     GROUP BY month
     ORDER BY month`,
    params
  );
  return rows.map((r) => ({ month: r.month, totalNet: Number(r.total_net) }));
}

async function getPayrollAlerts({ departmentId, employeeType, periodStart, periodEnd }) {
  const params = [departmentId ?? null, employeeType ?? null, periodStart, periodEnd];

  const { rows: warningRows } = await pool.query(
    `SELECT unnest(ps.warnings) AS warning, COUNT(*) AS count
     FROM payslips ps
     JOIN payruns pr ON pr.id = ps.payrun_id
     JOIN employees e ON e.id = ps.employee_id
     WHERE array_length(ps.warnings, 1) > 0
       AND pr.period_start <= $4 AND pr.period_end >= $3
       AND ${EMP_FILTER_SQL}
     GROUP BY warning
     ORDER BY count DESC`,
    params
  );

  const { rows: draftRows } = await pool.query(
    `SELECT COUNT(*) AS count
     FROM payslips ps
     JOIN payruns pr ON pr.id = ps.payrun_id
     JOIN employees e ON e.id = ps.employee_id
     WHERE ps.status IN ('draft', 'computed')
       AND pr.period_start <= $4 AND pr.period_end >= $3
       AND ${EMP_FILTER_SQL}`,
    params
  );

  const { rows: expiringRows } = await pool.query(
    `SELECT COUNT(*) AS count
     FROM contracts c
     JOIN employees e ON e.id = c.employee_id
     WHERE c.status = 'active' AND c.end_date IS NOT NULL
       AND c.end_date >= CURRENT_DATE AND c.end_date <= CURRENT_DATE + INTERVAL '30 days'
       AND ($1::int IS NULL OR e.department_id = $1) AND ($2::text IS NULL OR e.employee_type = $2)`,
    [departmentId ?? null, employeeType ?? null]
  );

  return {
    warnings: warningRows.map((r) => ({ message: r.warning, count: Number(r.count) })),
    unvalidatedDrafts: Number(draftRows[0].count),
    contractsExpiringSoon: Number(expiringRows[0].count),
  };
}

async function getAttendanceOverview({ departmentId, periodStart }) {
  const { summary } = await getAttendanceReport({ departmentId: departmentId ?? undefined, yearMonth: periodStart.slice(0, 7) });
  const coveragePct = summary.present + summary.absent > 0
    ? Math.round((summary.present / (summary.present + summary.absent)) * 1000) / 10
    : 100;
  return { ...summary, coveragePct };
}

async function getTimeOffOverview({ departmentId, employeeType, periodStart, periodEnd }) {
  const params = [departmentId ?? null, employeeType ?? null, periodStart, periodEnd];
  const { rows } = await pool.query(
    `SELECT tot.name AS type,
       COALESCE(SUM(tr.duration) FILTER (WHERE tr.status = 'approved'), 0) AS approved_days,
       COUNT(*) FILTER (WHERE tr.status = 'pending') AS pending_count
     FROM time_off_types tot
     LEFT JOIN time_off_requests tr ON tr.type_id = tot.id
       AND tr.start_date <= $4 AND tr.end_date >= $3
     LEFT JOIN employees e ON e.id = tr.employee_id
     WHERE tr.id IS NULL OR (${EMP_FILTER_SQL})
     GROUP BY tot.name
     ORDER BY tot.name`,
    params
  );

  const balanceParams = [departmentId ?? null, employeeType ?? null];
  const { rows: balanceRows } = await pool.query(
    `SELECT tot.name AS type, COALESCE(SUM(a.allocated - a.taken), 0) AS remaining
     FROM time_off_types tot
     LEFT JOIN time_off_allocations a ON a.type_id = tot.id
     LEFT JOIN employees e ON e.id = a.employee_id
     WHERE a.id IS NULL OR (($1::int IS NULL OR e.department_id = $1) AND ($2::text IS NULL OR e.employee_type = $2))
     GROUP BY tot.name`,
    balanceParams
  );
  const remainingByType = Object.fromEntries(balanceRows.map((r) => [r.type, Number(r.remaining)]));

  return rows.map((r) => ({
    type: r.type,
    approvedDays: Number(r.approved_days),
    pending: Number(r.pending_count),
    remaining: remainingByType[r.type] ?? 0,
  }));
}

async function getDepartmentOverview({ employeeType, periodStart, periodEnd }) {
  const params = [employeeType ?? null, periodStart, periodEnd];
  const { rows } = await pool.query(
    `SELECT COALESCE(d.name, 'Unassigned') AS department,
       COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS headcount,
       COALESCE(SUM(pl.amount) FILTER (WHERE pl.category = 'net' AND ps.status = 'paid'), 0) AS monthly_salary
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN payslips ps ON ps.employee_id = e.id
     LEFT JOIN payruns pr ON pr.id = ps.payrun_id AND pr.period_start <= $3 AND pr.period_end >= $2
     LEFT JOIN payslip_lines pl ON pl.payslip_id = ps.id
     WHERE ($1::text IS NULL OR e.employee_type = $1)
     GROUP BY d.name
     ORDER BY d.name`,
    params
  );
  return rows.map((r) => ({
    department: r.department,
    headcount: Number(r.headcount),
    monthlySalary: Number(r.monthly_salary),
  }));
}

async function getDashboardSummary(filters) {
  const [kpis, salaryByDepartment, monthlyTrend, alerts, attendanceOverview, timeOffOverview, departmentOverview] =
    await Promise.all([
      getKpis(filters),
      getSalaryCostByDepartment(filters),
      getMonthlyNetSalaryTrend(filters),
      getPayrollAlerts(filters),
      getAttendanceOverview(filters),
      getTimeOffOverview(filters),
      getDepartmentOverview(filters),
    ]);
  return { kpis, salaryByDepartment, monthlyTrend, alerts, attendanceOverview, timeOffOverview, departmentOverview };
}

module.exports = { getDashboardSummary };
