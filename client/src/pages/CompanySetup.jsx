import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../api/http';
import { useAuth } from '../context/AuthContext';

export default function CompanySetup() {
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user } = await http.post('/company/setup', form);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-navy-950/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-500';
  const labelClass = 'block text-sm font-medium text-ink mb-1';

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-navy-950/10 p-8">
        <h1 className="text-2xl font-semibold text-ink text-center">
          Set Up Your Company
        </h1>
        <p className="text-muted text-center mt-1 mb-6">
          This runs once, the first time Paylogic starts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Company Name</label>
            <input required value={form.name} onChange={update('name')} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input value={form.city} onChange={update('city')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input value={form.state} onChange={update('state')} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Address</label>
              <input value={form.address} onChange={update('address')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input value={form.country} onChange={update('country')} className={inputClass} />
            </div>
          </div>

          <hr className="border-navy-950/10" />

          <div>
            <label className={labelClass}>Admin Email</label>
            <input
              type="email"
              required
              value={form.adminEmail}
              onChange={update('adminEmail')}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Admin Password</label>
            <input
              type="password"
              required
              value={form.adminPassword}
              onChange={update('adminPassword')}
              className={inputClass}
            />
            <p className="text-xs text-muted mt-1">
              At least 8 characters, with a letter and a number.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-navy-950 text-cream-50 rounded-lg py-2 font-medium hover:bg-navy-800 disabled:opacity-50"
          >
            {submitting ? 'Setting up...' : 'Create Company & Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
