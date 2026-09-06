import { useEffect, useState } from 'react';
import { timeOffApi } from '../api/timeOff';
import Badge from './ui/Badge';

// Single-employee Time Off history, shown as a tab on that employee's profile
// (EmployeeForm.jsx) — the PDF asks for Contracts, Attendance, *and* Time Off links
// from the Employee Form; this closes the Time Off one.
export default function EmployeeTimeOffTab({ employeeId }) {
  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  function load() {
    setError('');
    // limit: 100 — a single employee's own history, small enough to show in full on this tab.
    timeOffApi.allocations({ employeeId, limit: 100 }).then((res) => setAllocations(res.data)).catch((err) => setError(err.message));
    timeOffApi.list({ employeeId, limit: 100 }).then((res) => setRequests(res.data)).catch((err) => setError(err.message));
  }
  useEffect(load, [employeeId]);

  async function act(fn, id) {
    setError('');
    try {
      await fn(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h3 className="text-sm font-medium text-ink mb-3">Leave Balances</h3>
        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-muted text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Allocated</th>
                <th className="px-4 py-2 font-medium">Taken</th>
                <th className="px-4 py-2 font-medium">Remaining</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} className="border-t border-navy-950/10">
                  <td className="px-4 py-2 text-ink font-medium">{a.type_name}</td>
                  <td className="px-4 py-2 text-muted">{a.allocated} {a.unit}s</td>
                  <td className="px-4 py-2 text-muted">{a.taken}</td>
                  <td className="px-4 py-2 text-ink font-medium">{a.remaining}</td>
                  <td className="px-4 py-2"><Badge status={a.status} /></td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-muted">No allocations.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-ink mb-3">Requests</h3>
        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-muted text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Dates</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-navy-950/10">
                  <td className="px-4 py-2 text-ink font-medium">{r.type_name}</td>
                  <td className="px-4 py-2 text-muted">{r.start_date} — {r.end_date}</td>
                  <td className="px-4 py-2 text-muted">{r.duration}</td>
                  <td className="px-4 py-2"><Badge status={r.status} /></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {r.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => act(timeOffApi.approve, r.id)} className="text-xs text-green-700 hover:underline mr-3">Approve</button>
                        <button type="button" onClick={() => act(timeOffApi.refuse, r.id)} className="text-xs text-red-600 hover:underline">Refuse</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-muted">No requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
