const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { listRules, createRule, updateRule } = require('../services/salaryRules');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const router = express.Router();

const PAYROLL_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

const PAYROLL_ADMIN_ROLES = ['hr_payroll_manager', 'admin'];

const CATEGORIES = ['basic', 'allowance', 'gross', 'deduction', 'net'];

const METHODS = ['fixed', 'percentage', 'formula'];

function validateRuleBody(body) {
  const { structure_id, name, code, category, sequence, computation_method } = body;
  if (!structure_id || !name || !code || !category || sequence == null || !computation_method) {
    return 'structure_id, name, code, category, sequence, and computation_method are required';
  }
  if (!CATEGORIES.includes(category)) return `category must be one of: ${CATEGORIES.join(', ')}`;
  if (!METHODS.includes(computation_method)) return `computation_method must be one of: ${METHODS.join(', ')}`;
  if (computation_method === 'fixed' && body.amount == null) {
    return 'amount is required for a fixed rule';
  }
  if (computation_method === 'percentage' && (body.percentage == null || !body.percentage_of_code)) {
    return 'percentage and percentage_of_code are required for a percentage rule';
  }
  if (computation_method === 'formula' && !body.formula) {
    return 'formula is required for a formula rule';
  }
  return null;
}

router.use(authenticate);

router.get('/', requireRole(PAYROLL_ROLES), async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { rows, total } = await listRules({ structureId: req.query.structure_id, page, limit });
  res.json({ data: rows, pagination: buildPaginationMeta({ page, limit, total }) });
});

router.post('/', requireRole(PAYROLL_ADMIN_ROLES), async (req, res) => {
  const error = validateRuleBody(req.body);
  if (error) return res.status(400).json({ error });
  try {
    res.status(201).json(await createRule(req.body));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A rule with that code already exists in this structure' });
    }
    throw err;
  }
});

router.put('/:id', requireRole(PAYROLL_ADMIN_ROLES), async (req, res) => {
  const error = validateRuleBody(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const rule = await updateRule(req.params.id, req.body);
    if (!rule) return res.status(404).json({ error: 'Salary rule not found' });
    res.json(rule);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A rule with that code already exists in this structure' });
    }
    throw err;
  }
});

module.exports = router;
