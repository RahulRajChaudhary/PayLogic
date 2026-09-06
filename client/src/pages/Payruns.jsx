import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { payrunsApi } from '../api/payruns';
import { salaryStructuresApi } from '../api/salaryStructures';

const STATUS_BADGE = {
  draft: 'bg-cream-100 text-muted',
  computed: 'bg-blue-100 text-blue-700',
  validated: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
};
function statusBadgeClass(status) {
  return `px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-cream-100 text-muted'}`;
}

const EMPTY_WIZARD_FORM = { name: '', structure_id: '', period_start: '', period_end: '' };

export default function Payruns() {
  const navigate = useNavigate();
  const [payruns, setPayruns] = useState([]);
  const [structures, setStructures] = useState([]);
  const [error, setError] = useState('');

  const [wizardStep, setWizardStep] = useState(0); // 0 = closed, 1, 2
  const [wizardForm, setWizardForm] = useState(EMPTY_WIZARD_FORM);
  const [eligible, setEligible] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setError('');
    payrunsApi.list().then(setPayruns).catch((err) => setError(err.message));
  }
  useEffect(load, []);
  useEffect(() => { salaryStructuresApi.list().then(setStructures).catch(() => {}); }, []);

  function startWizard() {
    setWizardForm(EMPTY_WIZARD_FORM);
    setSelected(new Set());
    setError('');
    setWizardStep(1);
  }

  // Step 1 never writes anything — only "Continue" fetches eligible employees, and only
  // "Create Payrun" (handleCreatePayrun) actually calls POST /payruns. Matches PDF §B5.
  async function handleContinue() {
    setError('');
    try {
      const emps = await payrunsApi.eligibleEmployees({
        structureId: wizardForm.structure_id,
        periodStart: wizardForm.period_start,
        periodEnd: wizardForm.period_end,
      });
      setEligible(emps);
      setSelected(new Set());
      setWizardStep(2);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleEmployee(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  async function handleCreatePayrun() {
    setSubmitting(true);
    setError('');
    try {
      const payrun = await payrunsApi.create({
        name: wizardForm.name,
        structure_id: Number(wizardForm.structure_id),
        period_start: wizardForm.period_start,
        period_end: wizardForm.period_end,
        employee_ids: [...selected],
      });
      setWizardStep(0);
      navigate(`/payruns/${payrun.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-navy-950/15 px-3 py-2 text-sm';
  const selectedStructureName = structures.find((s) => String(s.id) === wizardForm.structure_id)?.name;

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-ink">Payruns</h1>
          {wizardStep === 0 && (
            <button type="button" onClick={startWizard} className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800">
              New Payrun
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {wizardStep === 1 && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-ink">Step 1: Scope &amp; Period</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1">Payrun Name</label>
                <input
                  value={wizardForm.name}
                  onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. September 2026"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Salary Structure</label>
                <select value={wizardForm.structure_id} onChange={(e) => setWizardForm({ ...wizardForm, structure_id: e.target.value })} className={inputClass}>
                  <option value="">— Select —</option>
                  {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Period Start</label>
                <input type="date" value={wizardForm.period_start} onChange={(e) => setWizardForm({ ...wizardForm, period_start: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Period End</label>
                <input type="date" value={wizardForm.period_end} onChange={(e) => setWizardForm({ ...wizardForm, period_end: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!wizardForm.name || !wizardForm.structure_id || !wizardForm.period_start || !wizardForm.period_end}
                onClick={handleContinue}
                className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
              >
                Continue
              </button>
              <button type="button" onClick={() => setWizardStep(0)} className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10">
                Discard
              </button>
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-ink">Step 2: Select Employees</h2>
            <p className="text-xs text-muted">
              Employees eligible for &quot;{selectedStructureName}&quot;, {wizardForm.period_start} – {wizardForm.period_end}
              (their current contract must be assigned to this structure and cover the period).
            </p>
            <div className="border border-navy-950/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-muted text-left">
                  <tr>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2 font-medium">Employee</th>
                    <th className="px-4 py-2 font-medium">Contract</th>
                    <th className="px-4 py-2 font-medium">Wage</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((e) => (
                    <tr key={e.id} className="border-t border-navy-950/10">
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleEmployee(e.id)} />
                      </td>
                      <td className="px-4 py-2 text-ink font-medium">{e.name}</td>
                      <td className="px-4 py-2 text-muted">{e.contract_code}</td>
                      <td className="px-4 py-2 text-muted">{e.wage}</td>
                    </tr>
                  ))}
                  {eligible.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No eligible employees for this structure and period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting || selected.size === 0}
                onClick={handleCreatePayrun}
                className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Payrun'}
              </button>
              <button type="button" onClick={() => setWizardStep(1)} className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10">
                Back
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Structure</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Employees</th>
                <th className="px-4 py-3 font-medium">Warnings</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payruns.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/payruns/${p.id}`)} className="border-t border-navy-950/10 hover:bg-cream-100 cursor-pointer">
                  <td className="px-4 py-3 text-ink font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted">{p.structure_name}</td>
                  <td className="px-4 py-3 text-muted">{p.period_start} — {p.period_end}</td>
                  <td className="px-4 py-3 text-muted">{p.payslip_count}</td>
                  <td className="px-4 py-3 text-muted">{Number(p.warning_count) > 0 ? `${p.warning_count} warning(s)` : '—'}</td>
                  <td className="px-4 py-3"><span className={statusBadgeClass(p.status)}>{p.status}</span></td>
                </tr>
              ))}
              {payruns.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">No payruns yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
