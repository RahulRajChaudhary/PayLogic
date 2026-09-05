import { useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import { employeesApi } from '../api/employees';

const ROLES = ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];

const EMPTY_FORM = { employee_id: '', email: '', password: '', role: 'employee' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadData() {
    usersApi.list().then(setUsers).catch((err) => setError(err.message));
    employeesApi
      .list()
      .then((employees) => setUnlinkedEmployees(employees.filter((e) => !e.user_id)))
      .catch(() => {});
  }

  useEffect(loadData, []);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await usersApi.create({
        employee_id: Number(form.employee_id),
        email: form.email,
        password: form.password,
        role: form.role,
      });
      setForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-navy-950/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-500';
  const labelClass = 'block text-sm font-medium text-ink mb-1';

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink mb-4">Users</h1>
          <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-muted text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Employee</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-navy-950/10">
                      <td className="px-4 py-3 text-ink font-medium">{u.email}</td>
                      <td className="px-4 py-3 text-muted">{u.role}</td>
                      <td className="px-4 py-3 text-muted">{u.employee_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink mb-4">Create Login</h2>
          <div className="bg-white rounded-xl border border-navy-950/10 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Employee</label>
                <select
                  required
                  value={form.employee_id}
                  onChange={update('employee_id')}
                  className={inputClass}
                >
                  <option value="">— Select an employee without a login —</option>
                  {unlinkedEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                {unlinkedEmployees.length === 0 && (
                  <p className="text-xs text-muted mt-1">
                    Every employee already has a login.
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={update('password')}
                  className={inputClass}
                />
                <p className="text-xs text-muted mt-1">
                  At least 8 characters, with a letter and a number.
                </p>
              </div>

              <div>
                <label className={labelClass}>Role</label>
                <select value={form.role} onChange={update('role')} className={inputClass}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting || unlinkedEmployees.length === 0}
                className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
