import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { payslipsApi } from '../api/payslips';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function Payslips() {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  function load() {
    setError('');
    payslipsApi
      .list({ status: statusFilter || undefined, page })
      .then((res) => {
        setPayslips(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err.message));
  }
  useEffect(load, [statusFilter, page]);

  const inputClass = 'rounded-lg border border-navy-950/15 px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Payslips</h1>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
            <option value="">— All statuses —</option>
            <option value="draft">Draft</option>
            <option value="computed">Computed</option>
            <option value="validated">Validated</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Warning</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium text-right">Basic</th>
                  <th className="px-4 py-3 font-medium text-right">Gross</th>
                  <th className="px-4 py-3 font-medium text-right">Net</th>
                  <th className="px-4 py-3 font-medium">Structure</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/payslips/${p.id}`)} className="border-t border-navy-950/10 hover:bg-cream-100 cursor-pointer">
                    <td className="px-4 py-3 text-ink font-medium">{p.employee_name}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{p.warnings?.length ? p.warnings[0] : '—'}</td>
                    <td className="px-4 py-3 text-muted">{p.period_start} — {p.period_end}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{money(p.basic_amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{money(p.gross_amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink font-medium">{money(p.net_amount)}</td>
                    <td className="px-4 py-3 text-muted">{p.structure_name}</td>
                    <td className="px-4 py-3"><Badge status={p.status} /></td>
                  </tr>
                ))}
                {payslips.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">No payslips yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}
