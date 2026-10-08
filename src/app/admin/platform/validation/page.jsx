'use client';
import { useEffect, useState } from 'react';
import { Cpu, UserCheck, Filter, X } from 'lucide-react';
import { platformAdmin } from '@/lib/api';

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
function Metric({ label, value, tone }) {
  return (
    <div className="bg-white border rounded-xl px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-xl font-bold ${tone || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
const V = { pass: 'text-emerald-700', fail: 'text-rose-700', na: 'text-slate-500', human_review_required: 'text-amber-700' };
const SEV = { Critical: 'text-rose-700 font-semibold', Major: 'text-orange-600', Minor: 'text-slate-500', Commendation: 'text-emerald-600', HUMAN_REVIEW_REQUIRED: 'text-amber-700' };

function Select({ label, value, onChange, options, render }) {
  return (
    <label className="flex flex-col text-[11px] text-gray-500">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 border rounded-lg px-2 py-1 text-sm text-gray-800 bg-white min-w-[7rem]">
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{render ? render(o) : o}</option>)}
      </select>
    </label>
  );
}

export default function ValidationConsole() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ category: '', indicator: '', reviewer: '', severity: '', decision: '' });
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    setErr('');
    platformAdmin.qaValidation(f).then(setD).catch((e) => setErr(e.message));
  }, [f]);

  if (err) return <div className="max-w-6xl mx-auto px-4 py-6 text-rose-600 text-sm">{err}</div>;
  if (!d) return <div className="max-w-6xl mx-auto px-4 py-6 text-gray-400 text-sm">Loading…</div>;
  if (!d.available) return <div className="max-w-6xl mx-auto px-4 py-6 text-gray-400 text-sm">QA module not enabled.</div>;
  const m = d.metrics;
  const af = d.available_filters || {};
  const impl = new Set(af.implemented_specialty || []);
  const hasFilters = Object.values(f).some(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">QA Validation Console</h1>
      <p className="text-sm text-gray-500 mb-4">AUTO PROPOSED vs HUMAN APPROVED, with validation metrics. {d.note}</p>

      {/* filter bar */}
      <div className="bg-white border rounded-xl px-3 py-2.5 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 text-gray-400 text-xs"><Filter className="w-3.5 h-3.5" /> Filters</div>
        <Select label="Category" value={f.category} onChange={set('category')} options={af.categories || []}
          render={(c) => (impl.has(c) ? `${c} • auto` : c)} />
        <Select label="Indicator" value={f.indicator} onChange={set('indicator')} options={(af.indicators || []).map(String)}
          render={(n) => `#${n}`} />
        <Select label="Reviewer" value={f.reviewer} onChange={set('reviewer')} options={af.reviewers || []}
          render={(r) => r.slice(0, 8)} />
        <Select label="Severity" value={f.severity} onChange={set('severity')} options={af.severities || []} />
        <Select label="AUTO vs HUMAN" value={f.decision} onChange={set('decision')} options={af.decisions || []} />
        {hasFilters && (
          <button onClick={() => setF({ category: '', indicator: '', reviewer: '', severity: '', decision: '' })}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-2 py-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <Metric label="Indicator agreement" value={pct(m.indicator_agreement)} tone="text-indigo-600" />
        <Metric label="Human override rate" value={pct(m.override_rate)} />
        <Metric label="False positive rate" value={pct(m.false_positive_rate)} />
        <Metric label="False negative rate" value={pct(m.false_negative_rate)} />
        <Metric label="Critical recall" value={pct(m.critical_recall)} tone="text-rose-600" />
        <Metric label="Finding precision" value={pct(m.finding_precision)} />
        <Metric label="Severity agreement" value={pct(m.severity_agreement)} />
        <Metric label="HUMAN REVIEW REQUIRED" value={m.human_review_required_count} tone="text-amber-600" />
      </div>

      {/* per-category (specialty) breakdown */}
      <div className="bg-white border rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-2 border-b bg-gray-50 text-sm font-semibold text-gray-800 flex items-center justify-between">
          <span>Agreement by category (General vs specialty CQI)</span>
          <span className="text-[11px] font-normal text-gray-400">specialty cells are small-N — indicative, not validated accuracy</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="px-3 py-2">Category</th><th>Automation</th><th>Reviewed</th>
              <th>Agreement</th><th>Override</th><th>FP</th><th>FN</th><th>HUMAN</th>
            </tr>
          </thead>
          <tbody>
            {(d.by_category || []).map((c) => (
              <tr key={c.category} className="border-b last:border-0">
                <td className="px-3 py-1.5 font-medium">
                  {c.category}{c.specialty && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-indigo-500">specialty</span>}
                </td>
                <td className="text-xs">
                  {c.automated_in_release
                    ? <span className="text-emerald-600">automated</span>
                    : <span className="text-amber-600">human-only</span>}
                </td>
                <td>{c.reviewed_indicators}</td>
                <td className="text-indigo-700">{pct(c.indicator_agreement)}</td>
                <td>{pct(c.override_rate)}</td>
                <td>{pct(c.false_positive_rate)}</td>
                <td>{pct(c.false_negative_rate)}</td>
                <td className="text-amber-700">{c.human_review_required}</td>
              </tr>
            ))}
            {(d.by_category || []).length === 0 && <tr><td colSpan={8} className="px-3 py-5 text-center text-gray-400">No reviewed decisions yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* per-decision */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b bg-gray-50 text-sm font-semibold text-gray-800">Per-decision (AUTO → HUMAN){hasFilters && <span className="ml-2 text-[11px] font-normal text-gray-400">filtered</span>}</div>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b"><tr><th className="px-3 py-2">CQI</th><th>Category</th><th>Class</th><th><Cpu className="w-3.5 h-3.5 inline" /> Auto</th><th><UserCheck className="w-3.5 h-3.5 inline" /> Human</th><th>Severity</th><th>Agree</th><th>Override reason</th></tr></thead>
          <tbody>
            {d.decisions.slice(0, 60).map((x, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-3 py-1.5 font-medium">#{x.indicator}</td>
                <td className="text-xs text-gray-600">{x.category}</td>
                <td className="text-[11px] text-gray-400">{x.classification}</td>
                <td className={V[x.auto] || ''}>{x.auto}</td>
                <td className={V[x.human] || ''}>{x.human || '—'}</td>
                <td className={`text-xs ${SEV[x.severity] || 'text-gray-400'}`}>{x.severity || '—'}</td>
                <td>{x.agree ? <span className="text-emerald-600">✓</span> : <span className="text-rose-600">✕</span>}</td>
                <td className="text-xs text-gray-500">{x.override_reason || ''}</td>
              </tr>
            ))}
            {d.decisions.length === 0 && <tr><td colSpan={8} className="px-3 py-5 text-center text-gray-400">No reviewed decisions match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
