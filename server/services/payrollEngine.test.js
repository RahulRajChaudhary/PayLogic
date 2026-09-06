const { computePayslip } = require('./payrollEngine');

const rules = [
  { code: 'BASIC', name: 'Basic Salary', category: 'basic', sequence: 1,
    computation_method: 'fixed', amount: 30000 },
  { code: 'HRA', name: 'House Rent Allowance', category: 'allowance', sequence: 2,
    computation_method: 'percentage', percentage: 40, percentage_of_code: 'BASIC' },
  { code: 'GROSS', name: 'Gross Salary', category: 'gross', sequence: 3,
    computation_method: 'formula', formula: 'BASIC + HRA' },
  { code: 'PF', name: 'Provident Fund', category: 'deduction', sequence: 4,
    computation_method: 'percentage', percentage: 12, percentage_of_code: 'BASIC' },
  { code: 'NET', name: 'Net Salary', category: 'net', sequence: 5,
    computation_method: 'formula', formula: 'GROSS - PF' },
];

const expected = { BASIC: 30000, HRA: 12000, GROSS: 42000, PF: 3600, NET: 38400 };

const result = computePayslip(rules, { wage: 30000 }, { workedDays: 22 });
console.log(result);

let allPass = true;
for (const line of result) {
  const ok = line.amount === expected[line.code];
  if (!ok) allPass = false;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${line.code}: got ${line.amount}, expected ${expected[line.code]}`);
}

if (!allPass) {
  console.error('\nengine test FAILED');
  process.exit(1);
}
console.log('\nengine test PASSED');
