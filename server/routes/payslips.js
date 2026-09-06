const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { listPayslips, getPayslip } = require('../services/payslips');
const { generatePayslipPdf } = require('../services/payslipPdf');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const router = express.Router();
const PAYROLL_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

router.use(authenticate, requireRole(PAYROLL_ROLES));

router.get('/', async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { rows, total } = await listPayslips({
    employeeId: req.query.employee_id,
    payrunId: req.query.payrun_id,
    status: req.query.status,
    page,
    limit,
  });
  res.json({ data: rows, pagination: buildPaginationMeta({ page, limit, total }) });
});

router.get('/:id', async (req, res) => {
  const payslip = await getPayslip(req.params.id);
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
  res.json(payslip);
});

router.get('/:id/pdf', async (req, res) => {
  const payslip = await getPayslip(req.params.id);
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="payslip-${payslip.id}.pdf"`);
  generatePayslipPdf(payslip).pipe(res);
});

module.exports = router;
