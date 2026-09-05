const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { listTags } = require('../services/tags');

const router = express.Router();
const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate, requireRole(HR_ROLES));

router.get('/', async (req, res) => {
  res.json(await listTags());
});

module.exports = router;
