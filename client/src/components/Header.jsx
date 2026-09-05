import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HR_ROLES } from '../constants/roles';

const ADMIN_ROLES = ['admin'];

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
        active ? 'bg-gold-500/20 text-gold-500' : 'text-cream-50/70 hover:bg-cream-50/10'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="bg-navy-950 border-b border-navy-800 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="font-bold text-cream-50 text-lg tracking-tight">Paylogic</span>
          <nav className="flex items-center gap-1 flex-wrap">
            <NavLink to="/dashboard">
              {HR_ROLES.includes(user.role) ? 'Dashboard' : 'My Profile'}
            </NavLink>
            {HR_ROLES.includes(user.role) && <NavLink to="/employees">Employees</NavLink>}
            {ADMIN_ROLES.includes(user.role) && <NavLink to="/users">Users</NavLink>}
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
