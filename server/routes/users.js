const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { createUserSchema, listUsers, createUserForEmployee } = require('../services/users');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const router = express.Router();

router.use(authenticate, requireRole(['admin']));

router.get('/', async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { rows, total } = await listUsers({ page, limit });
  res.json({ data: rows, pagination: buildPaginationMeta({ page, limit, total }) });
});

router.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const user = await createUserForEmployee(parsed.data);
    res.status(201).json(user);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    throw err;
  }
});

module.exports = router;
