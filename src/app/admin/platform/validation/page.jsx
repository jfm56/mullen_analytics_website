'use client';
import { useEffect, useState } from 'react';
import { Cpu, UserCheck } from 'lucide-react';
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

export default function ValidationConsole() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { platformAdmin.qaValidation().then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="max-w-6xl mx-auto px-4 py-6 text-rose-600 text-sm">{err}</div>;
  if (!d) return <div className="max-w-6xl mx-auto px-4 py-6 text-gray-400 text-sm">Loading…</div>;
  if (!d.available) return <div className="max-w-6xl mx-auto px-4 py-6 text-gray-400 text-sm">QA module not enabled.</div>;
  const m = d.metrics;
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">QA Validation Console</h1>
      <p className="text-sm text-gray-500 mb-4">AUTO PROPOSED vs HUMAN APPROVED, with validation metrics. {d.note}</p>
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
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b bg-gray-50 text-sm font-semibold text-gray-800">Per-decision (AUTO → HUMAN)</div>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b"><tr><th className="px-3 py-2">CQI</th><th>Class</th><th><Cpu className="w-3.5 h-3.5 inline" /> Auto</th><th><UserCheck className="w-3.5 h-3.5 inline" /> Human</th><th>Agree</th><th>Override reason</th></tr></thead>
          <tbody>
            {d.decisions.slice(0, 40).map((x, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-3 py-1.5 font-medium">#{x.indicator}</td>
                <td className="text-[11px] text-gray-400">{x.classification}</td>
                <td className={V[x.auto] || ''}>{x.auto}</td>
                <td className={V[x.human] || ''}>{x.human || '—'}</td>
                <td>{x.agree ? <span className="text-emerald-600">✓</span> : <span className="text-rose-600">✕</span>}</td>
                <td className="text-xs text-gray-500">{x.override_reason || ''}</td>
              </tr>
            ))}
            {d.decisions.length === 0 && <tr><td colSpan={6} className="px-3 py-5 text-center text-gray-400">No reviewed decisions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
