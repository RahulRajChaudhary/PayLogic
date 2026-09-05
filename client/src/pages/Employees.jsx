import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { employeesApi } from '../api/employees';

const statusBadgeClass = (status) =>
  `px-2 py-0.5 rounded-full text-xs font-medium ${
    status === 'active' ? 'bg-green-100 text-green-700' : 'bg-cream-100 text-muted'
  }`;

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      employeesApi
        .list({ search })
        .then(setEmployees)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 250); // debounce so we don't hit the API on every keystroke

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Employees</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="search"
                placeholder="Search by name or job position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-navy-950/15 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 w-64"
              />
            </div>
            <div className="flex rounded-lg border border-navy-950/15 overflow-hidden text-sm">
              <button
                onClick={() => setView('kanban')}
                className={`px-3 py-2 font-medium ${
                  view === 'kanban' ? 'bg-navy-950 text-cream-50' : 'bg-white text-muted hover:bg-cream-100'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 font-medium border-l border-navy-950/15 ${
                  view === 'list' ? 'bg-navy-950 text-cream-50' : 'bg-white text-muted hover:bg-cream-100'
                }`}
              >
                List
              </button>
            </div>
            <button
              onClick={() => navigate('/employees/new')}
              className="flex items-center gap-1.5 bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800"
            >
              <Plus className="w-4 h-4" />
              New Employee
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {!loading && employees.length === 0 && (
          <div className="bg-white rounded-xl border border-navy-950/10 px-4 py-6 text-center text-muted">
            No employees found.
          </div>
        )}

        {view === 'kanban' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="bg-white rounded-xl border border-navy-950/10 p-4 cursor-pointer hover:border-gold-500/40 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-ink">{emp.name}</p>
                  <span className={statusBadgeClass(emp.status)}>{emp.status}</span>
                </div>
                <p className="text-sm text-muted mt-1">{emp.job_position ?? '—'}</p>
                <p className="text-sm text-muted">{emp.department_name ?? '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          employees.length > 0 && (
            <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-100 text-muted text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Manager</th>
                      <th className="px-4 py-3 font-medium">Job Position</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="border-t border-navy-950/10 hover:bg-cream-100 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-ink font-medium">{emp.name}</td>
                        <td className="px-4 py-3 text-muted">{emp.department_name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{emp.manager_name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{emp.job_position ?? '—'}</td>
                        <td className="px-4 py-3 text-muted capitalize">
                          {emp.employee_type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadgeClass(emp.status)}>{emp.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
