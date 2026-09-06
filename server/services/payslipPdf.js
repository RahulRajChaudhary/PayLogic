const PDFDocument = require('pdfkit');

// No company letterhead — the `company` table was removed this session (see
// DECISIONS.md); reuses "Paylogic" as the brand, same as Header.jsx already does.
function generatePayslipPdf(payslip) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const col = { code: 50, name: 140, category: 340, amount: 460 };

  doc.fontSize(20).text('Paylogic', 50, 50);
  doc.fontSize(10).fillColor('gray').text('Payslip', 50, 75);

  doc.fillColor('black').fontSize(11);
  let y = 105;
  const line = (text) => { doc.text(text, 50, y); y += 16; };
  line(`Employee: ${payslip.employee_name} (${payslip.employee_code})`);
  line(`Salary Structure: ${payslip.structure_name}`);
  line(`Payrun: ${payslip.payrun_name}`);
  line(`Period: ${payslip.period_start} to ${payslip.period_end}`);
  line(`Status: ${payslip.status}    Worked Days: ${payslip.worked_days ?? '—'}`);
  y += 14;

  doc.font('Helvetica-Bold');
  doc.text('Code', col.code, y);
  doc.text('Name', col.name, y);
  doc.text('Category', col.category, y);
  doc.text('Amount', col.amount, y);
  y += 18;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 8;

  doc.font('Helvetica');
  for (const item of payslip.lines) {
    doc.text(item.code, col.code, y);
    doc.text(item.name, col.name, y);
    doc.text(item.category, col.category, y);
    doc.text(Number(item.amount).toFixed(2), col.amount, y);
    y += 18;
  }

  y += 10;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 14;

  const netLine = payslip.lines.find((l) => l.category === 'net');
  doc.font('Helvetica-Bold').fontSize(13)
    .text(`Net Salary: ${netLine ? Number(netLine.amount).toFixed(2) : '—'}`, 50, y);
  y += 26;

  if (payslip.warnings?.length) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('red')
      .text(`Warnings: ${payslip.warnings.join('; ')}`, 50, y, { width: 495 });
  }

  doc.end();
  return doc;
}

function generatePayslipPdfBuffer(payslip) {
  return new Promise((resolve, reject) => {
    const doc = generatePayslipPdf(payslip);
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

module.exports = { generatePayslipPdf, generatePayslipPdfBuffer };
