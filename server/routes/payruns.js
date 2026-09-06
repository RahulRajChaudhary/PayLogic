const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const {
  listPayruns, getPayrun, getEligibleEmployees, createPayrun,
  computePayrun, validatePayrun, markPaid, sendPayslips,
} = require('../services/payruns');

const router = express.Router();
const PAYROLL_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate, requireRole(PAYROLL_ROLES));

router.get('/', async (req, res) => {
  res.json(await listPayruns());
});

// Must come before /:id or Express would treat "eligible-employees" as an :id.
router.get('/eligible-employees', async (req, res) => {
  const { structure_id, period_start, period_end } = req.query;
  if (!structure_id || !period_start || !period_end) {
    return res.status(400).json({ error: 'structure_id, period_start, and period_end are required' });
  }
  res.json(await getEligibleEmployees(structure_id, period_start, period_end));
});

router.get('/:id', async (req, res) => {
  const payrun = await getPayrun(req.params.id);
  if (!payrun) return res.status(404).json({ error: 'Payrun not found' });
  res.json(payrun);
});

router.post('/', async (req, res) => {
  const { name, structure_id, period_start, period_end, employee_ids } = req.body;
  if (!name || !structure_id || !period_start || !period_end || !Array.isArray(employee_ids) || employee_ids.length === 0) {
    return res.status(400).json({ error: 'name, structure_id, period_start, period_end, and at least one employee are required' });
  }
  const payrun = await createPayrun({
    name, structureId: structure_id, periodStart: period_start, periodEnd: period_end, employeeIds: employee_ids,
  });
  res.status(201).json(payrun);
});

function handleStateError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
  if (['IMMUTABLE', 'NOT_COMPUTED', 'ALREADY_VALIDATED', 'BLOCKING_WARNINGS', 'NOT_VALIDATED'].includes(err.code)) {
    return res.status(409).json({ error: err.message });
  }
  if (err.code === 'EMAIL_NOT_CONFIGURED') return res.status(503).json({ error: err.message });
  throw err;
}

router.post('/:id/compute', async (req, res) => {
  try {
    res.json(await computePayrun(req.params.id));
  } catch (err) {
    handleStateError(err, res);
  }
});

router.post('/:id/validate', async (req, res) => {
  try {
    res.json(await validatePayrun(req.params.id));
  } catch (err) {
    handleStateError(err, res);
  }
});

router.post('/:id/mark-paid', async (req, res) => {
  try {
    res.json(await markPaid(req.params.id));
  } catch (err) {
    handleStateError(err, res);
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    res.json(await sendPayslips(req.params.id));
  } catch (err) {
    handleStateError(err, res);
  }
});

module.exports = router;
