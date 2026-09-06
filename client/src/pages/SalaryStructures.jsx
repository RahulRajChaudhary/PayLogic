import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PAYROLL_ADMIN_ROLES } from '../constants/roles';
import { salaryStructuresApi } from '../api/salaryStructures';

export default function SalaryStructures() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = PAYROLL_ADMIN_ROLES.includes(user?.role);

  const [structures, setStructures] = useState([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating, else id
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError('');
    salaryStructuresApi.list().then(setStructures).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  function startCreate() {
    setName('');
    setEditingId('new');
  }
  function startEdit(s) {
    setName(s.name);
    setEditingId(s.id);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    try {
      if (editingId === 'new') {
        await salaryStructuresApi.create({ name });
      } else {
        await salaryStructuresApi.update(editingId, { name });
      }
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Salary Structures</h1>
          {canEdit && (
            <button
              type="button"
              onClick={startCreate}
              className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800"
            >
              Add Structure
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {editingId && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-4 mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Structure Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
                placeholder="e.g. Regular Salary"
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
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Structure Name</th>
                  <th className="px-4 py-3 font-medium">Rules</th>
                  <th className="px-4 py-3 font-medium">Employees</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/salary-rules?structure_id=${s.id}&structure_name=${encodeURIComponent(s.name)}`)}
                    className="border-t border-navy-950/10 hover:bg-cream-100 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-ink font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.rule_count} rules</td>
                    <td className="px-4 py-3 text-muted">{s.employee_count} employees</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEdit(s); }}
                          className="text-xs text-navy-950 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {structures.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">No salary structures yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
