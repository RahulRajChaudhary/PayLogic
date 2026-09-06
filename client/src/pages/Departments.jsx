import { useEffect, useState } from 'react';
import { departmentsApi } from '../api/departments';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating, else id
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError('');
    departmentsApi.list().then(setDepartments).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  function startCreate() {
    setName('');
    setEditingId('new');
  }
  function startEdit(d) {
    setName(d.name);
    setEditingId(d.id);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    try {
      if (editingId === 'new') await departmentsApi.create(name);
      else await departmentsApi.update(editingId, name);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Departments</h1>
          {editingId === null && (
            <button type="button" onClick={startCreate} className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800">
              Add Department
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {editingId !== null && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-4 mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Department Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
                placeholder="e.g. Engineering"
              />
            </div>
            <button
              type="button"
              disabled={submitting || !name.trim()}
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
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Employees</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} className="border-t border-navy-950/10">
                  <td className="px-4 py-3 text-ink font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-muted">{d.employee_count}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => startEdit(d)} className="text-xs text-navy-950 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted">No departments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
