'use client';
import { useState, useEffect, useMemo } from 'react';
import { tools } from '@/lib/api';
import { fmtDateTime } from '@/lib/datetime';
import { TrendingUp, TrendingDown, Minus, Mail, ChevronDown, ChevronRight } from 'lucide-react';

const TOOL_LABEL = { revenue_checker: 'Revenue Checker', profit_calculator: 'Profit Calculator' };
const money = (n) => (n == null || isNaN(Number(n))) ? '—' : '$' + Math.round(Number(n)).toLocaleString();
const pct = (n) => (n == null || isNaN(Number(n))) ? '—' : `${Number(n) > 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
const num = (n) => (n == null || isNaN(Number(n))) ? '—' : Math.round(Number(n)).toLocaleString();
const median = (arr) => {
  const a = arr.filter((x) => x != null && !isNaN(Number(x))).map(Number).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

function Dir({ dir }) {
  if (dir === 'up') return <TrendingUp size={14} className="text-green-600 inline" />;
  if (dir === 'down') return <TrendingDown size={14} className="text-red-600 inline" />;
  return <Minus size={14} className="text-gray-400 inline" />;
}

function summarize(row) {
  const r = row.results || {}, i = row.inputs || {};
  if (row.tool === 'revenue_checker') return `${money(r.total)} total · trend ${pct(r.trendPct)} · YoY ${r.yoyPct == null ? '—' : pct(r.yoyPct)}`;
  if (row.tool === 'profit_calculator') return `${i.industry ? i.industry + ' · ' : ''}rev ${money(r.revenue)} · profit ${money(r.profit)} (${pct(r.netMargin)})`;
  return '';
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminToolsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    setLoading(true); setErr('');
    tools.adminUsage(filter || undefined).then(setData).catch((e) => setErr(e.message || 'Failed to load')).finally(() => setLoading(false));
  }, [filter]);

  const rows = data?.rows || [];
  const totals = data?.totals || { revenue_checker: 0, profit_calculator: 0, all: 0 };

  const agg = useMemo(() => {
    const rc = rows.filter((r) => r.tool === 'revenue_checker');
    const pc = rows.filter((r) => r.tool === 'profit_calculator');
    const trend = { up: 0, flat: 0, down: 0 };
    rc.forEach((r) => { const d = r.results?.dir; if (d in trend) trend[d]++; });
    const ind = {};
    pc.forEach((r) => { const k = (r.inputs?.industry || '').trim() || '(blank)'; ind[k] = (ind[k] || 0) + 1; });
    const topInd = Object.entries(ind).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      rc: rc.length, pc: pc.length,
      medRevenue: median(rc.map((r) => r.results?.total)),
      medMargin: median(pc.map((r) => r.results?.netMargin)),
      medBreakeven: median(pc.map((r) => r.results?.breakevenUnits)),
      trend, topInd,
      withLead: rows.filter((r) => r.has_lead).length,
    };
  }, [rows]);

  const TABS = [['', 'All'], ['revenue_checker', 'Revenue Checker'], ['profit_calculator', 'Profit Calculator']];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tool Usage</h1>
        <p className="text-sm text-gray-500 mt-0.5">How the public Revenue Checker &amp; Profit Calculator are used, and the results people see. Anonymous — no identity unless a visitor messages you.</p>
      </div>

      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{err}</div>}

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Total calculations" value={num(totals.all)} />
        <Stat label="Revenue Checker" value={num(totals.revenue_checker)} />
        <Stat label="Profit Calculator" value={num(totals.profit_calculator)} />
        <Stat label="Also messaged you" value={num(agg.withLead)} sub="in this window" />
      </div>

      {/* Learn-from-it aggregates */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-3">Revenue Checker — what people see <span className="text-xs font-normal text-gray-400">(last {agg.rc})</span></p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Median annual revenue</p><p className="font-semibold">{money(agg.medRevenue)}</p></div>
            <div>
              <p className="text-xs text-gray-500">Trend of their business</p>
              <p className="font-semibold"><TrendingUp size={13} className="text-green-600 inline" /> {agg.trend.up} · <Minus size={13} className="text-gray-400 inline" /> {agg.trend.flat} · <TrendingDown size={13} className="text-red-600 inline" /> {agg.trend.down}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-3">Profit Calculator — what people see <span className="text-xs font-normal text-gray-400">(last {agg.pc})</span></p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Median net margin</p><p className="font-semibold">{pct(agg.medMargin)}</p></div>
            <div><p className="text-xs text-gray-500">Median break-even</p><p className="font-semibold">{agg.medBreakeven == null ? '—' : `${num(agg.medBreakeven)} units/mo`}</p></div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Top industries</p>
              <div className="flex flex-wrap gap-1.5">
                {agg.topInd.length === 0 && <span className="text-gray-400 text-xs">—</span>}
                {agg.topInd.map(([k, n]) => <span key={k} className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{k} · {n}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {TABS.map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${filter === val ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b text-sm font-semibold text-gray-900">Recent calculations {loading && <span className="text-xs font-normal text-blue-500 animate-pulse ml-2">loading…</span>}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium w-8"></th>
                <th className="px-4 py-2.5 text-left font-medium">When</th>
                <th className="px-4 py-2.5 text-left font-medium">Tool</th>
                <th className="px-4 py-2.5 text-left font-medium">Result</th>
                <th className="px-4 py-2.5 text-center font-medium">Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No calculations recorded yet.</td></tr>
              )}
              {rows.map((r) => (
                <FragmentRow key={r.id} row={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ row, open, onToggle }) {
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-2.5 text-gray-400">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDateTime(row.created_at)}</td>
        <td className="px-4 py-2.5"><span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{TOOL_LABEL[row.tool] || row.tool}</span></td>
        <td className="px-4 py-2.5 text-gray-800">{summarize(row)}</td>
        <td className="px-4 py-2.5 text-center">{row.has_lead ? <Mail size={14} className="text-green-600 inline" /> : ''}</td>
      </tr>
      {open && (
        <tr className="bg-gray-50/60">
          <td></td>
          <td colSpan={4} className="px-4 py-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">What they entered</p>
                <pre className="text-xs bg-white border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(row.inputs, null, 2)}</pre>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">What they were shown</p>
                <pre className="text-xs bg-white border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(row.results, null, 2)}</pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
