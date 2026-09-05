import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const STATUS_LABEL = {
  present: 'Present',
  checked_in: 'Working',
  missing_checkout: 'Missing Checkout',
  absent: 'Absent',
};

export function statusBadgeClass(status) {
  if (status === 'present') return 'px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700';
  if (status === 'absent') return 'px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700';
  if (status === 'missing_checkout') return 'px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700';
  return 'px-2 py-0.5 rounded-full text-xs font-medium bg-cream-100 text-muted';
}

export function formatTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
}

export function toLocalInputValue(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function SummaryRow({ summary }) {
  const items = [
    ['Present', summary.present],
    ['Late', summary.late],
    ['Overtime', summary.overtime],
    ['Absent', summary.absent],
    ['Missing Checkout', summary.missingCheckout],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
      {items.map(([label, value]) => (
        <div key={label} className="bg-white rounded-xl border border-navy-950/10 p-4 text-center">
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs text-muted mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function EditForm({ record, onSave, onCancel }) {
  const [checkIn, setCheckIn] = useState(toLocalInputValue(record.check_in));
  const [checkOut, setCheckOut] = useState(toLocalInputValue(record.check_out));

  return (
    <div className="bg-white rounded-xl border border-gold-500/40 p-4 mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-muted mb-1">Check In</label>
        <input
          type="datetime-local"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Check Out</label>
        <input
          type="datetime-local"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={() => onSave({ check_in: checkIn, check_out: checkOut || null })}
        className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10"
      >
        Cancel
      </button>
    </div>
  );
}

// showEmployeeColumns: adds Employee (linking to that employee's profile, Attendance tab)
// and Department columns — used on the HR all-employees view, omitted on the single-employee
// view (Attendance tab on an Employee's own profile).
export function RecordsTable({ records, editable, onEdit, showEmployeeColumns, sortDir, onToggleSort }) {
  return (
    <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-muted text-left">
            <tr>
              <th
                className={`px-4 py-3 font-medium ${onToggleSort ? 'cursor-pointer select-none' : ''}`}
                onClick={onToggleSort}
              >
                <span className="inline-flex items-center gap-1">
                  Date {onToggleSort && (sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
                </span>
              </th>
              {showEmployeeColumns && <th className="px-4 py-3 font-medium">Employee</th>}
              {showEmployeeColumns && <th className="px-4 py-3 font-medium">Department</th>}
              <th className="px-4 py-3 font-medium">Check In</th>
              <th className="px-4 py-3 font-medium">Check Out</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const canEdit = editable && r.status !== 'absent';
              return (
                <tr
                  key={`${r.employee_id ?? 'me'}-${r.date}-${r.check_in ?? ''}`}
                  onClick={() => canEdit && onEdit(r)}
                  className={`border-t border-navy-950/10 ${canEdit ? 'hover:bg-cream-100 cursor-pointer' : ''}`}
                >
                  <td className="px-4 py-3 text-ink font-medium">{r.date}</td>
                  {showEmployeeColumns && (
                    <td className="px-4 py-3">
                      <Link
                        to={`/employees/${r.employee_id}?tab=attendance`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-navy-950 font-medium hover:underline"
                      >
                        {r.employee_name}
                      </Link>
                    </td>
                  )}
                  {showEmployeeColumns && <td className="px-4 py-3 text-muted">{r.department_name ?? '—'}</td>}
                  <td className="px-4 py-3 text-muted">{formatTime(r.check_in)}</td>
                  <td className="px-4 py-3 text-muted">{formatTime(r.check_out)}</td>
                  <td className="px-4 py-3 text-muted">{r.worked_hours ?? '--'}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(r.status)}>{STATUS_LABEL[r.status]}</span>
                    {r.is_late && r.status === 'present' && (
                      <span className="ml-1 text-xs text-orange-600">late</span>
                    )}
                    {r.is_overtime && r.status === 'present' && (
                      <span className="ml-1 text-xs text-gold-600">overtime</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
