const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const {
  employeeSchema,
  listEmployees,
  getEmployee,
  getEmployeeByUserId,
  createEmployee,
  updateEmployee,
} = require('../services/employees');

const router = express.Router();
const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate);

// Self-service: any logged-in role can see their own record, no HR-role gate.
router.get('/me', async (req, res) => {
  const employee = await getEmployeeByUserId(req.user.id);
  if (!employee) {
    return res.status(404).json({ error: 'No employee record linked to this account' });
  }
  res.json(employee);
});

router.use(requireRole(HR_ROLES));

router.get('/', async (req, res) => {
  res.json(await listEmployees({ status: req.query.status, search: req.query.search }));
});

router.get('/:id', async (req, res) => {
  const employee = await getEmployee(req.params.id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(employee);
});

router.post('/', async (req, res) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const employee = await createEmployee(parsed.data);
  res.status(201).json(employee);
});

router.put('/:id', async (req, res) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  if (parsed.data.manager_id === Number(req.params.id)) {
    return res.status(400).json({ error: 'An employee cannot be their own manager' });
  }
  const employee = await updateEmployee(req.params.id, parsed.data);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(employee);
});

module.exports = router;
