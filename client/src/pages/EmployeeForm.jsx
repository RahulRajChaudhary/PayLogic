import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { employeesApi } from '../api/employees';
import { departmentsApi } from '../api/departments';
import { tagsApi } from '../api/tags';
import { workingSchedulesApi } from '../api/workingSchedules';
import { contractsApi } from '../api/contracts';
import { attendanceApi } from '../api/attendance';
import { timeOffApi } from '../api/timeOff';
import { GENDERS, MARITAL_STATUSES } from '../constants/employeeOptions';
import EmployeeProfileHeader from '../components/EmployeeProfileHeader';
import EmployeeAttendanceTab from '../components/EmployeeAttendanceTab';
import EmployeeContractsTab from '../components/EmployeeContractsTab';
import EmployeeTimeOffTab from '../components/EmployeeTimeOffTab';

const EMPTY_FORM = {
  name: '',
  department_id: '',
  manager_id: '',
  job_position: '',
  employee_type: 'full_time',
  status: 'active',
  work_email: '',
  work_phone: '',
  private_email: '',
  private_phone: '',
  home_address: '',
  home_city: '',
  home_state: '',
  home_country: '',
  date_of_birth: '',
  gender: '',
  marital_status: '',
  working_schedule_id: '',
  bank_account: '',
  tags: [],
};

export default function EmployeeForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState(EMPTY_FORM);
  const [employeeCode, setEmployeeCode] = useState('');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [counts, setCounts] = useState({ contracts: null, attendance: null, timeoff: null });
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    ['attendance', 'contracts', 'timeoff'].includes(initialTab) ? initialTab : 'work'
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // limit: 100 — these feed dropdown pickers (department/manager/schedule), need every row.
    departmentsApi.list({ limit: 100 }).then((res) => setDepartments(res.data)).catch(() => {});
    employeesApi.list({ limit: 100 }).then((res) => setEmployees(res.data)).catch(() => {});
    workingSchedulesApi.list({ limit: 100 }).then((res) => setSchedules(res.data)).catch(() => {});
    tagsApi.list().then(setAvailableTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    employeesApi.get(id).then((emp) => {
      setEmployeeCode(emp.employee_code);
      setForm({
        name: emp.name,
        department_id: emp.department_id ?? '',
        manager_id: emp.manager_id ?? '',
        job_position: emp.job_position ?? '',
        employee_type: emp.employee_type,
        status: emp.status,
        work_email: emp.work_email ?? '',
        work_phone: emp.work_phone ?? '',
        private_email: emp.private_email ?? '',
        private_phone: emp.private_phone ?? '',
        home_address: emp.home_address ?? '',
        home_city: emp.home_city ?? '',
        home_state: emp.home_state ?? '',
        home_country: emp.home_country ?? '',
        date_of_birth: emp.date_of_birth ?? '',
        gender: emp.gender ?? '',
        marital_status: emp.marital_status ?? '',
        working_schedule_id: emp.working_schedule_id ?? '',
        bank_account: emp.bank_account ?? '',
        tags: emp.tags ?? [],
      });
    });
  }, [id, isNew]);

  // Smart-button counts (PDF §B2) — shown as badges on the Contracts/Attendance/Time Off
  // tabs so their volume is visible without opening each one.
  useEffect(() => {
    if (isNew) return;
    // Use pagination.total, not data.length — data is only the current page's rows,
    // and would silently under-report the count once an employee passes the page size.
    contractsApi.list({ employeeId: id }).then((res) => setCounts((c) => ({ ...c, contracts: res.pagination.total }))).catch(() => {});
    attendanceApi.count(id).then(({ count }) => setCounts((c) => ({ ...c, attendance: count }))).catch(() => {});
    timeOffApi.list({ employeeId: id }).then((res) => setCounts((c) => ({ ...c, timeoff: res.pagination.total }))).catch(() => {});
  }, [id, isNew]);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function addTag(tag) {
    if (form.tags.includes(tag)) return;
    setForm({ ...form, tags: [...form.tags, tag] });
  }

  function removeTag(tag) {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
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
      work_email: form.work_email || null,
      work_phone: form.work_phone || null,
      private_email: form.private_email || null,
      private_phone: form.private_phone || null,
      home_address: form.home_address || null,
      home_city: form.home_city || null,
      home_state: form.home_state || null,
      home_country: form.home_country || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      marital_status: form.marital_status || null,
      working_schedule_id: form.working_schedule_id ? Number(form.working_schedule_id) : null,
      bank_account: form.bank_account || null,
      tags: form.tags,
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
  const tabButtonClass = (tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      activeTab === tab ? 'border-navy-950 text-ink' : 'border-transparent text-muted hover:text-ink'
    }`;

  return (
    <div className="min-h-screen bg-cream-50 px-4 py-10">
      <div className={`${['attendance', 'contracts', 'timeoff'].includes(activeTab) ? 'max-w-4xl' : 'max-w-2xl'} mx-auto bg-white rounded-xl shadow-sm border border-navy-950/10 p-8`}>
        <EmployeeProfileHeader
          employeeCode={employeeCode}
          status={form.status}
          name={form.name}
          jobPosition={form.job_position}
          tags={form.tags}
          readOnly={false}
          onNameChange={(value) => setForm({ ...form, name: value })}
          onJobPositionChange={(value) => setForm({ ...form, job_position: value })}
          availableTags={availableTags}
          onAddTag={addTag}
          onRemoveTag={removeTag}
        />

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex gap-2 border-b border-navy-950/10 mb-6">
            <button type="button" onClick={() => setActiveTab('work')} className={tabButtonClass('work')}>
              Work Information
            </button>
            <button type="button" onClick={() => setActiveTab('personal')} className={tabButtonClass('personal')}>
              Personal Information
            </button>
            {!isNew && (
              <button type="button" onClick={() => setActiveTab('attendance')} className={tabButtonClass('attendance')}>
                Attendance{counts.attendance != null && <CountBadge value={counts.attendance} />}
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={() => setActiveTab('contracts')} className={tabButtonClass('contracts')}>
                Contracts{counts.contracts != null && <CountBadge value={counts.contracts} />}
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={() => setActiveTab('timeoff')} className={tabButtonClass('timeoff')}>
                Time Off{counts.timeoff != null && <CountBadge value={counts.timeoff} />}
              </button>
            )}
          </div>

          {activeTab === 'work' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Department</label>
                <select value={form.department_id} onChange={update('department_id')} className={inputClass}>
                  <option value="">— None —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
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
                <select value={form.manager_id} onChange={update('manager_id')} className={inputClass}>
                  <option value="">— None —</option>
                  {employees
                    .filter((e) => String(e.id) !== id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
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

              <div>
                <label className={labelClass}>Working Schedule</label>
                <select value={form.working_schedule_id} onChange={update('working_schedule_id')} className={inputClass}>
                  <option value="">— None —</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({Number(s.weekly_hours)}h/wk)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Work Email</label>
                  <input type="email" value={form.work_email} onChange={update('work_email')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Work Phone</label>
                  <input type="tel" value={form.work_phone} onChange={update('work_phone')} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Bank Account</label>
                <input
                  value={form.bank_account}
                  onChange={update('bank_account')}
                  className={inputClass}
                  placeholder="For payroll — used to flag payslips with missing bank details"
                />
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Private Email</label>
                  <input type="email" value={form.private_email} onChange={update('private_email')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Private Phone</label>
                  <input type="tel" value={form.private_phone} onChange={update('private_phone')} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Address</label>
                <input value={form.home_address} onChange={update('home_address')} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input value={form.home_city} onChange={update('home_city')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input value={form.home_state} onChange={update('home_state')} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Country</label>
                  <input value={form.home_country} onChange={update('home_country')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={update('date_of_birth')} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Gender</label>
                  <select value={form.gender} onChange={update('gender')} className={inputClass}>
                    <option value="">— None —</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Marital Status</label>
                  <select value={form.marital_status} onChange={update('marital_status')} className={inputClass}>
                    <option value="">— None —</option>
                    {MARITAL_STATUSES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && !isNew && <EmployeeAttendanceTab employeeId={id} />}

          {activeTab === 'contracts' && !isNew && <EmployeeContractsTab employeeId={id} />}

          {activeTab === 'timeoff' && !isNew && <EmployeeTimeOffTab employeeId={id} />}

          {!['attendance', 'contracts', 'timeoff'].includes(activeTab) && error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          {!['attendance', 'contracts', 'timeoff'].includes(activeTab) && (
          <div className="flex gap-3 pt-6 mt-2 border-t border-navy-950/10">
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
          )}
        </form>
      </div>
    </div>
  );
}

function CountBadge({ value }) {
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-navy-950/10 text-[11px] font-semibold text-navy-950">
      {value}
    </span>
  );
}
