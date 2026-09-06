import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HR_ROLES, PAYROLL_ROLES } from '../constants/roles';

const ADMIN_ROLES = ['admin'];

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-gold-500/20 text-gold-500' : 'text-cream-50/70 hover:bg-cream-50/10'
      }`}
    >
      {children}
    </Link>
  );
}

function NavDropdown({ label, items }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = items.some((i) => location.pathname === i.to || location.pathname.startsWith(`${i.to}/`));

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close the menu whenever navigation changes the current route.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-gold-500/20 text-gold-500' : 'text-cream-50/70 hover:bg-cream-50/10'
        }`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 min-w-44 bg-navy-900 border border-cream-50/10 rounded-lg shadow-lg py-1 z-20">
          {items.map((i) => {
            const itemActive = location.pathname === i.to;
            return (
              <Link
                key={i.to}
                to={i.to}
                className={`block px-4 py-2 text-sm ${
                  itemActive ? 'text-gold-500' : 'text-cream-50/80 hover:bg-cream-50/10'
                }`}
              >
                {i.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const isHr = HR_ROLES.includes(user.role);
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const isPayroll = PAYROLL_ROLES.includes(user.role);

  return (
    <header className="bg-navy-950 border-b border-navy-800 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="font-bold text-cream-50 text-lg tracking-tight">Paylogic</span>
          <nav className="flex items-center gap-1 flex-wrap">
            {isHr ? (
              <NavDropdown
                label="Employees"
                items={[
                  { to: '/employees', label: 'Employees' },
                  { to: '/departments', label: 'Departments' },
                  { to: '/contracts', label: 'Contracts' },
                  { to: '/working-schedules', label: 'Working Schedules' },
                ]}
              />
            ) : (
              <NavLink to="/dashboard">My Profile</NavLink>
            )}
            <NavLink to="/attendance">{isHr ? 'Attendance' : 'My Attendance'}</NavLink>
            {isHr ? (
              <NavDropdown
                label="Time Off"
                items={[
                  { to: '/time-off', label: 'Requests' },
                  { to: '/time-off/allocations', label: 'Allocations' },
                  { to: '/time-off/types', label: 'Time Off Types' },
                ]}
              />
            ) : (
              <NavLink to="/time-off">My Time Off</NavLink>
            )}
            {isPayroll && (
              <NavDropdown
                label="Payroll"
                items={[
                  { to: '/dashboard', label: 'Dashboard' },
                  { to: '/payruns', label: 'Payruns' },
                  { to: '/payslips', label: 'Payslips' },
                  { to: '/salary-structures', label: 'Salary Structures' },
                  { to: '/salary-rules', label: 'Salary Rules' },
                ]}
              />
            )}
            {isAdmin && <NavLink to="/users">Users</NavLink>}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-cream-50/60">
            {user.email} <span className="text-cream-50/40">({user.role})</span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 border border-cream-50/20 text-cream-50/80 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-cream-50/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
