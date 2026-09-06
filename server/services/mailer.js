const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    const err = new Error(
      'Email is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in server/.env'
    );
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendPayslipEmail(transporter, { to, employeeName, periodLabel, pdfBuffer }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({
    from,
    to,
    subject: `Your Payslip — ${periodLabel}`,
    text: `Hi ${employeeName},\n\nYour payslip for ${periodLabel} is attached.\n\n— Paylogic`,
    attachments: [{ filename: `payslip-${periodLabel}.pdf`, content: pdfBuffer }],
  });
}

module.exports = { getTransporter, sendPayslipEmail };
