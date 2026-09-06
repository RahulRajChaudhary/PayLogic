const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { listContracts, getContract, createContract, updateContract } = require('../services/contracts');

const router = express.Router();
const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate);
router.use(requireRole(HR_ROLES));

router.get('/', async (req, res) => {
  res.json(await listContracts({ employeeId: req.query.employee_id, status: req.query.status }));
});

router.get('/:id', async (req, res) => {
  const contract = await getContract(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

router.post('/', async (req, res) => {
  const { employee_id, start_date, end_date, wage, salary_structure_id, department_id, job_position, status } = req.body;
  if (!employee_id || !start_date || wage == null) {
    return res.status(400).json({ error: 'employee_id, start_date, and wage are required' });
  }
  try {
    res.status(201).json(await createContract(employee_id, { start_date, end_date, wage, salary_structure_id, department_id, job_position, status }));
  } catch (err) {
    if (err.code === 'OVERLAP') return res.status(409).json({ error: err.message });
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { start_date, end_date, wage, salary_structure_id, department_id, job_position, status } = req.body;
  if (!start_date || wage == null) {
    return res.status(400).json({ error: 'start_date and wage are required' });
  }
  try {
    const contract = await updateContract(req.params.id, { start_date, end_date, wage, salary_structure_id, department_id, job_position, status });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (err) {
    if (err.code === 'OVERLAP') return res.status(409).json({ error: err.message });
    throw err;
  }
});

module.exports = router;
