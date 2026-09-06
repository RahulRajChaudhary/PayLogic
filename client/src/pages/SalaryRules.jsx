import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PAYROLL_ADMIN_ROLES } from '../constants/roles';
import { salaryStructuresApi } from '../api/salaryStructures';
import { salaryRulesApi } from '../api/salaryRules';
import Pagination from '../components/ui/Pagination';

const CATEGORIES = ['basic', 'allowance', 'gross', 'deduction', 'net'];
const METHODS = ['fixed', 'percentage', 'formula'];
const CATEGORY_LABEL = { basic: 'Basic', allowance: 'Allowance', gross: 'Gross', deduction: 'Deduction', net: 'Net' };
const METHOD_LABEL = { fixed: 'Fixed Amount', percentage: 'Percentage', formula: 'Formula' };

const EMPTY_FORM = {
  structure_id: '', name: '', code: '', category: 'allowance', sequence: '',
  computation_method: 'fixed', amount: '', percentage: '', percentage_of_code: '', formula: '',
};

function methodSummary(rule) {
  if (rule.computation_method === 'fixed') return `Fixed: ${rule.amount}`;
  if (rule.computation_method === 'percentage') return `${rule.percentage}% of ${rule.percentage_of_code}`;
  return rule.formula;
}

export default function SalaryRules() {
  const [searchParams] = useSearchParams();
  const structureIdParam = searchParams.get('structure_id') || '';
  const structureNameParam = searchParams.get('structure_name') || '';
  const { user } = useAuth();
  const canEdit = PAYROLL_ADMIN_ROLES.includes(user?.role);

  const [structures, setStructures] = useState([]);
  const [structureFilter, setStructureFilter] = useState(structureIdParam);
  const [rules, setRules] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, structure_id: structureIdParam });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // limit: 100 — feeds the structure filter/picker dropdowns, needs every structure.
    salaryStructuresApi.list({ limit: 100 }).then((res) => setStructures(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [structureFilter]);

  function load() {
    setError('');
    salaryRulesApi
      .list({ structureId: structureFilter || undefined, page })
      .then((res) => {
        setRules(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err.message));
  }
  useEffect(load, [structureFilter, page]);

  function startCreate() {
    setForm({ ...EMPTY_FORM, structure_id: structureFilter });
    setEditingId('new');
  }
  function startEdit(r) {
    setForm({
      structure_id: r.structure_id, name: r.name, code: r.code, category: r.category,
      sequence: r.sequence, computation_method: r.computation_method,
      amount: r.amount ?? '', percentage: r.percentage ?? '',
      percentage_of_code: r.percentage_of_code ?? '', formula: r.formula ?? '',
    });
    setEditingId(r.id);
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    const payload = {
      structure_id: Number(form.structure_id),
      name: form.name,
      code: form.code,
      category: form.category,
      sequence: Number(form.sequence),
      computation_method: form.computation_method,
      amount: form.computation_method === 'fixed' ? Number(form.amount) : null,
      percentage: form.computation_method === 'percentage' ? Number(form.percentage) : null,
      percentage_of_code: form.computation_method === 'percentage' ? form.percentage_of_code : null,
      formula: form.computation_method === 'formula' ? form.formula : null,
    };
    try {
      if (editingId === 'new') {
        await salaryRulesApi.create(payload);
      } else {
        await salaryRulesApi.update(editingId, payload);
      }
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'rounded-lg border border-navy-950/15 px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink">
            Salary Rules{structureNameParam ? ` — ${structureNameParam}` : ''}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={structureFilter} onChange={(e) => setStructureFilter(e.target.value)} className={inputClass}>
              <option value="">— All structures —</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {canEdit && (
              <button type="button" onClick={startCreate} className="bg-navy-950 text-cream-50 rounded-lg px-3 py-2 text-sm font-medium hover:bg-navy-800">
                Add Rule
              </button>
            )}
          </div>
        </div>
        <Link to="/salary-structures" className="text-xs text-navy-950 hover:underline">&larr; Back to Structures</Link>

        {error && <p className="text-sm text-red-600 my-4">{error}</p>}

        {editingId && (
          <div className="bg-white rounded-xl border border-gold-500/40 p-4 my-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Structure</label>
              <select value={form.structure_id} onChange={(e) => setForm({ ...form, structure_id: e.target.value })} className={inputClass}>
                <option value="">— Select —</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Rule Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. House Rent Allowance" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Code</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={`${inputClass} w-28`} placeholder="HRA" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Sequence</label>
              <input type="number" value={form.sequence} onChange={(e) => setForm({ ...form, sequence: e.target.value })} className={`${inputClass} w-20`} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Computation</label>
              <select value={form.computation_method} onChange={(e) => setForm({ ...form, computation_method: e.target.value })} className={inputClass}>
                {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
              </select>
            </div>

            {form.computation_method === 'fixed' && (
              <div>
                <label className="block text-xs text-muted mb-1">Amount</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputClass} w-28`} />
              </div>
            )}
            {form.computation_method === 'percentage' && (
              <>
                <div>
                  <label className="block text-xs text-muted mb-1">Percentage</label>
                  <input type="number" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} className={`${inputClass} w-24`} placeholder="40" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Of Code</label>
                  <input type="text" value={form.percentage_of_code} onChange={(e) => setForm({ ...form, percentage_of_code: e.target.value.toUpperCase() })} className={`${inputClass} w-28`} placeholder="BASIC or CONTRACT_WAGE" />
                </div>
              </>
            )}
            {form.computation_method === 'formula' && (
              <div>
                <label className="block text-xs text-muted mb-1">Formula</label>
                <input type="text" value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} className={`${inputClass} w-52`} placeholder="GROSS - PF" />
              </div>
            )}

            <button
              type="button"
              disabled={submitting || !form.structure_id || !form.name || !form.code || !form.sequence}
              onClick={handleSave}
              className="bg-navy-950 text-cream-50 rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="bg-cream-100 text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-navy-950/10">
              Cancel
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-navy-950/10 overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Rule Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Structure</th>
                  <th className="px-4 py-3 font-medium">Sequence</th>
                  <th className="px-4 py-3 font-medium">Computation</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t border-navy-950/10">
                    <td className="px-4 py-3 text-ink font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted">{r.code}</td>
                    <td className="px-4 py-3 text-muted">{CATEGORY_LABEL[r.category]}</td>
                    <td className="px-4 py-3 text-muted">{r.structure_name}</td>
                    <td className="px-4 py-3 text-muted">{r.sequence}</td>
                    <td className="px-4 py-3 text-muted">{methodSummary(r)}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <button type="button" onClick={() => startEdit(r)} className="text-xs text-navy-950 hover:underline">
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted">No salary rules yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}
