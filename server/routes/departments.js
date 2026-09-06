const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { listDepartments, createDepartment, updateDepartment } = require('../services/departments');

const router = express.Router();
const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate, requireRole(HR_ROLES));

router.get('/', async (req, res) => {
  res.json(await listDepartments());
});

router.post('/', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  try {
    const department = await createDepartment(name);
    res.status(201).json(department);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A department with that name already exists' });
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  try {
    const department = await updateDepartment(req.params.id, name);
    if (!department) return res.status(404).json({ error: 'Department not found' });
    res.json(department);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A department with that name already exists' });
    }
    throw err;
  }
});

module.exports = router;
