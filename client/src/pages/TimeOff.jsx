import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HR_ROLES } from '../constants/roles';
import { timeOffApi } from '../api/timeOff';
import Pagination from '../components/ui/Pagination';

const STATUS_BADGE = {
  pending: 'bg-cream-100 text-muted',
  approved: 'bg-green-100 text-green-700',
  refused: 'bg-red-100 text-red-700',
  cancelled: 'bg-cream-100 text-muted',
};

function statusBadgeClass(status) {
  return `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-cream-100 text-muted'}`;
}

function AllocationCards({ allocations }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {allocations.map((a) => (
        <div key={a.type_id} className="bg-white rounded-xl border border-navy-950/10 p-4">
          <p className="font-medium text-ink">{a.type_name}</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Allocated</span>
              <span>{a.allocated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Used</span>
              <span>{a.taken}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-ink">Remaining</span>
              <span>{a.remaining}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestForm({ types, onSubmit, error }) {
  const [typeId, setTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ type_id: Number(typeId), start_date: startDate, end_date: endDate, reason });
      setTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch {
      // error already surfaced via the `error` prop
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-navy-950/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-navy-950/10 p-6 mb-6 space-y-4">
      <h2 className="font-semibold text-ink">Request Time Off</h2>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Leave Type</label>
        <select required value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inputClass}>
          <option value="">— Select —</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">From</label>
          <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">To</label>
          <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Reason</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}

function RequestsTable({ requests, showEmployee, onCancel, onApprove, onRefuse }) {
  return (
    <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-muted text-left">
            <tr>
              {showEmployee && <th className="px-4 py-3 font-medium">Employee</th>}
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-navy-950/10">
                {showEmployee && <td className="px-4 py-3 text-ink font-medium">{r.employee_name}</td>}
                <td className="px-4 py-3 text-muted">{r.type_name}</td>
                <td className="px-4 py-3 text-muted">{r.start_date} — {r.end_date}</td>
                <td className="px-4 py-3 text-muted">{r.duration}</td>
                <td className="px-4 py-3 text-muted">{r.reason || '—'}</td>
                <td className="px-4 py-3">
                  <span className={statusBadgeClass(r.status)}>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  {onCancel && r.status === 'pending' && (
                    <button type="button" onClick={() => onCancel(r.id)} className="text-xs text-red-600 hover:underline">
                      Cancel
                    </button>
                  )}
                  {onApprove && r.status === 'pending' && (
                    <div className="flex gap-3">
                      <button type="button" onClick={() => onApprove(r.id)} className="text-xs text-green-700 hover:underline">
                        Approve
                      </button>
                      <button type="button" onClick={() => onRefuse(r.id)} className="text-xs text-red-600 hover:underline">
                        Refuse
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TimeOff() {
  const { user } = useAuth();
  const isHrRole = HR_ROLES.includes(user?.role);

  const [types, setTypes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    // limit: 100 — this feeds the leave-type dropdown in the request form, needs every type.
    timeOffApi.types({ limit: 100 }).then((res) => setTypes(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [isHrRole, statusFilter]);

  function load() {
    setError('');
    if (isHrRole) {
      timeOffApi
        .list({ status: statusFilter || undefined, page })
        .then((res) => {
          setRequests(res.data);
          setPagination(res.pagination);
        })
        .catch((err) => setError(err.message));
    } else {
      timeOffApi.myAllocations().then(setAllocations).catch((err) => setError(err.message));
      timeOffApi
        .myRequests({ page })
        .then((res) => {
          setRequests(res.data);
          setPagination(res.pagination);
        })
        .catch((err) => setError(err.message));
    }
  }

  useEffect(load, [isHrRole, statusFilter, page]);

  async function handleSubmit(payload) {
    setFormError('');
    try {
      await timeOffApi.createRequest(payload);
      load();
    } catch (err) {
      setFormError(err.message);
      throw err;
    }
  }

  async function handleCancel(id) {
    try {
      await timeOffApi.cancelRequest(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApprove(id) {
    try {
      await timeOffApi.approve(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRefuse(id) {
    try {
      await timeOffApi.refuse(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">{isHrRole ? 'Time Off' : 'My Time Off'}</h1>
          {isHrRole && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-navy-950/15 px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="refused">Refused</option>
              <option value="cancelled">Cancelled</option>
              <option value="">All</option>
            </select>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {!isHrRole && (
          <>
            <AllocationCards allocations={allocations} />
            <RequestForm types={types} onSubmit={handleSubmit} error={formError} />
          </>
        )}

        <RequestsTable
          requests={requests}
          showEmployee={isHrRole}
          onCancel={!isHrRole ? handleCancel : undefined}
          onApprove={isHrRole ? handleApprove : undefined}
          onRefuse={isHrRole ? handleRefuse : undefined}
        />
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}
