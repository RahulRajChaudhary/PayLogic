import { useEffect, useState } from 'react';
import { UserCog, Shield } from 'lucide-react';
import { usersApi } from '../api/users';
import { employeesApi } from '../api/employees';
import Pagination from '../components/ui/Pagination';
import Badge from '../components/ui/Badge';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

const ROLES = ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'];
const ROLE_TONE = {
  employee: 'gray',
  hr_manager: 'blue',
  hr_payroll_user: 'blue',
  hr_payroll_manager: 'amber',
  admin: 'red',
};
const roleLabel = (role) => role.replace(/_/g, ' ');

const EMPTY_FORM = { employee_id: '', email: '', password: '', role: 'employee' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadData() {
    setListError('');
    setLoading(true);
    usersApi
      .list({ page })
      .then((res) => {
        setUsers(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => setListError(err.message))
      .finally(() => setLoading(false));
    // limit: 100 — feeds the "employee without a login" picker, needs every unlinked employee.
    employeesApi
      .list({ limit: 100 })
      .then((res) => setUnlinkedEmployees(res.data.filter((e) => !e.user_id)))
      .catch(() => {});
  }

  useEffect(loadData, [page]);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
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
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-navy-950/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-500';
  const labelClass = 'block text-sm font-medium text-ink mb-1';

  return (
    <div className="min-h-screen bg-cream-50 p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-lg bg-navy-950/5 flex items-center justify-center text-navy-950 shrink-0">
            <UserCog className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">User Management</h1>
            <p className="text-sm text-muted">Manage logins and role-based access.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Accounts</h2>
            {listError && <div className="mb-3"><ErrorBanner message={listError} onRetry={loadData} /></div>}
            <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
              {loading ? (
                <Spinner label="Loading users..." />
              ) : users.length === 0 && !listError ? (
                <EmptyState icon={UserCog} title="No user accounts yet" hint="Create the first login using the form." />
              ) : (
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-cream-100 text-muted text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium w-[45%]">Email</th>
                      <th className="px-4 py-3 font-medium w-[25%]">Role</th>
                      <th className="px-4 py-3 font-medium w-[30%]">Employee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-navy-950/10 hover:bg-cream-50/60">
                        <td className="px-4 py-3 text-ink font-medium truncate" title={u.email}>{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge tone={ROLE_TONE[u.role]}>{roleLabel(u.role)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted truncate" title={u.employee_name ?? '—'}>
                          {u.employee_name ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Create Login
            </h2>
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
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                {formError && <ErrorBanner message={formError} />}

                <button
                  type="submit"
                  disabled={submitting || unlinkedEmployees.length === 0}
                  className="w-full bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Login'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
