import { useEffect, useState } from 'react';
import { attendanceApi } from '../api/attendance';

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatToday() {
  return new Date().toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AttendanceWidget({ openRecord, onChange }) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!openRecord) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [openRecord]);

  async function handleCheckIn() {
    setError('');
    setSubmitting(true);
    try {
      await attendanceApi.checkIn();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    setError('');
    setSubmitting(true);
    try {
      await attendanceApi.checkOut();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const buttonClass =
    'bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50';

  if (!openRecord) {
    return (
      <div className="bg-white rounded-xl border border-navy-950/10 p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted">Today's Attendance · {formatToday()}</p>
          <p className="text-ink font-medium mt-1">Not Checked In</p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
        <button type="button" onClick={handleCheckIn} disabled={submitting} className={buttonClass}>
          {submitting ? 'Checking in...' : 'Check In'}
        </button>
      </div>
    );
  }

  const checkInTime = new Date(openRecord.check_in);
  const worked = formatDuration(now - checkInTime);

  return (
    <div className="bg-white rounded-xl border border-navy-950/10 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted">You're currently working · {formatToday()}</p>
          <p className="text-ink font-medium mt-1">
            Checked in at {checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button type="button" onClick={handleCheckOut} disabled={submitting} className={buttonClass}>
          {submitting ? 'Checking out...' : 'Check Out'}
        </button>
      </div>
      <p className="text-sm text-muted mt-3">Worked {worked}</p>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
