'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Palette, Upload, Activity, BarChart2, Mail,
  Shield, HardDrive, Heart, AlertTriangle, RefreshCw,
  CheckCircle2, XCircle, HelpCircle, Save, X, RotateCcw,
} from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import {
  getAdminSettings, updateAdminSettings,
  resetAdminSettingsToDefaults, runSettingsHealthCheck,
} from '@/lib/api/settings';
import { fmtTimeOnly } from '@/lib/datetime';

// ── tiny helpers ─────────────────────────────────────────────────────────────

function HealthIcon({ status }) {
  if (status === 'ok' || status === 'configured')
    return <CheckCircle2 size={14} className="text-green-500" />;
  if (status === 'warning')
    return <AlertTriangle size={14} className="text-amber-500" />;
  if (status === 'error')
    return <XCircle size={14} className="text-red-500" />;
  return <HelpCircle size={14} className="text-gray-400" />;
}

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

// ── section config ────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'company',   label: 'Company Profile',        Icon: Building2  },
  { id: 'branding',  label: 'Portal Branding',         Icon: Palette    },
  { id: 'uploads',   label: 'Data Upload Settings',    Icon: Upload     },
  { id: 'ems',       label: 'EMS Analytics',           Icon: Activity   },
  { id: 'dashboard', label: 'Dashboard Defaults',      Icon: BarChart2  },
  { id: 'email',     label: 'Email & Notifications',   Icon: Mail       },
  { id: 'security',  label: 'Security & Access',       Icon: Shield     },
  { id: 'storage',   label: 'Storage Settings',        Icon: HardDrive  },
  { id: 'health',    label: 'System Health',           Icon: Heart      },
  { id: 'danger',    label: 'Danger Zone',             Icon: AlertTriangle },
];

const FIELD_DEFS = {
  company: [
    { key: 'company.name',          label: 'Company Name',      type: 'text' },
    { key: 'company.support_email', label: 'Support Email',     type: 'email' },
    { key: 'company.phone',         label: 'Phone Number',      type: 'text' },
    { key: 'company.website_url',   label: 'Website URL',       type: 'url' },
    { key: 'company.address',       label: 'Business Address',  type: 'text' },
    { key: 'company.timezone',      label: 'Default Time Zone', type: 'select', options: ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','UTC'] },
  ],
  branding: [
    { key: 'branding.portal_name',    label: 'Portal Display Name',               type: 'text' },
    { key: 'branding.primary_color',  label: 'Primary Brand Color',               type: 'color' },
    { key: 'branding.secondary_color',label: 'Secondary Brand Color',             type: 'color' },
    { key: 'branding.logo_url',       label: 'Logo URL',                          type: 'url' },
    { key: 'branding.show_powered_by',label: 'Show "Powered by Mullen Analytics"',type: 'boolean' },
    { key: 'branding.welcome_message',label: 'Client Welcome Message',            type: 'textarea' },
  ],
  uploads: [
    { key: 'uploads.max_file_size_mb',        label: 'Max Upload Size (MB)',                    type: 'number', hint: 'Default: 50' },
    { key: 'uploads.accepted_file_types',     label: 'Accepted File Types',                    type: 'text',   hint: 'e.g. .csv' },
    { key: 'uploads.require_csv_template',    label: 'Require CSV Template Match',             type: 'boolean' },
    { key: 'uploads.auto_clean',              label: 'Auto-Clean After Upload',                type: 'boolean' },
    { key: 'uploads.auto_generate_dashboard', label: 'Auto-Generate Dashboard After Cleaning', type: 'boolean' },
    { key: 'uploads.keep_original',           label: 'Keep Original Uploaded File',            type: 'boolean' },
    { key: 'uploads.allow_client_download',   label: 'Allow Client Downloads',                 type: 'boolean' },
    { key: 'uploads.allow_client_delete',     label: 'Allow Client Delete Uploads',            type: 'boolean' },
  ],
  ems: [
    { key: 'ems.exclude_ift_default',         label: 'Exclude Interfacility Transports by Default', type: 'boolean' },
    { key: 'ems.response_time_metric',        label: 'Default Response Time Metric',               type: 'select', options: ['dispatch_to_arrival','call_to_dispatch','call_to_arrival'] },
    { key: 'ems.call_volume_grouping',        label: 'Default Call Volume Grouping',               type: 'select', options: ['day_of_week','hour_of_day','month','shift'] },
    { key: 'ems.missing_timestamp_threshold', label: 'Missing Timestamp Warning (%)',              type: 'number' },
    { key: 'ems.duplicate_detection',         label: 'Enable Duplicate Incident Detection',        type: 'boolean' },
    { key: 'ems.phi_protection',              label: 'Enable PHI Column Protection',               type: 'boolean' },
  ],
  dashboard: [
    { key: 'dashboard.default_date_range',     label: 'Default Date Range',           type: 'select', options: ['all','last_30','last_90','last_365','ytd'] },
    { key: 'dashboard.default_dataset',        label: 'Default Dataset Selection',    type: 'select', options: ['latest_cleaned','all_uploads'] },
    { key: 'dashboard.show_executive_summary', label: 'Show Executive Summary Cards', type: 'boolean' },
    { key: 'dashboard.show_data_quality',      label: 'Show Data Quality Panel',      type: 'boolean' },
    { key: 'dashboard.show_unit_analysis',     label: 'Show Unit Analysis',           type: 'boolean' },
    { key: 'dashboard.show_incident_types',    label: 'Show Incident Type Analysis',  type: 'boolean' },
    { key: 'dashboard.show_response_trends',   label: 'Show Response Time Trends',    type: 'boolean' },
  ],
  email: [
    { key: 'email.from_email',             label: 'From Email',                          type: 'email' },
    { key: 'email.from_name',              label: 'From Name',                           type: 'text' },
    { key: 'email.invite_enabled',         label: 'Send Invite Emails',                 type: 'boolean' },
    { key: 'email.password_reset_enabled', label: 'Send Password Reset Emails',         type: 'boolean' },
    { key: 'email.upload_complete_notify', label: 'Notify on Upload Complete',          type: 'boolean' },
    { key: 'email.failed_upload_notify',   label: 'Notify on Failed Upload',            type: 'boolean' },
    { key: 'email.dashboard_ready_notify', label: 'Notify When Dashboard Ready',        type: 'boolean' },
  ],
  security: [
    { key: 'security.require_email_verification', label: 'Require Email Verification',            type: 'boolean' },
    { key: 'security.session_timeout_minutes',    label: 'Session Timeout (minutes)',             type: 'number', hint: 'Default: 480 (8 hours)' },
    { key: 'security.admin_approval_required',    label: 'Admin Approval for New Clients',       type: 'boolean' },
    { key: 'security.client_can_invite',          label: 'Clients Can Invite Users',             type: 'boolean' },
    { key: 'security.audit_logging',              label: 'Enable Audit Logging',                 type: 'boolean' },
    { key: 'security.hide_phi_columns',           label: 'Hide PHI-Sensitive Columns from Clients', type: 'boolean' },
  ],
};

// ── main component ────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState(false);
  const [activeSection, setActiveSection] = useState('company');
  const [settingsData, setSettingsData] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [resetting, setResetting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminSettings();
      setSettingsData(data.settings || {});
      setMeta(data.meta || {});
    } catch (e) {
      setError(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proxy/auth/session', { credentials: 'include' });
        const s = await res.json();
        if (!s.authenticated || s.profile?.role !== 'admin') {
          router.replace('/portal/login');
          return;
        }
        setAuthOk(true);
        loadSettings();
      } catch {
        router.replace('/portal/login');
      }
    })();
  }, [router, loadSettings]);

  // Flat map: key → value from grouped settings
  const flat = settingsData
    ? Object.values(settingsData).flat().reduce((acc, e) => {
        acc[e.key] = e.value;
        return acc;
      }, {})
    : {};

  function startEdit() {
    setDraft({ ...flat });
    setEditing(true);
    setSaveMsg('');
  }

  function cancelEdit() {
    setEditing(false);
    setDraft({});
    setSaveMsg('');
  }

  async function saveSection() {
    const defs = FIELD_DEFS[activeSection] || [];
    const sectionKeys = defs.map(f => f.key);
    const updates = {};
    sectionKeys.forEach(k => {
      if (k in draft) updates[k] = draft[k];
    });
    setSaving(true);
    setSaveMsg('');
    try {
      await updateAdminSettings(updates);
      setSaveMsg('Saved successfully.');
      setEditing(false);
      loadSettings();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset ALL settings to defaults? This cannot be undone.')) return;
    setResetting(true);
    try {
      await resetAdminSettingsToDefaults();
      setSaveMsg('Settings reset to defaults.');
      loadSettings();
    } catch (e) {
      setError(e.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  }

  async function runHealth() {
    setHealthLoading(true);
    try {
      const h = await runSettingsHealthCheck();
      setHealth(h);
    } catch (e) {
      setError(e.message || 'Health check failed');
    } finally {
      setHealthLoading(false);
    }
  }

  function renderField(def) {
    const val = editing ? (draft[def.key] ?? flat[def.key] ?? '') : (flat[def.key] ?? '');
    const set = (v) => setDraft(p => ({ ...p, [def.key]: v }));
    const disabled = !editing;

    if (def.type === 'boolean') {
      return (
        <Field key={def.key} label={def.label} hint={def.hint}>
          <Toggle checked={Boolean(val)} onChange={set} disabled={disabled} />
        </Field>
      );
    }
    if (def.type === 'select') {
      return (
        <Field key={def.key} label={def.label} hint={def.hint}>
          <select
            disabled={disabled}
            value={String(val)}
            onChange={e => set(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 min-w-[180px]"
          >
            {(def.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      );
    }
    if (def.type === 'textarea') {
      return (
        <Field key={def.key} label={def.label} hint={def.hint}>
          <textarea
            rows={3}
            disabled={disabled}
            value={String(val)}
            onChange={e => set(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 w-64 resize-none"
          />
        </Field>
      );
    }
    if (def.type === 'color') {
      return (
        <Field key={def.key} label={def.label}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={disabled}
              value={String(val) || '#2563EB'}
              onChange={e => set(e.target.value)}
              className="h-8 w-10 rounded cursor-pointer border disabled:cursor-not-allowed"
            />
            <span className="text-xs font-mono text-gray-500">{String(val)}</span>
          </div>
        </Field>
      );
    }
    return (
      <Field key={def.key} label={def.label} hint={def.hint}>
        <input
          type={def.type || 'text'}
          disabled={disabled}
          value={String(val)}
          onChange={e => set(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 w-56"
        />
      </Field>
    );
  }

  if (!authOk || loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin mr-2" /> Loading settings…
      </div>
    );
  }

  const isLocal = (meta.environment || 'local') === 'local';

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage platform configuration, upload behavior, dashboard defaults, and security controls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${isLocal ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {isLocal ? 'Local' : 'Production'}
            </span>
            <span className="text-xs text-gray-400">
              {meta.storage_backend && `Storage: ${meta.storage_backend}`}
            </span>
          </div>
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />
      {saveMsg && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={15} /> {saveMsg}
        </div>
      )}

      <div className="flex gap-6">

        {/* Left nav */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveSection(id); cancelEdit(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeSection === id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${id === 'danger' ? 'text-red-600 hover:bg-red-50' : ''}`}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">

          {/* ── Standard settings sections ── */}
          {FIELD_DEFS[activeSection] && (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {SECTIONS.find(s => s.id === activeSection)?.label}
                  </h2>
                </div>
                {!editing ? (
                  <button onClick={startEdit} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={cancelEdit} className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors">
                      <X size={12} /> Cancel
                    </button>
                    <button onClick={saveSection} disabled={saving} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              <div className="px-5 py-1">
                {FIELD_DEFS[activeSection].map(def => renderField(def))}
              </div>
            </div>
          )}

          {/* ── Storage ── */}
          {activeSection === 'storage' && (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-900">Storage Settings</h2>
                <p className="text-xs text-gray-400 mt-0.5">Read-only — configured via environment variables.</p>
              </div>
              <div className="px-5 py-2">
                {[
                  { label: 'Storage Backend',  value: meta.storage_backend || 'local' },
                  { label: 'Upload Root',       value: meta.upload_root || '—' },
                  { label: 'Storage Root',      value: meta.storage_root || '—' },
                  { label: 'S3 Bucket',         value: meta.s3_bucket || 'Not configured' },
                  { label: 'AWS Region',        value: meta.aws_region || 'Not configured' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b last:border-0">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-sm font-mono text-gray-500 text-right max-w-xs truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── System Health ── */}
          {activeSection === 'health' && (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-900">System Health</h2>
                <button
                  onClick={runHealth}
                  disabled={healthLoading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={12} className={healthLoading ? 'animate-spin' : ''} />
                  {healthLoading ? 'Checking…' : 'Run Health Check'}
                </button>
              </div>
              <div className="px-5 py-2">
                {!health ? (
                  <p className="text-sm text-gray-400 py-6 text-center">Click "Run Health Check" to check system status.</p>
                ) : (
                  <>
                    {[
                      { label: 'Backend API',          key: 'backend' },
                      { label: 'Database',             key: 'database' },
                      { label: 'File Storage',         key: 'storage' },
                      { label: 'Email Provider',       key: 'email' },
                      { label: 'Analytics Pipeline',   key: 'analytics_pipeline' },
                    ].map(({ label, key }) => (
                      <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                        <p className="text-sm text-gray-700">{label}</p>
                        <div className="flex items-center gap-2">
                          <HealthIcon status={health[key]} />
                          <span className={`text-xs font-medium capitalize ${
                            health[key] === 'ok' || health[key] === 'configured' ? 'text-green-600' :
                            health[key] === 'warning' ? 'text-amber-600' :
                            health[key] === 'error' ? 'text-red-600' : 'text-gray-400'
                          }`}>{health[key] || 'unknown'}</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 text-xs text-gray-400">
                      Checked at: {health.checked_at ? fmtTimeOnly(health.checked_at) : '—'}
                      {' · '} Uploads root: {health.uploads_root_exists ? '✓ exists' : '✗ missing'}
                      {' · '} Storage root: {health.storage_root_exists ? '✓ exists' : '✗ missing'}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Danger Zone ── */}
          {activeSection === 'danger' && (
            <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-red-200 bg-red-50">
                <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle size={15} /> Danger Zone
                </h2>
                <p className="text-xs text-red-600 mt-0.5">
                  These actions are irreversible. Only available in local environment.
                </p>
              </div>
              {!isLocal ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  Danger Zone actions are disabled in Production.
                </div>
              ) : (
                <div className="px-5 py-4 space-y-4">
                  {[
                    {
                      title: 'Reset All Settings to Defaults',
                      desc: 'Removes all DB overrides — settings will revert to hardcoded defaults.',
                      action: handleReset,
                      loading: resetting,
                      label: resetting ? 'Resetting…' : 'Reset Settings',
                    },
                  ].map(({ title, desc, action, loading: l, label }) => (
                    <div key={title} className="flex items-start justify-between gap-4 p-4 border border-red-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                      <button
                        onClick={action}
                        disabled={l}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex-shrink-0 transition-colors"
                      >
                        <RotateCcw size={12} /> {label}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
