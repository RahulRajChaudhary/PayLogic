import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { employeesApi } from '../api/employees';
import { departmentsApi } from '../api/departments';

const EMPTY_FORM = {
  name: '',
  department_id: '',
  manager_id: '',
  job_position: '',
  employee_type: 'full_time',
  status: 'active',
};

export default function EmployeeForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    departmentsApi.list().then(setDepartments).catch(() => {});
    employeesApi.list().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    employeesApi.get(id).then((emp) =>
      setForm({
        name: emp.name,
        department_id: emp.department_id ?? '',
        manager_id: emp.manager_id ?? '',
        job_position: emp.job_position ?? '',
        employee_type: emp.employee_type,
        status: emp.status,
      })
    );
  }, [id, isNew]);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleAddDepartment() {
    const name = newDeptName.trim();
    if (!name) return;
    try {
      const dept = await departmentsApi.create(name);
      setDepartments([...departments, dept]);
      setForm({ ...form, department_id: dept.id });
      setNewDeptName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const payload = {
      name: form.name,
      department_id: form.department_id ? Number(form.department_id) : null,
      manager_id: form.manager_id ? Number(form.manager_id) : null,
      job_position: form.job_position || undefined,
      employee_type: form.employee_type,
      status: form.status,
    };
    try {
      if (isNew) {
        await employeesApi.create(payload);
      } else {
        await employeesApi.update(id, payload);
      }
      navigate('/employees');
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
    <div className="min-h-screen bg-cream-50 px-4 py-10">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-navy-950/10 p-8">
        <h1 className="text-2xl font-semibold text-ink">
          {isNew ? 'New Employee' : 'Edit Employee'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className={labelClass}>Name</label>
            <input required value={form.name} onChange={update('name')} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Department</label>
            <select
              value={form.department_id}
              onChange={update('department_id')}
              className={inputClass}
            >
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <input
                placeholder="New department name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddDepartment}
                className="shrink-0 bg-cream-100 text-ink rounded-lg px-3 text-sm font-medium hover:bg-navy-950/10"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Manager</label>
            <select
              value={form.manager_id}
              onChange={update('manager_id')}
              className={inputClass}
            >
              <option value="">— None —</option>
              {employees
                .filter((e) => String(e.id) !== id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Job Position</label>
            <input value={form.job_position} onChange={update('job_position')} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Employee Type</label>
              <select value={form.employee_type} onChange={update('employee_type')} className={inputClass}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={update('status')} className={inputClass}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isNew ? 'Create Employee' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
