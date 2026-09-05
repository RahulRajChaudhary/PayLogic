import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { http } from '../api/http';

// Renders your real dashboard screenshot once you drop one at
// client/public/dashboard-screenshot.png. Until then, falls back to a plain
// placeholder frame instead of a broken image icon.
function DashboardPreview() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-200 bg-slate-50">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
      </div>
      {failed ? (
        <div className="aspect-[16/9] flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
          Drop your dashboard screenshot at client/public/dashboard-screenshot.png
        </div>
      ) : (
        <img
          src="/dashboard-screenshot.png"
          alt="Paylogic admin dashboard"
          className="w-full aspect-[16/9] object-cover object-top"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const [companyExists, setCompanyExists] = useState(null); // null = still checking

  useEffect(() => {
    http
      .get('/company/status')
      .then((res) => setCompanyExists(res.exists))
      .catch(() => setCompanyExists(true)); // fail safe: assume set up, don't dangle onboarding
  }, []);

  if (loading || companyExists === null) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-700 to-violet-900" />
          <span className="font-bold text-lg tracking-tight text-slate-900">Paylogic</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/setup"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
          >
            Onboard Your Company
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-full bg-violet-700 text-white text-sm font-semibold px-5 py-2 hover:bg-violet-800 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="px-6 sm:px-10 pt-14 pb-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 max-w-2xl mx-auto">
          HR &amp; Payroll, connected end to end.
        </h1>
        <p className="text-slate-500 text-lg mt-4 max-w-lg mx-auto">
          Employees, contracts, attendance, time off, and payroll — one operational flow
          instead of disconnected spreadsheets.
        </p>

        <div className="flex items-center justify-center gap-4 mt-8">
          <Link
            to="/setup"
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-700 text-white text-sm font-semibold px-7 py-3 hover:bg-violet-800 transition-colors"
          >
            Onboard Your Company →
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 text-slate-700 text-sm font-semibold px-7 py-3 hover:bg-white transition-colors"
          >
            Sign In as Admin
          </Link>
        </div>

        <div className="max-w-4xl mx-auto mt-16">
          <DashboardPreview />
        </div>
      </main>
    </div>
  );
}
