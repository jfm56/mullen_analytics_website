'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Cpu, UserCheck, AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert,
  FileText, Activity, ListChecks, Flag, Gauge, Users, History,
} from 'lucide-react';
import { emscsQa } from '@/lib/api';

const VERDICT = {
  pass: { label: 'MET', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  fail: { label: 'NOT MET', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  na: { label: 'N/A', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  human_review_required: { label: 'HUMAN REVIEW REQUIRED', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
};
const SEV = {
  Critical: 'bg-rose-100 text-rose-700 border-rose-300',
  Major: 'bg-amber-100 text-amber-800 border-amber-200',
  Minor: 'bg-slate-100 text-slate-600 border-slate-200',
  Commendation: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  HUMAN_REVIEW_REQUIRED: 'bg-amber-100 text-amber-800 border-amber-300',
};
const TABS = [
  ['overview', 'Overview', Gauge], ['chart', 'Source Chart', FileText], ['timeline', 'Clinical Timeline', Activity],
  ['indicators', 'Indicator Review', ListChecks], ['findings', 'Findings', Flag], ['scoring', 'Scoring', Gauge],
  ['crew', 'Crew Feedback', Users], ['audit', 'Audit', History],
];

function Badge({ children, cls }) {
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${cls}`}>{children}</span>;
}

function Evidence({ items }) {
  if (!items || !items.length) return null;
  return (
    <ul className="mt-1 space-y-1">
      {items.map((e, i) => (
        <li key={i} className="text-xs text-gray-600 bg-gray-50 border rounded px-2 py-1">
          {e.evidence_a && e.evidence_b ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-500">{e.conflict || 'conflict'}</span>
              <span>↳ <b>{e.evidence_a.source}:</b> {String(e.evidence_a.value)}</span>
              <span>↳ <b>{e.evidence_b.source}:</b> {String(e.evidence_b.value)}</span>
            </div>
          ) : (
            <span><b>{e.field || e.source}:</b> {typeof e.value === 'object' ? JSON.stringify(e.value) : String(e.value)}{e.note ? ` — ${e.note}` : ''}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function QaReviewPage() {
  const { sessionId } = useParams();
  const agency = useSearchParams().get('agency');
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');
  const [domains, setDomains] = useState(['', '', '', '', '', '', '', '']);

  const load = useCallback(async () => {
    setErr('');
    try {
      const data = await emscsQa.detail(agency, sessionId);
      setD(data);
      if (data.session.domain_scores) setDomains(data.session.domain_scores.map(String));
    } catch (e) { setErr(e.message); }
  }, [agency, sessionId]);
  useEffect(() => { if (agency) load(); }, [load, agency]);

  const act = async (fn) => { try { await fn(); await load(); } catch (e) { setErr(e.message); } };

  if (!d) return <div className="max-w-5xl mx-auto px-4 py-8 text-gray-400">{err || 'Loading…'}</div>;
  const chart = d.chart?.chart_data || {};
  const score = d.score || {};

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link href="/admin/qa" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2"><ArrowLeft className="w-4 h-4" /> Chart Log</Link>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">Review · {d.chart?.external_ref || sessionId.slice(0, 8)}</h1>
        <Badge cls="bg-violet-100 text-violet-700 border-violet-200">SYNTHETIC · NO PHI</Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <span className="inline-flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> AUTO PROPOSED</span>
        <span>vs</span>
        <span className="inline-flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> HUMAN APPROVED</span>
        <span className="ml-2">· status: <b>{d.session.status.replace('_', ' ')}</b></span>
      </div>
      {err && <div className="mb-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2">{err}</div>}

      <div className="flex flex-wrap gap-1 border-b mb-4">
        {TABS.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1 text-sm px-3 py-2 border-b-2 -mb-px ${tab === k ? 'border-indigo-600 text-indigo-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs uppercase text-gray-400 mb-2">Automated proposal</div>
            <div className="text-sm text-gray-700">Indicator compliance (auto): <b>{score.automated_indicator_compliance != null ? (score.automated_indicator_compliance * 100).toFixed(1) + '%' : '—'}</b></div>
            <div className="text-sm text-gray-700">Findings: <b>{d.findings.length}</b> · requiring human severity: <b>{d.findings.filter((f) => f.severity_requires_human).length}</b></div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-xs uppercase text-gray-400 mb-2">Human-approved result</div>
            {score.approved_tier ? (
              <>
                <div className="text-sm text-gray-700">Composite: <b>{Number(score.approved_composite_score).toFixed(1)}</b> · Quality: <b>{Number(score.approved_quality_score).toFixed(1)}</b> · Compliance: <b>{(score.approved_indicator_compliance * 100).toFixed(1)}%</b></div>
                <div className="mt-1"><Badge cls={SEV[d.session.tier] || 'bg-indigo-100 text-indigo-700 border-indigo-200'}>{score.approved_tier}</Badge></div>
              </>
            ) : <div className="text-sm text-gray-400">Not yet approved — enter domain scores and approve on the Scoring tab.</div>}
          </div>
        </div>
      )}

      {tab === 'chart' && (
        <div className="bg-white border rounded-xl p-4 text-sm">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {[['Impression', chart.primary_impression], ['Chief complaint', chart.chief_complaint], ['Final acuity', chart.final_acuity], ['Disposition', chart.disposition], ['Age', chart.age_years], ['Transported', String(chart.transported)]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-1"><span className="text-gray-500">{k}</span><span className="text-gray-900 font-medium">{v ?? '—'}</span></div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500">Structured fields are synthetic. No patient identifiers are stored.</div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">Vital sign timeline</div>
          {(chart.vitals || []).length === 0 ? <div className="text-sm text-gray-400">No vitals recorded.</div> : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b"><tr><th className="py-1">Time</th><th>BP</th><th>Method</th><th>SpO2</th><th>Pain</th><th>GCS</th></tr></thead>
              <tbody>
                {chart.vitals.map((v, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="py-1">{v.time || '—'}</td><td>{v.sbp ? `${v.sbp}/${v.dbp ?? ''}` : '—'}</td><td>{v.bp_method || '—'}</td><td>{v.spo2 ?? '—'}</td><td>{v.pain ?? '—'}</td><td>{v.gcs ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'indicators' && (
        <div className="space-y-2">
          {d.indicator_reviews.sort((a, b) => a.number - b.number).map((ir) => {
            const av = ir.automated?.verdict; const hv = ir.human?.verdict;
            return (
              <div key={ir.id} className="bg-white border rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">CQI #{ir.number}</span>
                      <span className="text-[10px] text-gray-400 border rounded px-1">{ir.automated?.classification}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><Cpu className="w-3 h-3" />AUTO</span>
                      <Badge cls={(VERDICT[av] || VERDICT.na).cls}>{(VERDICT[av] || {}).label || av}</Badge>
                      {hv && <><span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><UserCheck className="w-3 h-3" />HUMAN</span><Badge cls={(VERDICT[hv] || VERDICT.na).cls}>{(VERDICT[hv] || {}).label || hv}</Badge></>}
                      {ir.overridden && <span className="text-[10px] text-amber-700">overridden</span>}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{ir.automated?.rationale}</div>
                    {av === 'fail' && <Evidence items={ir.automated?.evidence} />}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => act(() => emscsQa.acceptIndicator(agency, ir.id))} className="text-xs border rounded px-2 py-1 hover:bg-gray-50" disabled={av === 'human_review_required'}>Accept</button>
                    <button onClick={() => { const v = prompt('Override verdict (pass/fail/na):', hv || (av === 'human_review_required' ? 'na' : av)); if (!v) return; const r = prompt('Reason (required):'); if (!r) return; act(() => emscsQa.overrideIndicator(agency, ir.id, v.trim(), r)); }} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">Override</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'findings' && (
        <div className="space-y-2">
          {d.findings.length === 0 && <div className="text-sm text-gray-400">No findings.</div>}
          {d.findings.map((f) => (
            <div key={f.id} className={`bg-white border rounded-xl p-3 ${f.status === 'dismissed' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {f.indicator_number && <span className="font-semibold text-gray-900 text-sm">CQI #{f.indicator_number}</span>}
                    <span className="text-[10px] text-gray-400 border rounded px-1">{f.type}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><Cpu className="w-3 h-3" />AUTO</span>
                    <Badge cls={SEV[f.automated_severity] || 'bg-slate-100 text-slate-500 border-slate-200'}>{f.automated_severity || '—'}</Badge>
                    {f.severity_requires_human && <span className="inline-flex items-center gap-1 text-[10px] text-amber-700"><ShieldAlert className="w-3 h-3" />needs human severity ({f.severity_confidence})</span>}
                    {f.human_severity && <><span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><UserCheck className="w-3 h-3" />HUMAN</span><Badge cls={SEV[f.human_severity]}>{f.human_severity}</Badge></>}
                    {f.final_severity === 'Critical' && (f.acknowledged ? <span className="text-[10px] text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />acknowledged</span> : <span className="text-[10px] text-rose-700 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" />ack required</span>)}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{f.description}</div>
                  <Evidence items={f.evidence} />
                  {f.severity_rationale && <div className="text-[11px] text-gray-400 mt-1">severity: {f.severity_rationale}</div>}
                  {f.dismissed_reason && <div className="text-[11px] text-gray-400 mt-1">dismissed: {f.dismissed_reason}</div>}
                </div>
                {f.status !== 'dismissed' && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => { const s = prompt('Set severity (Critical/Major/Minor/Commendation):', f.human_severity || f.automated_severity || 'Minor'); if (!s) return; const r = prompt('Reason (required):'); if (!r) return; act(() => emscsQa.setSeverity(agency, f.id, s.trim(), r)); }} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">Set severity</button>
                    {f.final_severity === 'Critical' && !f.acknowledged && <button onClick={() => act(() => emscsQa.acknowledgeFinding(agency, f.id))} className="text-xs border border-rose-300 text-rose-700 rounded px-2 py-1 hover:bg-rose-50">Acknowledge</button>}
                    <button onClick={() => { const r = prompt('Dismiss reason (required):'); if (!r) return; act(() => emscsQa.dismissFinding(agency, f.id, r)); }} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'scoring' && (
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">Reviewer domain ratings (0–5)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {['HPI & Narrative', 'Assessment', 'Protocol Adherence', 'Vitals & Reassessment', 'Documentation', 'Safety/Securement', 'Operational', 'Admin & Billing'].map((name, i) => (
              <label key={i} className="text-xs text-gray-600">{name}
                <input type="number" min={0} max={5} value={domains[i]} onChange={(e) => { const n = [...domains]; n[i] = e.target.value; setDomains(n); }} className="mt-0.5 w-full border rounded px-2 py-1 text-sm" />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => act(() => emscsQa.domainScores(agency, sessionId, domains.map(Number)))} className="text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50">Save domain scores</button>
            <button onClick={() => act(() => emscsQa.approve(agency, sessionId))} className="text-sm bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700">Approve review</button>
          </div>
          {score.approved_tier && (
            <div className="mt-3 text-sm text-gray-700">Approved → Quality <b>{Number(score.approved_quality_score).toFixed(1)}</b> · Compliance <b>{(score.approved_indicator_compliance * 100).toFixed(1)}%</b> · Composite <b>{Number(score.approved_composite_score).toFixed(1)}</b> · <Badge cls="bg-indigo-100 text-indigo-700 border-indigo-200">{score.approved_tier}</Badge></div>
          )}
        </div>
      )}

      {tab === 'crew' && (
        <div className="bg-white border rounded-xl p-4 text-sm text-gray-600">
          Crew feedback is routed per provider after approval. Providers see only their own charts' feedback
          (enforced by agency + capability + RLS). No feedback has been issued for this synthetic review yet.
        </div>
      )}

      {tab === 'audit' && <AuditList agency={agency} />}
    </div>
  );
}

function AuditList({ agency }) {
  const [events, setEvents] = useState(null);
  useEffect(() => { emscsQa.audit(agency).then((d) => setEvents(d.events)).catch(() => setEvents([])); }, [agency]);
  if (!events) return <div className="text-gray-400 text-sm">Loading…</div>;
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500 border-b"><tr><th className="px-3 py-2">When</th><th>Action</th><th>Before → After</th><th>Reason</th></tr></thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-b last:border-0 align-top">
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{e.at ? new Date(e.at).toLocaleString() : '—'}</td>
              <td className="px-3 py-2 font-medium text-gray-800">{e.action}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{e.before ? JSON.stringify(e.before) : ''}{e.after ? ' → ' + JSON.stringify(e.after) : ''}</td>
              <td className="px-3 py-2 text-xs text-gray-500">{e.detail?.reason || ''}</td>
            </tr>
          ))}
          {events.length === 0 && <tr><td colSpan={4} className="px-3 py-5 text-center text-gray-400">No audit events.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
