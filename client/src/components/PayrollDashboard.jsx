import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Wallet, FileText, TrendingUp, CalendarCheck, Activity, AlertTriangle } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { departmentsApi } from '../api/departments';
import StatCard from './ui/StatCard';
import Spinner from './ui/Spinner';

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function monthToRange(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { periodStart: fmt(start), periodEnd: fmt(end) };
}
const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function Panel({ title, source, children }) {
  return (
    <div className="bg-white rounded-xl border border-navy-950/10 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {source && <p className="text-[11px] text-muted">{source}</p>}
      </div>
      {children}
    </div>
  );
}

const CHART_TOOLTIP = {
  contentStyle: { borderRadius: 8, border: '1px solid rgba(16,26,44,0.12)', fontSize: 12 },
};

export default function PayrollDashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [departmentId, setDepartmentId] = useState('');
  const [employeeType, setEmployeeType] = useState('');
  const [departments, setDepartments] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // limit: 100 — feeds the department filter dropdown, needs every department.
  useEffect(() => { departmentsApi.list({ limit: 100 }).then((res) => setDepartments(res.data)).catch(() => {}); }, []);

  function load() {
    setError('');
    const { periodStart, periodEnd } = monthToRange(month);
    dashboardApi.summary({ periodStart, periodEnd, departmentId: departmentId || undefined, employeeType: employeeType || undefined })
      .then(setData)
      .catch((err) => setError(err.message));
  }
  useEffect(load, [month, departmentId, employeeType]);

  const inputClass = 'rounded-lg border border-navy-950/15 px-3 py-2 text-sm bg-white';

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Payroll Dashboard</h1>
          <p className="text-sm text-muted">Live view across payroll, attendance and leave.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={employeeType} onChange={(e) => setEmployeeType(e.target.value)} className={inputClass}>
            <option value="">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!data && !error && <Spinner />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={Wallet} label="Total Net Salary Paid" value={money(data.kpis.totalNetSalaryPaid)} />
            <StatCard icon={FileText} label="Payslips Generated" value={data.kpis.payslipsGenerated.total}
              sub={`${data.kpis.payslipsGenerated.paid} paid · ${data.kpis.payslipsGenerated.pending} pending`} />
            <StatCard icon={TrendingUp} label="Avg Salary / Employee" value={money(data.kpis.avgSalaryPerEmployee)} />
            <StatCard icon={CalendarCheck} label="Approved Time Off" value={`${data.kpis.approvedTimeOffDays} days`} />
            <StatCard icon={Activity} label="Attendance Health" value={`${data.kpis.attendanceHealthPct}%`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Panel title="Salary Cost by Department" source="Payslips + Department">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.salaryByDepartment} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,26,44,0.08)" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#7a7266' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#7a7266' }} axisLine={false} tickLine={false} />
                  <Tooltip {...CHART_TOOLTIP} cursor={{ fill: 'rgba(16,26,44,0.04)' }} formatter={(v) => money(v)} />
                  <Bar dataKey="cost" fill="#16233a" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Monthly Net Salary Trend" source="Historical payslips">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.monthlyTrend} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,26,44,0.08)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7a7266' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#7a7266' }} axisLine={false} tickLine={false} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="totalNet" stroke="#c9862e" strokeWidth={2.5} dot={{ r: 3, fill: '#c9862e' }} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Panel title="Payroll Alerts" source="Payrun + Payslip validation">
              <ul className="text-sm space-y-2">
                {data.alerts.warnings.map((w) => (
                  <li key={w.message} className="flex gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w.count} × {w.message}</span>
                  </li>
                ))}
                {data.alerts.unvalidatedDrafts > 0 && (
                  <li className="flex gap-2 text-amber-700"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{data.alerts.unvalidatedDrafts} draft(s) not validated</span></li>
                )}
                {data.alerts.contractsExpiringSoon > 0 && (
                  <li className="flex gap-2 text-amber-700"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{data.alerts.contractsExpiringSoon} contract(s) expiring within 30 days</span></li>
                )}
                {data.alerts.warnings.length === 0 && data.alerts.unvalidatedDrafts === 0 && data.alerts.contractsExpiringSoon === 0 && (
                  <li className="text-muted">No alerts — payroll is clean.</li>
                )}
              </ul>
            </Panel>

            <Panel title="Attendance Overview" source="Attendance">
              <dl className="text-sm space-y-1.5">
                {[
                  ['Present', data.attendanceOverview.present],
                  ['Late', data.attendanceOverview.late],
                  ['Absent', data.attendanceOverview.absent],
                  ['Overtime', data.attendanceOverview.overtime],
                  ['Missing check-outs', data.attendanceOverview.missingCheckout],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="tabular-nums">{v}</dd></div>
                ))}
                <div className="flex justify-between font-medium border-t border-navy-950/10 pt-1.5 mt-1.5">
                  <dt className="text-ink">Coverage</dt><dd className="tabular-nums">{data.attendanceOverview.coveragePct}%</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="Time Off Overview" source="Requests + Allocations">
              <table className="w-full text-sm">
                <thead className="text-muted text-left">
                  <tr><th className="py-1 font-medium">Type</th><th className="py-1 font-medium text-right">Appr.</th><th className="py-1 font-medium text-right">Pend.</th><th className="py-1 font-medium text-right">Bal.</th></tr>
                </thead>
                <tbody>
                  {data.timeOffOverview.map((t) => (
                    <tr key={t.type} className="border-t border-navy-950/5">
                      <td className="py-1">{t.type}</td>
                      <td className="py-1 text-right tabular-nums">{t.approvedDays}</td>
                      <td className="py-1 text-right tabular-nums">{t.pending}</td>
                      <td className="py-1 text-right tabular-nums">{t.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel title="Department Overview" source="Employees + Contracts + Payslips">
            <table className="w-full text-sm">
              <thead className="text-muted text-left">
                <tr><th className="py-1.5 font-medium">Department</th><th className="py-1.5 font-medium text-right">Headcount</th><th className="py-1.5 font-medium text-right">Monthly Salary</th></tr>
              </thead>
              <tbody>
                {data.departmentOverview.map((d) => (
                  <tr key={d.department} className="border-t border-navy-950/5">
                    <td className="py-1.5">{d.department}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.headcount}</td>
                    <td className="py-1.5 text-right tabular-nums">{money(d.monthlySalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </div>
  );
}
