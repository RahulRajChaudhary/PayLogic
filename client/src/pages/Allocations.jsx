import { useEffect, useState } from 'react';
import { timeOffApi } from '../api/timeOff';
import { employeesApi } from '../api/employees';

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  refused: 'bg-red-100 text-red-700',
};
function statusBadgeClass(status) {
  return `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-cream-100 text-muted'}`;
}

const EMPTY_FORM = { employee_id: '', type_id: '', allocated: '', valid_from: '', valid_to: '', description: '' };

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError('');
    timeOffApi.allocations({ status: statusFilter || undefined }).then(setAllocations).catch((err) => setError(err.message));
  }
  useEffect(load, [statusFilter]);
  useEffect(() => {
    employeesApi.list().then(setEmployees).catch(() => {});
    timeOffApi.types().then(setTypes).catch(() => {});
  }, []);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId('new');
  }
  function startEdit(a) {
    setForm({
      employee_id: a.employee_id, type_id: a.type_id, allocated: a.allocated,
      valid_from: a.valid_from ?? '', valid_to: a.valid_to ?? '', description: a.description ?? '',
    });
    setEditingId(a.id);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    const payload = {
      allocated: Number(form.allocated),
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      description: form.description || null,
    };
    try {
      if (editingId === 'new') {
        await timeOffApi.createAllocation({ employee_id: Number(form.employee_id), type_id: Number(form.type_id), ...payload });
      } else {
        await timeOffApi.updateAllocation(editingId, payload);
      }
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function act(fn, id) {
    setError('');
    try {
      await fn(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const inputClass = 'rounded-lg border border-navy-950/15 px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Allocations</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
              <option value="">— All statuses —</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="refused">Refused</option>
            </select>
            <button type="button" onClick={startCreate} className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800">
              New Allocation
            </button>
          </div>
        </div>
        <p className="text-sm text-muted mb-6">Leave balances granted to employees. Only <span className="font-medium">approved</span> allocations provide available balance.</p>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {editingId && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-4 mb-4 flex flex-wrap items-end gap-3">
            {editingId === 'new' && (
              <>
                <div>
                  <label className="block text-xs text-muted mb-1">Employee</label>
                  <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className={inputClass}>
                    <option value="">— Select —</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Time Off Type</label>
                  <select value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })} className={inputClass}>
                    <option value="">— Select —</option>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-muted mb-1">Allocated</label>
              <input type="number" value={form.allocated} onChange={(e) => setForm({ ...form, allocated: e.target.value })} className={`${inputClass} w-24`} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Valid From</label>
              <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Valid To</label>
              <input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} className={inputClass} />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-muted mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} w-full`} />
            </div>
            <button type="button" disabled={submitting || (editingId === 'new' && (!form.employee_id || !form.type_id)) || form.allocated === ''} onClick={handleSave} className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50">
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
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Allocated</th>
                  <th className="px-4 py-3 font-medium">Taken</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Approver</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-t border-navy-950/10">
                    <td className="px-4 py-3 text-ink font-medium">{a.employee_name}</td>
                    <td className="px-4 py-3 text-muted">{a.type_name}</td>
                    <td className="px-4 py-3 text-muted">{a.allocated} {a.unit}s</td>
                    <td className="px-4 py-3 text-muted">{a.taken}</td>
                    <td className="px-4 py-3 text-ink font-medium">{a.remaining}</td>
                    <td className="px-4 py-3"><span className={statusBadgeClass(a.status)}>{a.status}</span></td>
                    <td className="px-4 py-3 text-muted">{a.approver_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {a.status === 'pending' && (
                        <>
                          <button type="button" onClick={() => act(timeOffApi.approveAllocation, a.id)} className="text-xs text-green-700 hover:underline mr-3">Approve</button>
                          <button type="button" onClick={() => act(timeOffApi.refuseAllocation, a.id)} className="text-xs text-red-600 hover:underline mr-3">Refuse</button>
                        </>
                      )}
                      <button type="button" onClick={() => startEdit(a)} className="text-xs text-navy-950 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
                {allocations.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">No allocations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
