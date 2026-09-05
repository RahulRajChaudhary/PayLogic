import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard (placeholder)</h1>
        <p className="text-slate-500 mt-2">
          Logged in as <span className="font-medium">{user?.email}</span> (
          {user?.role})
        </p>
        <button
          onClick={logout}
          className="mt-4 bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-300"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
