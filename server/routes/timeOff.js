const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getEmployeeByUserId } = require('../services/employees');
const {
  listTypes,
  getAllocations,
  createRequest,
  listRequests,
  cancelRequest,
  approveRequest,
  refuseRequest,
} = require('../services/timeOff');

const router = express.Router();
const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate);

async function resolveOwnEmployeeId(req, res) {
  const employee = await getEmployeeByUserId(req.user.id);
  if (!employee) {
    res.status(404).json({ error: 'No employee record linked to this account' });
    return null;
  }
  return employee.id;
}

router.get('/types', async (req, res) => {
  res.json(await listTypes());
});

router.get('/me/allocations', async (req, res) => {
  const employeeId = await resolveOwnEmployeeId(req, res);
  if (employeeId === null) return;
  res.json(await getAllocations(employeeId));
});

router.get('/me/requests', async (req, res) => {
  const employeeId = await resolveOwnEmployeeId(req, res);
  if (employeeId === null) return;
  res.json(await listRequests({ employeeId }));
});

router.post('/requests', async (req, res) => {
  const employeeId = await resolveOwnEmployeeId(req, res);
  if (employeeId === null) return;
  const { type_id, start_date, end_date, reason } = req.body;
  if (!type_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'type_id, start_date, and end_date are required' });
  }
  try {
    const request = await createRequest(employeeId, { type_id, start_date, end_date, reason });
    res.status(201).json(request);
  } catch (err) {
    if (['INVALID_RANGE', 'OVERLAP', 'UNKNOWN_TYPE', 'INSUFFICIENT_BALANCE'].includes(err.code)) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.post('/requests/:id/cancel', async (req, res) => {
  const employeeId = await resolveOwnEmployeeId(req, res);
  if (employeeId === null) return;
  const request = await cancelRequest(req.params.id, employeeId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found, not yours, or no longer pending' });
  }
  res.json(request);
});

router.use(requireRole(HR_ROLES));

router.get('/requests', async (req, res) => {
  res.json(await listRequests({ employeeId: req.query.employee_id, status: req.query.status }));
});

router.post('/requests/:id/approve', async (req, res) => {
  try {
    const request = await approveRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found or not pending' });
    }
    res.json(request);
  } catch (err) {
    if (err.code === 'INSUFFICIENT_BALANCE') {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }
});

router.post('/requests/:id/refuse', async (req, res) => {
  const request = await refuseRequest(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found or not pending' });
  }
  res.json(request);
});

module.exports = router;
