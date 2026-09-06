import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HR_ROLES } from '../constants/roles';
import { attendanceApi } from '../api/attendance';
import { departmentsApi } from '../api/departments';
import { hrFilterState, setHrFilterState } from '../state/attendanceFilters';
import AttendanceWidget from '../components/AttendanceWidget';
import { SummaryRow, EditForm, RecordsTable } from '../components/attendance/AttendanceParts';

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function todayStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function Attendance() {
  const { user } = useAuth();
  const isHrRole = HR_ROLES.includes(user?.role);

  // Non-HR (self-service): whole month, own records, unchanged behavior.
  const [month, setMonth] = useState(currentYearMonth());

  // HR: a single day across all employees, optionally narrowed by department.
  const [date, setDate] = useState(isHrRole ? hrFilterState.date : todayStr());
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(isHrRole ? hrFilterState.departmentId : '');

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [editing, setEditing] = useState(null);

  // Write-through: keep the module-level store in sync so it survives this component
  // unmounting when the user navigates to another page, then remounting later.
  useEffect(() => {
    if (isHrRole) {
      setHrFilterState({ date, departmentId: selectedDepartmentId });
    }
  }, [isHrRole, date, selectedDepartmentId]);

  useEffect(() => {
    if (isHrRole) {
      // limit: 100 — feeds the department filter dropdown, needs every department.
      departmentsApi.list({ limit: 100 }).then((res) => setDepartments(res.data)).catch(() => {});
    }
  }, [isHrRole]);

  function load() {
    setError('');
    const request = isHrRole
      ? attendanceApi.list({ departmentId: selectedDepartmentId || undefined, date })
      : attendanceApi.me(month);
    request.then(setData).catch((err) => setError(err.message));
  }

  useEffect(load, [month, isHrRole, date, selectedDepartmentId]);

  async function handleSaveEdit(payload) {
    try {
      await attendanceApi.update(editing.id, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className={isHrRole ? 'max-w-6xl mx-auto' : 'max-w-4xl mx-auto'}>
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">{isHrRole ? 'Attendance' : 'My Attendance'}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {isHrRole && (
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
              >
                <option value="">— All departments —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            {isHrRole ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
              />
            ) : (
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>

        {!isHrRole && (
          <div className="mb-6">
            <AttendanceWidget openRecord={data?.openRecord ?? null} onChange={load} />
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {data && (
          <>
            <SummaryRow summary={data.summary} />
            {editing && (
              <EditForm record={editing} onSave={handleSaveEdit} onCancel={() => setEditing(null)} />
            )}
            <RecordsTable
              records={data.records}
              editable={isHrRole}
              onEdit={setEditing}
              showEmployeeColumns={isHrRole}
            />
          </>
        )}
      </div>
    </div>
  );
}
