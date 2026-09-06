const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { listSchedules, getSchedule, createSchedule, updateSchedule } = require('../services/workingSchedules');

const router = express.Router();
const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

router.use(authenticate, requireRole(HR_ROLES));

function validateBody(body) {
  if (!body.name || !String(body.name).trim()) return 'Schedule name is required';
  if (!Array.isArray(body.lines)) return 'lines must be an array';
  for (const line of body.lines) {
    if (!DAYS.includes(line.day)) return `day must be one of: ${DAYS.join(', ')}`;
    if (!line.start_time || !line.end_time) return 'each line needs a start and end time';
  }
  return null;
}

router.get('/', async (req, res) => {
  res.json(await listSchedules());
});

router.get('/:id', async (req, res) => {
  const schedule = await getSchedule(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Working schedule not found' });
  res.json(schedule);
});

router.post('/', async (req, res) => {
  const error = validateBody(req.body);
  if (error) return res.status(400).json({ error });
  res.status(201).json(await createSchedule(req.body));
});

router.put('/:id', async (req, res) => {
  const error = validateBody(req.body);
  if (error) return res.status(400).json({ error });
  const schedule = await updateSchedule(req.params.id, req.body);
  if (!schedule) return res.status(404).json({ error: 'Working schedule not found' });
  res.json(schedule);
});

module.exports = router;
