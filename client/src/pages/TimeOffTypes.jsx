import { useEffect, useState } from 'react';
import { timeOffApi } from '../api/timeOff';
import Pagination from '../components/ui/Pagination';

const COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'gray'];
const COLOR_DOT = {
  blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500',
  red: 'bg-red-500', purple: 'bg-purple-500', gray: 'bg-gray-400',
};

const EMPTY_FORM = { name: '', unit: 'day', requires_allocation: true, approval: 'manager', color: 'blue' };

export default function TimeOffTypes() {
  const [types, setTypes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError('');
    timeOffApi
      .types({ page })
      .then((res) => {
        setTypes(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err.message));
  }
  useEffect(load, [page]);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId('new');
  }
  function startEdit(t) {
    setForm({ name: t.name, unit: t.unit, requires_allocation: t.requires_allocation, approval: t.approval, color: t.color });
    setEditingId(t.id);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    try {
      if (editingId === 'new') await timeOffApi.createType(form);
      else await timeOffApi.updateType(editingId, form);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'rounded-lg border border-navy-950/15 px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Time Off Types</h1>
          <button type="button" onClick={startCreate} className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800">
            New Type
          </button>
        </div>
        <p className="text-sm text-muted mb-6">Leave policies — these define behaviour, not individual employee balances.</p>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {editingId && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-4 mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Type Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Paid Time Off" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass}>
                <option value="day">Days</option>
                <option value="hour">Hours</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Requires Allocation</label>
              <select value={form.requires_allocation ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, requires_allocation: e.target.value === 'yes' })} className={inputClass}>
                <option value="yes">Required</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Approval</label>
              <select value={form.approval} onChange={(e) => setForm({ ...form, approval: e.target.value })} className={inputClass}>
                <option value="manager">Manager</option>
                <option value="officer">Officer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Color</label>
              <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={inputClass}>
                {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="button" disabled={submitting || !form.name.trim()} onClick={handleSave} className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10">
              Cancel
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Allocation</th>
                <th className="px-4 py-3 font-medium">Approval</th>
                <th className="px-4 py-3 font-medium">Color</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-t border-navy-950/10">
                  <td className="px-4 py-3 text-ink font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-muted capitalize">{t.unit}s</td>
                  <td className="px-4 py-3 text-muted">{t.requires_allocation ? 'Required' : 'No'}</td>
                  <td className="px-4 py-3 text-muted capitalize">{t.approval}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-muted capitalize">
                      <span className={`w-2.5 h-2.5 rounded-full ${COLOR_DOT[t.color] ?? 'bg-gray-400'}`} />
                      {t.color}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => startEdit(t)} className="text-xs text-navy-950 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">No time off types yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}
