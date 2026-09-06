const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getDashboardSummary } = require('../services/dashboard');

const router = express.Router();

const PAYROLL_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate, requireRole(PAYROLL_ROLES));

router.get('/summary', async (req, res) => {
  const { period_start, period_end, department_id, employee_type } = req.query;
  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'period_start and period_end are required' });
  }
  res.json(await getDashboardSummary({
    periodStart: period_start,
    periodEnd: period_end,
    departmentId: department_id || null,
    employeeType: employee_type || null,
  }));
});

module.exports = router;
