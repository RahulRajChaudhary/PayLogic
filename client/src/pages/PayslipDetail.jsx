import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, AlertTriangle } from 'lucide-react';
import { payslipsApi } from '../api/payslips';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CATEGORY_LABEL = { basic: 'Basic', allowance: 'Allowances', gross: 'Gross', deduction: 'Deductions', net: 'Net' };

function LineRow({ line }) {
  const isDeduction = line.category === 'deduction';
  const isTotal = line.category === 'gross' || line.category === 'net';
  return (
    <tr className={`border-b border-navy-950/5 ${isTotal ? 'bg-cream-100/60 font-semibold text-ink' : ''}`}>
      <td className="py-2.5 px-2 font-mono text-xs text-muted">{line.code}</td>
      <td className="py-2.5 px-2">{line.name}</td>
      <td className="py-2.5 px-2 text-muted text-xs capitalize">{CATEGORY_LABEL[line.category] ?? line.category}</td>
      <td className={`py-2.5 px-2 text-right tabular-nums ${isDeduction ? 'text-red-600' : isTotal ? 'text-ink' : 'text-ink'}`}>
        {isDeduction ? `- ${money(line.amount)}` : money(line.amount)}
      </td>
    </tr>
  );
}

export default function PayslipDetail() {
  const { id } = useParams();
  const [payslip, setPayslip] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    payslipsApi.get(id).then(setPayslip).catch((err) => setError(err.message));
  }, [id]);

  if (!payslip) {
    return (
      <div className="min-h-screen bg-cream-50 p-8">
        <div className="max-w-2xl mx-auto">{error ? <p className="text-sm text-red-600">{error}</p> : <Spinner />}</div>
      </div>
    );
  }

  const netLine = payslip.lines.find((l) => l.category === 'net');
  const grossLine = payslip.lines.find((l) => l.category === 'gross');
  const deductionsTotal = payslip.lines.filter((l) => l.category === 'deduction').reduce((s, l) => s + Number(l.amount), 0);

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link to={`/payruns/${payslip.payrun_id}`} className="text-xs text-navy-950 hover:underline">
          &larr; Back to {payslip.payrun_name}
        </Link>

        <div className="bg-white rounded-xl border border-navy-950/10 mt-2 overflow-hidden">
          {/* Header band */}
          <div className="bg-navy-950 text-cream-50 px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-500 font-semibold">Payslip</p>
              <h1 className="text-xl font-semibold mt-1">{payslip.employee_name}</h1>
              <p className="text-sm text-cream-50/70">{payslip.employee_code} · {payslip.structure_name}</p>
            </div>
            <a
              href={payslipsApi.pdfUrl(payslip.id)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-cream-50 text-navy-950 rounded-lg px-4 py-2 text-sm font-medium hover:bg-cream-100"
            >
              <Printer className="w-4 h-4" /> Print Payslip
            </a>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
              <div><p className="text-muted text-xs">Pay Run</p><p className="text-ink font-medium">{payslip.payrun_name}</p></div>
              <div><p className="text-muted text-xs">Period</p><p className="text-ink font-medium">{payslip.period_start} – {payslip.period_end}</p></div>
              <div><p className="text-muted text-xs">Status</p><Badge status={payslip.status} /></div>
              <div><p className="text-muted text-xs">Worked Days</p><p className="text-ink font-medium">{payslip.worked_days ?? '—'}</p></div>
            </div>

            {payslip.warnings?.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{payslip.warnings.join('; ')}</span>
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="text-muted text-left border-b-2 border-navy-950/10">
                <tr>
                  <th className="py-2 px-2 font-medium">Code</th>
                  <th className="py-2 px-2 font-medium">Rule</th>
                  <th className="py-2 px-2 font-medium">Category</th>
                  <th className="py-2 px-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payslip.lines.map((l) => <LineRow key={l.id} line={l} />)}
              </tbody>
            </table>

            {/* Summary footer */}
            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-72 space-y-1.5 text-sm">
                {grossLine && (
                  <div className="flex justify-between text-muted"><span>Gross</span><span className="tabular-nums text-ink">{money(grossLine.amount)}</span></div>
                )}
                {deductionsTotal > 0 && (
                  <div className="flex justify-between text-muted"><span>Deductions</span><span className="tabular-nums text-red-600">- {money(deductionsTotal)}</span></div>
                )}
                <div className="flex justify-between items-baseline border-t border-navy-950/10 pt-2 mt-1">
                  <span className="font-semibold text-ink">Net Salary</span>
                  <span className="text-xl font-bold text-ink tabular-nums">{netLine ? money(netLine.amount) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
