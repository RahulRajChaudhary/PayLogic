const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { listStructures, getStructure, createStructure, updateStructure } = require('../services/salaryStructures');

const router = express.Router();
const PAYROLL_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const PAYROLL_ADMIN_ROLES = ['hr_payroll_manager', 'admin'];

router.use(authenticate);

router.get('/', requireRole(PAYROLL_ROLES), async (req, res) => {
  res.json(await listStructures());
});

router.get('/:id', requireRole(PAYROLL_ROLES), async (req, res) => {
  const structure = await getStructure(req.params.id);
  if (!structure) return res.status(404).json({ error: 'Salary structure not found' });
  res.json(structure);
});

router.post('/', requireRole(PAYROLL_ADMIN_ROLES), async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Structure name is required' });
  try {
    res.status(201).json(await createStructure(name));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A structure with that name already exists' });
    throw err;
  }
});

router.put('/:id', requireRole(PAYROLL_ADMIN_ROLES), async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Structure name is required' });
  try {
    const structure = await updateStructure(req.params.id, name);
    if (!structure) return res.status(404).json({ error: 'Salary structure not found' });
    res.json(structure);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A structure with that name already exists' });
    throw err;
  }
});

module.exports = router;
