import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HR_ROLES } from '../constants/roles';
import { employeesApi } from '../api/employees';
import EmployeeProfileHeader from '../components/EmployeeProfileHeader';

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('work');
  const [error, setError] = useState('');

  useEffect(() => {
    employeesApi.me().then(setProfile).catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-sm text-muted mt-2">{error}</p>;
  }
  if (!profile) {
    return <p className="text-sm text-muted mt-2">Loading your profile...</p>;
  }

  const tabButtonClass = (tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      activeTab === tab ? 'border-navy-950 text-ink' : 'border-transparent text-muted hover:text-ink'
    }`;

  const workRows = [
    ['Department', profile.department_name ?? '—'],
    ['Manager', profile.manager_name ?? '—'],
    ['Employee Type', profile.employee_type.replace('_', ' ')],
    ['Work Email', profile.work_email ?? '—'],
    ['Work Phone', profile.work_phone ?? '—'],
  ];

  const personalRows = [
    ['Private Email', profile.private_email ?? '—'],
    ['Private Phone', profile.private_phone ?? '—'],
    [
      'Address',
      [profile.home_address, profile.home_city, profile.home_state, profile.home_country]
        .filter(Boolean)
        .join(', ') || '—',
    ],
    ['Date of Birth', profile.date_of_birth ?? '—'],
    ['Gender', profile.gender ?? '—'],
    ['Marital Status', profile.marital_status ?? '—'],
  ];

  const rows = activeTab === 'work' ? workRows : personalRows;

  return (
    <div className="mt-4">
      <EmployeeProfileHeader
        employeeCode={profile.employee_code}
        status={profile.status}
        name={profile.name}
        jobPosition={profile.job_position}
        tags={profile.tags ?? []}
        readOnly
      />

      <div className="flex gap-2 border-b border-navy-950/10 mt-6 mb-4">
        <button type="button" onClick={() => setActiveTab('work')} className={tabButtonClass('work')}>
          Work Information
        </button>
        <button type="button" onClick={() => setActiveTab('personal')} className={tabButtonClass('personal')}>
          Personal Information
        </button>
      </div>

      <dl className="divide-y divide-navy-950/10 border-t border-navy-950/10">
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
      <div
        className={`mx-auto bg-white rounded-xl border border-navy-950/10 p-6 ${
          isHrRole ? 'max-w-md' : 'max-w-lg'
        }`}
      >
        {!isHrRole && <MyProfile />}

        {isHrRole && (
          <>
            <h1 className="text-xl font-semibold text-ink">Dashboard (placeholder)</h1>
            <p className="text-muted mt-2">
              Logged in as <span className="font-medium text-ink">{user?.email}</span> (
              {user?.role})
            </p>
            <p className="text-sm text-muted mt-4">
              Real KPIs/charts land with the Payroll Dashboard session. Use the "Employees"
              link above for now.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
