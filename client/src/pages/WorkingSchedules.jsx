import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { workingSchedulesApi } from '../api/workingSchedules';
import Pagination from '../components/ui/Pagination';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_LINE = { day: 'Monday', start_time: '09:00', end_time: '18:00', break_minutes: 60 };

// Mirrors the server's weekly-hours computation so the form total updates live.
function lineHours(line) {
  if (!line.start_time || !line.end_time) return 0;
  const [sh, sm] = line.start_time.split(':').map(Number);
  const [eh, em] = line.end_time.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm) - (Number(line.break_minutes) || 0);
  return Math.max(0, mins / 60);
}

export default function WorkingSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // null | 'new' | id
  const [name, setName] = useState('');
  const [lines, setLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError('');
    workingSchedulesApi
      .list({ page })
      .then((res) => {
        setSchedules(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err.message));
  }
  useEffect(load, [page]);

  function startCreate() {
    setName('');
    setLines(DAYS.slice(0, 5).map((day) => ({ ...DEFAULT_LINE, day })));
    setEditingId('new');
  }
  async function startEdit(id) {
    setError('');
    try {
      const s = await workingSchedulesApi.get(id);
      setName(s.name);
      setLines(s.lines.map((l) => ({
        day: l.day,
        start_time: (l.start_time || '').slice(0, 5),
        end_time: (l.end_time || '').slice(0, 5),
        break_minutes: l.break_minutes,
      })));
      setEditingId(id);
    } catch (err) {
      setError(err.message);
    }
  }

  function updateLine(i, patch) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines([...lines, { ...DEFAULT_LINE }]);
  }
  function removeLine(i) {
    setLines(lines.filter((_, idx) => idx !== i));
  }

  const totalHours = lines.reduce((sum, l) => sum + lineHours(l), 0);

  async function handleSave() {
    setSubmitting(true);
    setError('');
    const payload = {
      name,
      lines: lines.map((l) => ({
        day: l.day,
        start_time: l.start_time,
        end_time: l.end_time,
        break_minutes: Number(l.break_minutes) || 0,
      })),
    };
    try {
      if (editingId === 'new') await workingSchedulesApi.create(payload);
      else await workingSchedulesApi.update(editingId, payload);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'rounded-lg border border-navy-950/15 px-2 py-1.5 text-sm';

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">Working Schedules</h1>
          {editingId === null && (
            <button type="button" onClick={startCreate} className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800">
              New Schedule
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {editingId !== null ? (
          <div className="bg-white rounded-xl border border-gold-500/40 p-6 mb-6">
            <div className="mb-4 max-w-sm">
              <label className="block text-xs text-muted mb-1">Schedule Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} w-full`} placeholder="e.g. 40 Hours / Week" />
            </div>

            <div className="border border-navy-950/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-muted text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Day</th>
                    <th className="px-3 py-2 font-medium">Start</th>
                    <th className="px-3 py-2 font-medium">End</th>
                    <th className="px-3 py-2 font-medium">Break (min)</th>
                    <th className="px-3 py-2 font-medium">Hours</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-t border-navy-950/10">
                      <td className="px-3 py-2">
                        <select value={l.day} onChange={(e) => updateLine(i, { day: e.target.value })} className={inputClass}>
                          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="time" value={l.start_time} onChange={(e) => updateLine(i, { start_time: e.target.value })} className={inputClass} /></td>
                      <td className="px-3 py-2"><input type="time" value={l.end_time} onChange={(e) => updateLine(i, { end_time: e.target.value })} className={inputClass} /></td>
                      <td className="px-3 py-2"><input type="number" value={l.break_minutes} onChange={(e) => updateLine(i, { break_minutes: e.target.value })} className={`${inputClass} w-20`} /></td>
                      <td className="px-3 py-2 text-muted">{lineHours(l).toFixed(1)}h</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeLine(i)} className="p-1 rounded text-muted hover:bg-navy-950/10 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={addLine} className="text-sm text-navy-950 hover:underline">+ Add Day</button>
              <p className="text-sm font-medium text-ink">Total Weekly Hours: {totalHours.toFixed(1)}h</p>
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" disabled={submitting || !name.trim() || lines.length === 0} onClick={handleSave} className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Schedule'}
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Schedule Name</th>
                  <th className="px-4 py-3 font-medium">Days / Week</th>
                  <th className="px-4 py-3 font-medium">Hours / Week</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} onClick={() => startEdit(s.id)} className="border-t border-navy-950/10 hover:bg-cream-100 cursor-pointer">
                    <td className="px-4 py-3 text-ink font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted">{s.day_count}</td>
                    <td className="px-4 py-3 text-muted">{Number(s.weekly_hours)}h</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(s.id); }} className="text-xs text-navy-950 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No working schedules yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {editingId === null && <Pagination pagination={pagination} onPageChange={setPage} />}
      </div>
    </div>
  );
}
