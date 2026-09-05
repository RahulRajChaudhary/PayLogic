import { useEffect, useState } from 'react';
import { attendanceApi } from '../api/attendance';
import { SummaryRow, EditForm, RecordsTable } from './attendance/AttendanceParts';

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Single-employee attendance history, shown as a tab on that employee's profile
// (EmployeeForm.jsx). Reuses the same GET /attendance endpoint the HR all-employees
// view uses — employee_id alone (no date) scopes it back to one person's whole month.
export default function EmployeeAttendanceTab({ employeeId }) {
  const [month, setMonth] = useState(currentYearMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  function load() {
    setError('');
    attendanceApi
      .list({ employeeId, month })
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [employeeId, month]);

  const sortedRecords = data
    ? [...data.records].sort((a, b) => (sortDir === 'asc' ? 1 : -1) * a.date.localeCompare(b.date))
    : [];

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
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {data && (
        <>
          <SummaryRow summary={data.summary} />
          {editing && (
            <EditForm record={editing} onSave={handleSaveEdit} onCancel={() => setEditing(null)} />
          )}
          <RecordsTable
            records={sortedRecords}
            editable
            onEdit={setEditing}
            showEmployeeColumns={false}
            sortDir={sortDir}
            onToggleSort={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          />
        </>
      )}
    </div>
  );
}
