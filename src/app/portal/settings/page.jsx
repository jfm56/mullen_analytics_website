'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, User, Bell, Database, BarChart2, HelpCircle,
  RefreshCw, Save, X, CheckCircle2, KeyRound, CreditCard,
} from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { billing, plans as plansApi } from '@/lib/api';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, children, editing, onEdit, onSave, onCancel, saving }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {!editing ? (
          <button onClick={onEdit} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors">
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50">
              <X size={12} /> Cancel
            </button>
            <button onClick={onSave} disabled={saving} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

const SECTIONS = [
  { id: 'profile',      label: 'User Profile',          Icon: User       },
  { id: 'agency',       label: 'Agency Profile',         Icon: Building2  },
  { id: 'billing',      label: 'Plan & Billing',         Icon: CreditCard },
  { id: 'notifications',label: 'Notifications',          Icon: Bell       },
  { id: 'data',         label: 'Data Preferences',       Icon: Database   },
  { id: 'dashboard',    label: 'Dashboard Preferences',  Icon: BarChart2  },
  { id: 'support',      label: 'Support',                Icon: HelpCircle },
];

export default function PortalSettingsPage() {
  const router = useRouter();

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [saveMsg, setSaveMsg]   = useState('');
  const [activeSection, setActiveSection] = useState('profile');

  // Per-section edit state
  const [editSection, setEditSection] = useState(null);
  const [draft, setDraft]       = useState({});
  const [saving, setSaving]     = useState(false);

  // Plan & billing
  const [billingCfg, setBillingCfg]   = useState(null);
  const [planCatalog, setPlanCatalog] = useState([]);
  const [subscribing, setSubscribing] = useState('');

  // Client preferences (stored as simple local state — no backend prefs table yet)
  const [prefs, setPrefs] = useState({
    notify_upload_processed:  true,
    notify_dashboard_ready:   true,
    notify_failed_upload:     true,
    notify_messages:          true,
    exclude_ift_default:      false,
    hide_phi_columns:         true,
    dashboard_date_range:     'all',
    chart_grouping:           'day_of_week',
    show_data_quality:        true,
  });

  // Public portal settings (company info, support email, etc.)
  const [portalSettings, setPortalSettings] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionRes, pubRes] = await Promise.all([
        fetch('/api/proxy/auth/session', { credentials: 'include' }),
        fetch('/api/proxy/settings/public', { credentials: 'include' }).catch(() => null),
      ]);
      const s = await sessionRes.json();
      if (!s.authenticated) { router.replace('/portal/login'); return; }
      setProfile(s.profile);
      billing.config().then(setBillingCfg).catch(() => setBillingCfg({ enabled: false }));
      plansApi.list().then((d) => setPlanCatalog(d.plans || [])).catch(() => {});
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('subscribed')) {
        setSaveMsg('Subscription active — welcome aboard!');
      }
      if (pubRes?.ok) {
        const pubData = await pubRes.json();
        setPortalSettings(pubData.settings || {});
      }
    } catch {
      router.replace('/portal/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(section) {
    setEditSection(section);
    setSaveMsg('');
    if (section === 'profile') {
      setDraft({ full_name: profile?.full_name || '', company: profile?.company || '' });
    }
  }

  function cancelEdit() {
    setEditSection(null);
    setDraft({});
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/users/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: draft.full_name, company: draft.company }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const updated = await res.json();
      setProfile(p => ({ ...p, full_name: updated.full_name, company: updated.company }));
      setSaveMsg('Profile updated.');
      setEditSection(null);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!profile?.email) return;
    try {
      const res = await fetch('/api/proxy/auth/request-password-reset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setSaveMsg('Password reset email sent.');
    } catch (e) {
      setError(e.message || 'Failed to send reset email');
    }
  }

  async function handleSubscribe(plan) {
    setSubscribing(plan);
    setError('');
    try {
      const r = await billing.checkout(plan);
      if (r?.checkout_url) window.location.href = r.checkout_url;
      else throw new Error('Could not start checkout.');
    } catch (e) {
      setError(e.message || 'Could not start checkout.');
      setSubscribing('');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const supportEmail = portalSettings['company.support_email'] || 'admin@mullenanalytics.com';
  const portalName   = portalSettings['branding.portal_name'] || 'Client Analytics Portal';
  const planStatus = profile?.plan_status || 'trialing';
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000)
    : null;
  const statusCls = planStatus === 'active' ? 'bg-green-50 text-green-700 border-green-200'
    : planStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : planStatus === 'canceled' ? 'bg-gray-50 text-gray-600 border-gray-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className="max-w-[900px] mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile, preferences, and notifications.</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />
      {saveMsg && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={15} /> {saveMsg}
        </div>
      )}

      <div className="flex gap-6">

        {/* Left nav */}
        <div className="w-44 flex-shrink-0 hidden sm:block">
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveSection(id); cancelEdit(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeSection === id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Mobile section selector */}
          <div className="sm:hidden">
            <select
              value={activeSection}
              onChange={e => { setActiveSection(e.target.value); cancelEdit(); }}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* ── User Profile ── */}
          {activeSection === 'profile' && (
            <SectionCard
              title="User Profile"
              editing={editSection === 'profile'}
              onEdit={() => startEdit('profile')}
              onSave={saveProfile}
              onCancel={cancelEdit}
              saving={saving}
            >
              {editSection === 'profile' ? (
                <>
                  <Field label="Full Name">
                    <input
                      type="text"
                      value={draft.full_name}
                      onChange={e => setDraft(p => ({ ...p, full_name: e.target.value }))}
                      className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                    />
                  </Field>
                  <Field label="Company">
                    <input
                      type="text"
                      value={draft.company}
                      onChange={e => setDraft(p => ({ ...p, company: e.target.value }))}
                      className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Full Name">
                    <span className="text-sm text-gray-700">{profile?.full_name || <span className="italic text-gray-400">Not set</span>}</span>
                  </Field>
                  <Field label="Email">
                    <span className="text-sm text-gray-700">{profile?.email}</span>
                  </Field>
                  <Field label="Company">
                    <span className="text-sm text-gray-700">{profile?.company || <span className="italic text-gray-400">Not set</span>}</span>
                  </Field>
                  <Field label="Role">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-200 capitalize">
                      {profile?.role || 'client'}
                    </span>
                  </Field>
                </>
              )}
              <Field label="Password" hint="Send a reset link to your email">
                <button
                  onClick={handlePasswordReset}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <KeyRound size={12} /> Reset Password
                </button>
              </Field>
            </SectionCard>
          )}

          {/* ── Agency Profile ── */}
          {activeSection === 'agency' && (
            <SectionCard title="Agency Profile" editing={false} onEdit={() => {}} onSave={() => {}} onCancel={() => {}} saving={false}>
              {[
                { label: 'Agency / Company',  value: profile?.company },
                { label: 'Client Status',     value: profile?.client_status || 'prospect' },
                { label: 'Project Name',      value: profile?.project_name },
                { label: 'Project Status',    value: profile?.project_status },
              ].map(({ label, value }) => (
                <Field key={label} label={label}>
                  <span className="text-sm text-gray-600">{value || <span className="italic text-gray-400">—</span>}</span>
                </Field>
              ))}
              <Field label="" hint="">
                <p className="text-xs text-gray-400 py-2">Contact your Mullen Analytics representative to update agency details.</p>
              </Field>
            </SectionCard>
          )}

          {/* ── Plan & Billing ── */}
          {activeSection === 'billing' && (
            <SectionCard title="Plan & Billing" editing={false} onEdit={() => {}} onSave={() => {}} onCancel={() => {}} saving={false}>
              <Field label="Current plan">
                <span className="text-sm text-gray-700 capitalize">{(profile?.plan || 'free_trial').replace(/_/g, ' ')}</span>
              </Field>
              <Field label="Status">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${statusCls}`}>
                  {planStatus}
                </span>
              </Field>
              {trialDaysLeft != null && planStatus !== 'active' && (
                <Field label="Free trial" hint="Time remaining in your 30-day trial">
                  <span className="text-sm text-gray-700">{trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` : 'Ended'}</span>
                </Field>
              )}
              <div className="py-4">
                {planStatus === 'active' ? (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    Your subscription is active — thank you! To change or cancel, contact {supportEmail}.
                  </p>
                ) : billingCfg?.enabled && (billingCfg.priced_plans || []).length > 0 ? (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Subscribe to keep full access when your trial ends:</p>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {billingCfg.priced_plans.map((slug) => {
                        const p = planCatalog.find((x) => x.slug === slug);
                        const recommended = profile?.plan === slug;
                        return (
                          <button
                            key={slug}
                            onClick={() => handleSubscribe(slug)}
                            disabled={!!subscribing}
                            className={`text-left rounded-lg border px-3 py-2.5 transition-colors disabled:opacity-50 ${recommended ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-300 hover:bg-gray-50'}`}
                          >
                            <div className="text-sm font-semibold text-gray-900">{p?.name || slug}</div>
                            <div className="text-xs text-gray-500">{p ? `${p.price_display}${p.period}` : ''}{recommended ? ' · your pick' : ''}</div>
                            <div className="text-[11px] text-blue-600 mt-1 font-medium">{subscribing === slug ? 'Starting…' : 'Subscribe →'}</div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">Secure recurring checkout via Stripe. Cancel anytime.</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    Your 30-day trial is active. To activate a paid plan, contact{' '}
                    <a href={`mailto:${supportEmail}`} className="text-blue-600 hover:underline">{supportEmail}</a> — we’ll get you set up.
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <SectionCard title="Notification Preferences" editing={false} onEdit={() => {}} onSave={() => {}} onCancel={() => {}} saving={false}>
              {[
                { key: 'notify_upload_processed', label: 'Upload processed',             hint: 'When your data file finishes processing' },
                { key: 'notify_dashboard_ready',  label: 'Dashboard ready',              hint: 'When an analytics dashboard is generated' },
                { key: 'notify_failed_upload',    label: 'Upload failed',                hint: 'When a file upload or cleaning fails' },
                { key: 'notify_messages',         label: 'Messages from Mullen Analytics',hint: 'New messages in the portal' },
              ].map(({ key, label, hint }) => (
                <Field key={key} label={label} hint={hint}>
                  <Toggle
                    checked={prefs[key]}
                    onChange={v => setPrefs(p => ({ ...p, [key]: v }))}
                  />
                </Field>
              ))}
              <p className="text-xs text-gray-400 py-3">Email delivery requires configuration by your admin.</p>
            </SectionCard>
          )}

          {/* ── Data Preferences ── */}
          {activeSection === 'data' && (
            <SectionCard title="Data Preferences" editing={false} onEdit={() => {}} onSave={() => {}} onCancel={() => {}} saving={false}>
              {[
                { key: 'exclude_ift_default', label: 'Exclude interfacility transports by default', hint: 'Applied automatically on dashboard load' },
                { key: 'hide_phi_columns',    label: 'Hide PHI-sensitive columns',                  hint: 'Hides fields like patient name, DOB, SSN' },
              ].map(({ key, label, hint }) => (
                <Field key={key} label={label} hint={hint}>
                  <Toggle checked={prefs[key]} onChange={v => setPrefs(p => ({ ...p, [key]: v }))} />
                </Field>
              ))}
              <Field label="Default Dataset Selection" hint="Which dataset loads by default on dashboards">
                <select
                  value={prefs.default_dataset || 'latest_cleaned'}
                  onChange={e => setPrefs(p => ({ ...p, default_dataset: e.target.value }))}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="latest_cleaned">Latest Cleaned Upload</option>
                  <option value="all_uploads">All Uploads</option>
                </select>
              </Field>
            </SectionCard>
          )}

          {/* ── Dashboard Preferences ── */}
          {activeSection === 'dashboard' && (
            <SectionCard title="Dashboard Preferences" editing={false} onEdit={() => {}} onSave={() => {}} onCancel={() => {}} saving={false}>
              <Field label="Default Date Range">
                <select
                  value={prefs.dashboard_date_range}
                  onChange={e => setPrefs(p => ({ ...p, dashboard_date_range: e.target.value }))}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="last_30">Last 30 Days</option>
                  <option value="last_90">Last 90 Days</option>
                  <option value="last_365">Last 365 Days</option>
                  <option value="ytd">Year to Date</option>
                </select>
              </Field>
              <Field label="Preferred Chart Grouping">
                <select
                  value={prefs.chart_grouping}
                  onChange={e => setPrefs(p => ({ ...p, chart_grouping: e.target.value }))}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day_of_week">Day of Week</option>
                  <option value="hour_of_day">Hour of Day</option>
                  <option value="month">Month</option>
                  <option value="shift">Shift</option>
                </select>
              </Field>
              <Field label="Show Data Quality Panel" hint="Display data quality warnings on dashboards">
                <Toggle checked={prefs.show_data_quality} onChange={v => setPrefs(p => ({ ...p, show_data_quality: v }))} />
              </Field>
            </SectionCard>
          )}

          {/* ── Support ── */}
          {activeSection === 'support' && (
            <SectionCard title="Support" editing={false} onEdit={() => {}} onSave={() => {}} onCancel={() => {}} saving={false}>
              <Field label="Portal">
                <span className="text-sm text-gray-700">{portalName}</span>
              </Field>
              <Field label="Support Email">
                <a href={`mailto:${supportEmail}`} className="text-sm text-blue-600 hover:underline">
                  {supportEmail}
                </a>
              </Field>
              <Field label="Contact">
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors inline-block"
                >
                  Send a Message
                </a>
              </Field>
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  );
}
