'use client';

// Admin "Analytics" dashboard — first-party visitor analytics (consent-gated,
// self-hosted). Reads GET /api/admin/analytics/overview (admin-gated) and
// renders KPIs + trends with recharts. The "Leads" tab is a placeholder until
// the nightly lead-discovery crawler ships (Phase 3).

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import {
  Users, Eye, Clock, RefreshCw, TrendingUp, LogOut, LayoutGrid, Radar,
} from 'lucide-react';
import CHART from '@/lib/chartTheme';

const RANGES = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }];

function fmtSeconds(s) {
  s = Math.round(s || 0);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
function fmtNum(n) { return (n ?? 0).toLocaleString(); }

function Kpi({ label, value, sub, Icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <Icon size={16} className="text-slate-400" />}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Panel({ title, children, empty }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-4">{title}</h3>
      {empty ? <p className="text-sm text-slate-400 py-8 text-center">No data yet</p> : children}
    </div>
  );
}

function ListTable({ rows, cols }) {
  if (!rows?.length) return <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
            {cols.map((c) => <th key={c.key} className={`py-2 pr-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              {cols.map((c) => (
                <td key={c.key} className={`py-2 pr-3 ${c.align === 'right' ? 'text-right tabular-nums text-slate-600' : 'text-slate-800'} ${c.mono ? 'font-mono text-xs' : ''}`}>
                  {c.fmt ? c.fmt(r[c.key]) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function scoreColor(s) {
  if (s >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s >= 45) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function LeadOutreachModal({ lead, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [activeId, setActiveId] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/proxy2/admin/leads/${lead.id}/outreach`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const list = d.messages || [];
        setMessages(list);
        const draft = list.find((m) => m.status !== 'sent');
        if (draft) { setActiveId(draft.id); setSubject(draft.subject || ''); setBodyText(draft.body_text || ''); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const draft = () => {
    if (!lead.contact_email) { setMsg('This lead has no email address.'); return; }
    setBusy(true); setMsg('');
    fetch(`/api/proxy2/admin/leads/${lead.id}/outreach/draft`, { method: 'POST', credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) { setActiveId(res.id); setSubject(res.subject || ''); setBodyText(res.body_text || ''); setMsg('Draft generated — review and edit before sending.'); }
        else setMsg(res.reason || 'Draft failed.');
      })
      .catch((e) => setMsg(e.message)).finally(() => setBusy(false));
  };

  const send = () => {
    if (!activeId) return;
    if (!window.confirm(`Send this email to ${lead.contact_email}?`)) return;
    setBusy(true); setMsg('');
    fetch(`/api/proxy2/admin/outreach/${activeId}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body_text: bodyText }),
    })
      .then(() => fetch(`/api/proxy2/admin/outreach/${activeId}/send`, { method: 'POST', credentials: 'include' }))
      .then((r) => r.json())
      .then((res) => { setMsg(res.ok ? `Sent to ${res.sent_to}.` : (res.reason || 'Send failed.')); load(); })
      .catch((e) => setMsg(e.message)).finally(() => setBusy(false));
  };

  const saveDraft = () => {
    if (!activeId) return;
    setBusy(true);
    fetch(`/api/proxy2/admin/outreach/${activeId}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body_text: bodyText }),
    }).then(() => setMsg('Draft saved.')).catch((e) => setMsg(e.message)).finally(() => setBusy(false));
  };

  const sent = messages.filter((m) => m.status === 'sent');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Outreach — {lead.company}</h3>
            <p className="text-sm text-slate-500">{lead.contact_email || 'no email address on file'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>

        {!lead.contact_email && <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-2 text-sm mb-4">No email address — can&rsquo;t draft outreach for this lead.</div>}
        {msg && <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 mb-4">{msg}</div>}

        {loading ? <p className="text-sm text-slate-400 py-6 text-center">Loading…</p> : !activeId ? (
          <div className="text-center py-6">
            <button onClick={draft} disabled={busy || !lead.contact_email}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-60">
              {busy ? 'Drafting…' : 'Draft outreach with AI'}
            </button>
            <p className="text-xs text-slate-400 mt-2">A draft is generated for your review — nothing sends automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <label className="block text-xs font-semibold text-slate-600">Body</label>
            <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={10} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <p className="text-xs text-slate-400">A CAN-SPAM footer (postal address + one-click unsubscribe) and Reply-To (jmullen@mullenanalytics.com) are added automatically.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={draft} disabled={busy} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Re-draft</button>
              <button onClick={saveDraft} disabled={busy} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Save draft</button>
              <button onClick={send} disabled={busy}
                className="ml-auto px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-60">
                {busy ? 'Working…' : 'Approve & send'}
              </button>
            </div>
          </div>
        )}

        {sent.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">Sent</p>
            {sent.map((m) => (
              <div key={m.id} className="text-sm text-slate-600 py-1">
                <span className="text-emerald-600 font-medium">✓ sent</span> · {m.subject}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [msg, setMsg] = useState('');
  const [outreachLead, setOutreachLead] = useState(null);

  const load = () => {
    setLoading(true); setError('');
    fetch('/api/proxy2/admin/leads', { credentials: 'include' })
      .then(async (r) => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const runDiscover = () => {
    setDiscovering(true); setMsg('');
    fetch('/api/proxy2/admin/leads/discover', { method: 'POST', credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        setMsg(res.ok ? `Found ${res.found ?? 0}, added ${res.inserted ?? 0} new lead(s).` : (res.reason || 'Discovery unavailable.'));
        load();
      })
      .catch((e) => setMsg(e.message))
      .finally(() => setDiscovering(false));
  };

  const leads = data?.leads || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{data ? `${data.total} lead${data.total === 1 ? '' : 's'} discovered` : 'Loading…'}</p>
          {data && !data.ready && (
            <p className="text-xs text-amber-600 mt-0.5">
              Discovery engine not configured — start Ollama (or set an LLM key) and install the search package to run the crawler.
            </p>
          )}
        </div>
        <button onClick={runDiscover} disabled={discovering}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60">
          <Radar size={15} /> {discovering ? 'Discovering…' : 'Run discovery now'}
        </button>
      </div>
      {msg && <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600">{msg}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        {loading ? (
          <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
        ) : leads.length === 0 ? (
          <div className="text-center py-10">
            <Radar size={26} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No leads yet. Click <strong>Run discovery now</strong> (or wait for the nightly crawl) to find
              companies looking for analytics / ML / data-engineering help.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3 font-semibold">Company</th>
                  <th className="py-2 pr-3 font-semibold">What they want</th>
                  <th className="py-2 pr-3 font-semibold">Vertical</th>
                  <th className="py-2 pr-3 font-semibold text-right">Score</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold text-right">Outreach</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-slate-800">{l.company}</p>
                      {l.website && (
                        <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">{l.website}</a>
                      )}
                      {l.contact_email && <p className="text-xs text-slate-500">{l.contact_email}</p>}
                    </td>
                    <td className="py-2 pr-3 text-slate-600 max-w-md">{l.need_summary || l.signal || '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{l.vertical || '—'}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${scoreColor(l.score)}`}>{l.score}</span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{l.status}</td>
                    <td className="py-2 pr-3 text-right">
                      <button onClick={() => setOutreachLead(l)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-blue-600 hover:bg-blue-50">
                        Outreach
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {outreachLead && <LeadOutreachModal lead={outreachLead} onClose={() => { setOutreachLead(null); load(); }} />}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [tab, setTab] = useState('visitors');
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    fetch(`/api/proxy2/admin/analytics/overview?days=${days}`, { credentials: 'include' })
      .then(async (r) => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const k = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Header + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">First-party website visitor analytics (consent-based) &amp; lead intelligence.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('visitors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'visitors' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <LayoutGrid size={15} /> Visitors
          </button>
          <button onClick={() => setTab('leads')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'leads' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Radar size={15} /> Leads
          </button>
        </div>
      </div>

      {tab === 'leads' && <LeadsPanel />}

      {tab === 'visitors' && (
        <>
          {/* Range selector */}
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button key={r.days} onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${days === r.days ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {r.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}
          {loading && <p className="text-sm text-slate-400 py-10 text-center">Loading analytics…</p>}

          {!loading && !error && data && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <Kpi label="Visitors" value={fmtNum(k.visitors)} sub={`${fmtNum(k.new_visitors)} new · ${fmtNum(k.returning_visitors)} returning`} Icon={Users} />
                <Kpi label="Pageviews" value={fmtNum(k.pageviews)} sub={`${fmtNum(k.pageviews_24h)} in last 24h`} Icon={Eye} />
                <Kpi label="Sessions" value={fmtNum(k.sessions)} Icon={TrendingUp} />
                <Kpi label="Avg. time on page" value={fmtSeconds(k.avg_time_on_page_s)} Icon={Clock} />
                <Kpi label="Bounce rate" value={`${k.bounce_rate ?? 0}%`} sub="single-page sessions" Icon={LogOut} />
                <Kpi label="Returning" value={`${k.sessions ? Math.round(100 * (k.returning_visitors || 0) / k.sessions) : 0}%`} sub="of sessions" Icon={RefreshCw} />
              </div>

              {/* Trend */}
              <Panel title="Visitors &amp; pageviews over time" empty={!data.trend?.length}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.trend} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="gpv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.primary} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={CHART.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gvis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART.good} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART.good} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="date" tick={CHART.tickSm || CHART.tick} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={CHART.tick} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                    <Tooltip contentStyle={CHART.tooltip} />
                    <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke={CHART.primary} strokeWidth={2} fill="url(#gpv)" />
                    <Area type="monotone" dataKey="visitors" name="Visitors" stroke={CHART.good} strokeWidth={2} fill="url(#gvis)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>

              {/* Pages + tab clicks */}
              <div className="grid lg:grid-cols-2 gap-5">
                <Panel title="Top pages" empty={!data.top_pages?.length}>
                  <ListTable rows={data.top_pages} cols={[
                    { key: 'path', label: 'Page', mono: true },
                    { key: 'views', label: 'Views', align: 'right', fmt: fmtNum },
                  ]} />
                </Panel>
                <Panel title="Most-clicked tabs / links" empty={!data.top_tabs?.length}>
                  {data.top_tabs?.length ? (
                    <ResponsiveContainer width="100%" height={Math.max(180, data.top_tabs.length * 30)}>
                      <BarChart data={data.top_tabs} layout="vertical" margin={{ left: 20, right: 16 }}>
                        <XAxis type="number" hide allowDecimals={false} />
                        <YAxis type="category" dataKey="label" width={130} tick={CHART.tickSm || CHART.tick} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={CHART.tooltip} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="clicks" fill={CHART.accent} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>}
                </Panel>
              </div>

              {/* Referrers + devices + regions */}
              <div className="grid lg:grid-cols-3 gap-5">
                <Panel title="Top sources" empty={!data.referrers?.length}>
                  <ListTable rows={data.referrers} cols={[
                    { key: 'source', label: 'Referrer' },
                    { key: 'sessions', label: 'Sessions', align: 'right', fmt: fmtNum },
                  ]} />
                </Panel>
                <Panel title="Devices" empty={!data.devices?.length}>
                  <ListTable rows={data.devices} cols={[
                    { key: 'device', label: 'Device' },
                    { key: 'sessions', label: 'Sessions', align: 'right', fmt: fmtNum },
                  ]} />
                </Panel>
                <Panel title="Regions (by timezone)" empty={!data.regions?.length}>
                  <ListTable rows={data.regions} cols={[
                    { key: 'timezone', label: 'Timezone', mono: true },
                    { key: 'visitors', label: 'Visitors', align: 'right', fmt: fmtNum },
                  ]} />
                </Panel>
              </div>

              {/* Time on page */}
              <Panel title="Average time on page" empty={!data.time_on_page?.length}>
                <ListTable rows={data.time_on_page} cols={[
                  { key: 'path', label: 'Page', mono: true },
                  { key: 'avg_seconds', label: 'Avg. time', align: 'right', fmt: (v) => fmtSeconds(v) },
                  { key: 'samples', label: 'Samples', align: 'right', fmt: fmtNum },
                ]} />
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}
