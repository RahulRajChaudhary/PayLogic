import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HR_ROLES } from '../constants/roles';
import { employeesApi } from '../api/employees';

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    employeesApi
      .me()
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-sm text-muted mt-2">{error}</p>;
  }
  if (!profile) {
    return <p className="text-sm text-muted mt-2">Loading your profile...</p>;
  }

  const rows = [
    ['Department', profile.department_name ?? '—'],
    ['Manager', profile.manager_name ?? '—'],
    ['Job Position', profile.job_position ?? '—'],
    ['Employee Type', profile.employee_type.replace('_', ' ')],
    ['Status', profile.status],
  ];

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold text-ink">{profile.name}</h2>
      <dl className="mt-3 divide-y divide-navy-950/10 border-t border-navy-950/10">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="text-ink font-medium capitalize">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isHrRole = HR_ROLES.includes(user?.role);

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl border border-navy-950/10 p-6">
        <h1 className="text-xl font-semibold text-ink">
          {isHrRole ? 'Dashboard (placeholder)' : 'My Profile'}
        </h1>
        <p className="text-muted mt-2">
          Logged in as <span className="font-medium text-ink">{user?.email}</span> (
          {user?.role})
        </p>

        {!isHrRole && <MyProfile />}

        {isHrRole && (
          <p className="text-sm text-muted mt-4">
            Real KPIs/charts land with the Payroll Dashboard session. Use the "Employees"
            link above for now.
          </p>
        )}
      </div>
    </div>
  );
}
