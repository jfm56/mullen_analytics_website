'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const AGENCY_TYPES = [
  { value: 'ems',        label: 'EMS / Ambulance' },
  { value: 'fire',       label: 'Fire Department' },
  { value: 'police',     label: 'Law Enforcement' },
  { value: 'healthcare', label: 'Healthcare / Hospital' },
  { value: 'combined',   label: 'Combined Fire & EMS' },
  { value: 'other',      label: 'Other' },
];

const TIERS = [
  {
    key: 'essential',
    name: 'Essential Analytics',
    price: '$299/mo',
    features: ['File upload & validation', 'Call volume summaries', 'Response time analysis', 'Basic executive report'],
  },
  {
    key: 'operational',
    name: 'Operational Intelligence',
    price: '$799/mo',
    features: ['Everything in Essential', 'Staffing analysis', 'Response time forecasting', 'Municipality analysis', 'Payroll & cost analytics'],
    recommended: true,
  },
  {
    key: 'predictive',
    name: 'Predictive AI',
    price: '$1,499/mo',
    features: ['Everything in Operational', 'Call volume forecasting', 'Attrition forecasting', 'AI-generated insights', 'LLM data assistant'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Custom pipelines', 'Dedicated onboarding', 'API integrations', 'Custom dashboards', 'Priority support'],
  },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({
    agency_name:       '',
    agency_type:       '',
    state:             '',
    contact_name:      '',
    contact_email:     '',
    subscription_tier: 'operational',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.agency_name.trim()) { setError('Agency name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create agency');
      router.push(`/platform/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/platform" className="text-sm text-gray-500 hover:text-gray-700">← Platform</Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-800">Agency Setup</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step >= n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{n}</div>
                {n < 3 && <div className={`h-0.5 w-8 ${step > n ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Step {step} of 3 — {step === 1 ? 'Agency info' : step === 2 ? 'Subscription tier' : 'Review & create'}
          </p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">{error}</p>}

        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Agency Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agency name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.agency_name}
                  onChange={e => set('agency_name', e.target.value)}
                  placeholder="e.g. City of Springfield EMS"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agency type</label>
                <select
                  value={form.agency_type}
                  onChange={e => set('agency_type', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type…</option>
                  {AGENCY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                <select
                  value={form.state}
                  onChange={e => set('state', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select state…</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact name</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={e => set('contact_name', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={e => set('contact_email', e.target.value)}
                    placeholder="jane@agency.gov"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => { if (!form.agency_name.trim()) { setError('Agency name is required.'); return; } setError(''); setStep(2); }}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Select Subscription Tier</h2>
            <div className="space-y-3">
              {TIERS.map(tier => (
                <button
                  key={tier.key}
                  onClick={() => set('subscription_tier', tier.key)}
                  className={`w-full text-left border rounded-xl p-4 transition-all ${
                    form.subscription_tier === tier.key
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{tier.name}</span>
                      {tier.recommended && (
                        <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">Recommended</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{tier.price}</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-0.5">
                    {tier.features.map(f => <li key={f}>· {f}</li>)}
                  </ul>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">← Back</button>
              <button onClick={() => setStep(3)} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Review & Create</h2>
            <div className="space-y-3 mb-6">
              {[
                ['Agency name', form.agency_name],
                ['Type', AGENCY_TYPES.find(t => t.value === form.agency_type)?.label || '—'],
                ['State', form.state || '—'],
                ['Contact', form.contact_name ? `${form.contact_name} (${form.contact_email || 'no email'})` : '—'],
                ['Tier', TIERS.find(t => t.key === form.subscription_tier)?.name || form.subscription_tier],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-5">
              This will create your agency account and set up a secure isolated storage folder for your data.
            </p>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Creating…' : 'Create agency'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
