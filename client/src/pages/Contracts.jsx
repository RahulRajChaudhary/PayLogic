import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { contractsApi } from '../api/contracts';
import { employeesApi } from '../api/employees';

const EMPTY_FORM = { employee_id: '', start_date: '', end_date: '', wage: '', status: 'active' };

const TYPE_LABEL = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
};

export default function Contracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating, else contract id
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError('');
    contractsApi.list({ status: statusFilter || undefined }).then(setContracts).catch((err) => setError(err.message));
  }
  useEffect(load, [statusFilter]);

  useEffect(() => {
    employeesApi.list().then(setEmployees).catch(() => {});
  }, []);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId('new');
  }
  function startEdit(c) {
    setForm({ employee_id: c.employee_id, start_date: c.start_date, end_date: c.end_date ?? '', wage: c.wage, status: c.status });
    setEditingId(c.id);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    const payload = {
      start_date: form.start_date,
      end_date: form.end_date || null,
      wage: Number(form.wage),
      status: form.status,
    };
    try {
      if (editingId === 'new') {
        await contractsApi.create({ employee_id: Number(form.employee_id), ...payload });
      } else {
        await contractsApi.update(editingId, payload);
      }
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const isCurrent = (c) => c.status === 'active' && c.start_date <= today && (!c.end_date || c.end_date >= today);
  const inputClass = 'rounded-lg border border-navy-950/15 px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Contracts</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
              <option value="">— All statuses —</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
            <button type="button" onClick={startCreate} className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800">
              Add Contract
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {editingId && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-4 mb-4 flex flex-wrap items-end gap-3">
            {editingId === 'new' && (
              <div>
                <label className="block text-xs text-muted mb-1">Employee</label>
                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className={inputClass}>
                  <option value="">— Select employee —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-muted mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Wage</label>
              <input type="number" value={form.wage} onChange={(e) => setForm({ ...form, wage: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </div>
            <button
              type="button"
              disabled={submitting || (editingId === 'new' && !form.employee_id)}
              onClick={handleSave}
              className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10">
              Cancel
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Contract ID</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Type of Contract</th>
                  <th className="px-4 py-3 font-medium">Start Date</th>
                  <th className="px-4 py-3 font-medium">End Date</th>
                  <th className="px-4 py-3 font-medium">Wage</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/employees/${c.employee_id}?tab=contracts`)}
                    className={`border-t border-navy-950/10 hover:bg-cream-100 cursor-pointer ${isCurrent(c) ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-muted">{c.contract_code}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/employees/${c.employee_id}?tab=contracts`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-navy-950 font-medium hover:underline"
                      >
                        {c.employee_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{TYPE_LABEL[c.employee_type] ?? c.employee_type}</td>
                    <td className="px-4 py-3 text-ink font-medium">{c.start_date}</td>
                    <td className="px-4 py-3 text-muted">{c.end_date ?? 'Ongoing'}</td>
                    <td className="px-4 py-3 text-muted">{c.wage}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-cream-100 text-muted'}`}>
                        {c.status === 'active' ? 'Active' : 'Ended'}{isCurrent(c) && ' · Current'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                        className="p-1.5 rounded-lg text-muted hover:bg-navy-950/10 hover:text-ink"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
