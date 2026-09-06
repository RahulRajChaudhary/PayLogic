const { evaluate } = require('mathjs');

function computePayslip(rules, contract, attendanceSummary) {
  const context = {
    CONTRACT_WAGE: contract.wage,
    WORKED_DAYS: attendanceSummary.workedDays,
  };

  const lines = [];
  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  for (const rule of sortedRules) {
    let value;

    if (rule.computation_method === 'fixed') {
      value = Number(rule.amount);

    } else if (rule.computation_method === 'percentage') {
      const base = context[rule.percentage_of_code] ?? 0;
      value = base * (Number(rule.percentage) / 100);

    } else if (rule.computation_method === 'formula') {
      value = evaluate(rule.formula, context);

    } else {
      throw new Error(`Unknown computation_method: ${rule.computation_method}`);
    }

    context[rule.code] = value;
    lines.push({
      code: rule.code,
      name: rule.name,
      category: rule.category,
      amount: Math.round(value * 100) / 100,
    });
  }

  return lines;
}

module.exports = { computePayslip };
