const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getEmployeeByUserId } = require('../services/employees');
const {
  checkIn,
  checkOut,
  getMonthlyAttendance,
  getAttendanceReport,
  updateAttendance,
} = require('../services/attendance');

const router = express.Router();
const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate);

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function resolveOwnEmployeeId(req, res) {
  const employee = await getEmployeeByUserId(req.user.id);
  if (!employee) {
    res.status(404).json({ error: 'No employee record linked to this account' });
    return null;
  }
  return employee.id;
}

router.post('/check-in', async (req, res) => {
  const employeeId = await resolveOwnEmployeeId(req, res);
  if (employeeId === null) return;
  try {
    const record = await checkIn(employeeId);
    res.status(201).json(record);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already checked in' });
    }
    throw err;
  }
});

router.post('/check-out', async (req, res) => {
  const employeeId = await resolveOwnEmployeeId(req, res);
  if (employeeId === null) return;
  try {
    const record = await checkOut(employeeId);
    res.json(record);
  } catch (err) {
    if (err.code === 'NOT_CHECKED_IN') {
      return res.status(409).json({ error: 'Not currently checked in' });
    }
    throw err;
  }
});

router.get('/me', async (req, res) => {
  const employeeId = await resolveOwnEmployeeId(req, res);
  if (employeeId === null) return;
  const month = req.query.month || currentYearMonth();
  res.json(await getMonthlyAttendance(employeeId, month));
});

router.use(requireRole(HR_ROLES));

router.get('/', async (req, res) => {
  const employeeId = req.query.employee_id ? Number(req.query.employee_id) : undefined;
  const departmentId = req.query.department_id ? Number(req.query.department_id) : undefined;
  const date = req.query.date || undefined;
  const month = date ? undefined : req.query.month || currentYearMonth();
  res.json(await getAttendanceReport({ employeeId, departmentId, yearMonth: month, date }));
});

router.put('/:id', async (req, res) => {
  const { check_in, check_out } = req.body;
  if (!check_in) {
    return res.status(400).json({ error: 'check_in is required' });
  }
  const record = await updateAttendance(req.params.id, { check_in, check_out: check_out ?? null });
  if (!record) {
    return res.status(404).json({ error: 'Attendance record not found' });
  }
  res.json(record);
});

module.exports = router;
