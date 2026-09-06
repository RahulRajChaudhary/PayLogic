import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { payrunsApi } from '../api/payruns';

const STATUS_BADGE = {
  draft: 'bg-cream-100 text-muted',
  computed: 'bg-blue-100 text-blue-700',
  validated: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
};
function statusBadgeClass(status) {
  return `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-cream-100 text-muted'}`;
}

export default function PayrunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payrun, setPayrun] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  function load() {
    setError('');
    payrunsApi.get(id).then(setPayrun).catch((err) => setError(err.message));
  }
  useEffect(load, [id]);

  async function runAction(action) {
    setBusy(true);
    setError('');
    setSendResults(null);
    try {
      const result = await action();
      if (result.results) {
        setSendResults(result.results);
        setPayrun(result.payrun);
      } else {
        setPayrun(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!payrun) {
    return (
      <div className="min-h-screen bg-cream-50 p-8">
        <div className="max-w-5xl mx-auto text-sm text-muted">{error || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/payruns" className="text-xs text-navy-950 hover:underline">&larr; Back to Payruns</Link>
        <div className="flex items-center justify-between mt-2 mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{payrun.name}</h1>
            <p className="text-sm text-muted">{payrun.structure_name} &middot; {payrun.period_start} to {payrun.period_end}</p>
          </div>
          <span className={statusBadgeClass(payrun.status)}>{payrun.status}</span>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {sendResults && (
          <div className="bg-white rounded-xl border border-navy-950/10 p-4 mb-4 text-sm">
            <p className="font-medium text-ink mb-2">Send Payslips results:</p>
            <ul className="space-y-1">
              {sendResults.map((r) => (
                <li key={r.payslipId} className={r.sent ? 'text-green-700' : 'text-red-600'}>
                  {r.employeeName}: {r.sent ? 'Sent' : `Failed — ${r.error}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            type="button"
            disabled={busy || payrun.status === 'paid'}
            onClick={() => runAction(() => payrunsApi.compute(id))}
            className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
          >
            Compute
          </button>
          <button
            type="button"
            disabled={busy || payrun.status !== 'computed'}
            onClick={() => runAction(() => payrunsApi.validate(id))}
            className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
          >
            Validate
          </button>
          <button
            type="button"
            disabled={busy || payrun.status !== 'validated'}
            onClick={() => runAction(() => payrunsApi.markPaid(id))}
            className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
          >
            Mark Paid
          </button>
          <button
            type="button"
            disabled={busy || !['validated', 'paid'].includes(payrun.status)}
            onClick={() => runAction(() => payrunsApi.send(id))}
            className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10 disabled:opacity-50"
          >
            Send Payslips
          </button>
        </div>

        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Warning</th>
                  <th className="px-4 py-3 font-medium">Worked Days</th>
                  <th className="px-4 py-3 font-medium">Basic</th>
                  <th className="px-4 py-3 font-medium">Gross</th>
                  <th className="px-4 py-3 font-medium">Net</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payrun.payslips.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/payslips/${p.id}`)} className="border-t border-navy-950/10 hover:bg-cream-100 cursor-pointer">
                    <td className="px-4 py-3 text-ink font-medium">{p.employee_name}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{p.warnings?.length ? p.warnings.join('; ') : '—'}</td>
                    <td className="px-4 py-3 text-muted">{p.worked_days ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{p.basic_amount}</td>
                    <td className="px-4 py-3 text-muted">{p.gross_amount}</td>
                    <td className="px-4 py-3 text-ink font-medium">{p.net_amount}</td>
                    <td className="px-4 py-3"><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                  </tr>
                ))}
                {payrun.payslips.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">No payslips.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
