import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HR_ROLES } from '../constants/roles';

// Mirrors the demo cast seeded in server/db/seed.js (shared password).
// Rendered only under `npm run dev` — see import.meta.env.DEV gate below.
const DEMO_PASSWORD = 'Demo@1234';
const DEMO_ACCOUNTS = [
  { label: 'HR Manager', email: 'sara.khan@paylogic.demo' },
  { label: 'Payroll User', email: 'aarav.mehta@paylogic.demo' },
  { label: 'Payroll Mgr', email: 'neha.patel@paylogic.demo' },
  { label: 'Employee', email: 'john.dsouza@paylogic.demo' },
  { label: 'Admin', email: 'priya.sharma@paylogic.demo' },
];

function HeroLineArt() {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path
        d="M 520 0 C 460 160 560 260 480 400 C 400 540 500 640 420 800"
        fill="none"
        className="stroke-gold-500/55"
        strokeWidth="1.5"
      />
      <path
        d="M 560 0 C 500 180 600 280 520 420 C 440 560 540 660 460 800"
        fill="none"
        className="stroke-cream-50/10"
        strokeWidth="1"
      />
      <path
        d="M 480 0 C 420 140 520 240 440 380 C 360 520 460 620 380 800"
        fill="none"
        className="stroke-cream-50/8"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(HR_ROLES.includes(loggedInUser.role) ? '/employees' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left — hero panel. Hidden below the lg breakpoint. */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-navy-950 text-cream-50 p-12">
        <HeroLineArt />

        <div className="relative flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-cream-50/10 backdrop-blur flex items-center justify-center font-bold">
            P
          </span>
          <span className="font-bold text-lg tracking-tight">Paylogic</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-500 mb-3">
            A clearer way to run payroll
          </p>
          <h2 className="text-3xl font-black leading-tight">
            HR &amp; Payroll, connected end to end.
          </h2>
          <p className="mt-4 text-cream-50/80">
            From employee master data to validated payslips — one operational flow,
            not ten disconnected spreadsheets.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-cream-50/90">
            <li className="flex gap-3">
              <span className="text-gold-500">✓</span>
              Employee hub linking contracts, schedules, attendance &amp; leave
            </li>
            <li className="flex gap-3">
              <span className="text-gold-500">✓</span>
              Period-accurate payroll driven by configurable salary rules
            </li>
            <li className="flex gap-3">
              <span className="text-gold-500">✓</span>
              Live dashboard across periods, departments &amp; employee types
            </li>
            <li className="flex gap-3">
              <span className="text-gold-500">✓</span>
              Role-based access for HR, Payroll &amp; Admins
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-cream-50/50">© 2026 Paylogic — Integrated HR &amp; Payroll</p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center bg-cream-50 px-4 py-12 overflow-y-auto">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-navy-950/10 p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-600 text-center">
            Welcome back
          </p>
          <h1 className="text-2xl font-black text-ink text-center mt-2">Log in to Paylogic</h1>
          <p className="text-muted text-center mt-1 mb-6">
            Sign in to continue to your workspace.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-navy-950/15 pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-navy-950/15 pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-navy-950 text-cream-50 rounded-lg py-2 font-medium hover:bg-navy-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Signing in...' : 'Log in'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 border-t border-navy-950/10 pt-4">
              <p className="text-xs text-muted mb-2 text-center">Demo accounts (dev only)</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="text-xs rounded-full border border-gold-500/40 px-3 py-1 text-gold-600 hover:bg-gold-500/10"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted text-center mt-6">
            Accounts are created by an administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
