'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  BarChart2, ArrowRight,
} from 'lucide-react';

const YEAR_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED'];

function pctChange(old, nw) {
  if (old == null || nw == null || old === 0) return null;
  return ((nw - old) / old * 100).toFixed(1);
}

function ChangeChip({ old: oldVal, new: newVal, lowerIsBetter }) {
  const pct = pctChange(oldVal, newVal);
  if (pct == null) return null;
  const num = parseFloat(pct);
  const improved = lowerIsBetter ? num < 0 : num > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
      improved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {improved ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {num > 0 ? '+' : ''}{pct}%
    </span>
  );
}

function fmt(val, type) {
  if (val == null) return '—';
  if (type === 'seconds') {
    const m = Math.floor(val / 60);
    const s = Math.round(val % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  if (type === 'pct') return `${val}%`;
  return Number(val).toLocaleString();
}

export default function PortalYearOverYearPage() {
  const router = useRouter();
  const { id } = useParams();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [yearA, setYearA]       = useState('');
  const [yearB, setYearB]       = useState('');
  const [compareData, setCompareData] = useState(null);
  const [comparing, setComparing]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/datasets/${id}/portal/dashboard`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const d = await res.json();
      setData(d);
      const cleaned = d.cleaned_years || [];
      if (cleaned.length >= 2) {
        setYearA(String(cleaned[cleaned.length - 2]));
        setYearB(String(cleaned[cleaned.length - 1]));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proxy/auth/session', { credentials: 'include' });
        const s = await res.json();
        if (!s.authenticated) { router.replace('/portal/login'); return; }
        load();
      } catch { router.replace('/portal/login'); }
    })();
  }, [router, load]);

  async function runCompare() {
    if (!yearA || !yearB || yearA === yearB) return;
    setComparing(true);
    try {
      const params = new URLSearchParams({ year_a: yearA, year_b: yearB });
      const res = await fetch(`/api/proxy/datasets/${id}/compare?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setCompareData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setComparing(false);
    }
  }

  // Auto-run compare when years are selected
  useEffect(() => {
    if (yearA && yearB && yearA !== yearB) runCompare();
  }, [yearA, yearB]);

  const trendSeries  = data?.trend_series  || [];
  const cleanedYears = data?.cleaned_years || [];
  const summary      = data?.summary       || {};
  const yearly       = data?.yearly        || [];

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard…
    </div>
  );

  if (error) return (
    <div className="p-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">{error}</div>
  );

  if (cleanedYears.length < 2) return (
    <div className="p-8 text-center text-gray-400 space-y-3">
      <BarChart2 size={36} className="mx-auto opacity-30" />
      <p className="font-medium text-gray-600">Not enough data yet</p>
      <p className="text-sm">At least 2 years of cleaned data are needed for comparison. Contact your Mullen Analytics representative.</p>
      <Link href="/portal/datasets" className="inline-flex items-center gap-1 text-blue-600 text-sm hover:underline">
        <ArrowLeft size={14} /> Back to Datasets
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/portal/datasets" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ArrowLeft size={14} /> Datasets
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={20} /> Year-over-Year Comparison
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.name}</p>
        </div>
      </div>

      {data?.missing_years?.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={15} />
          Missing data for {data.missing_years.join(', ')} — contact your representative to upload these years.
        </div>
      )}

      {/* ── COMPARE YEARS — most prominent section ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-lg font-bold mb-1">Compare Years</h2>
        <p className="text-blue-100 text-sm mb-5">Select two years to see a side-by-side performance comparison.</p>

        <div className="flex items-end gap-4 flex-wrap mb-6">
          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5">Baseline Year</label>
            <select
              value={yearA}
              onChange={e => setYearA(e.target.value)}
              className="bg-white text-gray-900 border-0 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[110px]"
            >
              {cleanedYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center pb-2 text-blue-200">
            <ArrowRight size={20} />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5">Compare To</label>
            <select
              value={yearB}
              onChange={e => setYearB(e.target.value)}
              className="bg-white text-gray-900 border-0 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[110px]"
            >
              {cleanedYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={runCompare}
            disabled={comparing || !yearA || !yearB || yearA === yearB}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-semibold text-sm rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {comparing ? <RefreshCw size={14} className="animate-spin" /> : <BarChart2 size={14} />}
            {comparing ? 'Comparing…' : 'Compare'}
          </button>
        </div>

        {/* Inline comparison cards */}
        {compareData?.rows && (() => {
          const keyMetrics = [
            { key: 'total_calls',        label: 'Total Calls',           type: 'number' },
            { key: 'avg_response_time',  label: 'Avg Response Time',     type: 'seconds', lower: true },
            { key: 'p90_response_time',  label: 'P90 Response Time',     type: 'seconds', lower: true },
            { key: 'transports',         label: 'Transports',            type: 'number' },
            { key: 'ift_calls',          label: 'IFT Calls',             type: 'number' },
            { key: 'missing_dispatch_pct', label: 'Missing Dispatch %',  type: 'pct',    lower: true },
          ];
          const byKey = Object.fromEntries(
            compareData.rows.map(r => [
              r.metric
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/_+$/, ''),
              r
            ])
          );
          const lookup = (key) => {
            const row = compareData.rows.find(r => {
              const k = r.metric.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
              return k === key || k.includes(key.split('_')[0]);
            });
            return row;
          };

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {keyMetrics.map(({ key, label, type, lower }) => {
                const row = compareData.rows.find(r =>
                  r.metric.toLowerCase().replace(/[^a-z0-9 ]+/g,'').includes(label.toLowerCase().split(' ')[0].replace(/[^a-z]/g,''))
                );
                if (!row) return null;
                const va = row[String(compareData.year_a)];
                const vb = row[String(compareData.year_b)];
                return (
                  <div key={key} className="bg-white/15 backdrop-blur rounded-xl p-3">
                    <p className="text-blue-100 text-xs mb-1">{label}</p>
                    <div className="flex items-end gap-2">
                      <div>
                        <p className="text-[10px] text-blue-200">{compareData.year_a}</p>
                        <p className="text-white font-bold text-sm">{fmt(va, type)}</p>
                      </div>
                      <ArrowRight size={12} className="text-blue-300 mb-1 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-blue-200">{compareData.year_b}</p>
                        <p className="text-white font-bold text-sm">{fmt(vb, type)}</p>
                      </div>
                      <div className="mb-0.5">
                        <ChangeChip old={va} new={vb} lowerIsBetter={lower} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Full comparison table */}
      {compareData?.rows && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              Full Comparison: {compareData.year_a} vs {compareData.year_b}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Metric</th>
                  <th className="px-4 py-3 text-right font-medium">{compareData.year_a}</th>
                  <th className="px-4 py-3 text-right font-medium">{compareData.year_b}</th>
                  <th className="px-4 py-3 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {compareData.rows.map(row => {
                  const va = row[String(compareData.year_a)];
                  const vb = row[String(compareData.year_b)];
                  const pct = row.change_pct;
                  const color = pct == null ? '' : pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : 'text-gray-400';
                  return (
                    <tr key={row.metric} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{row.metric}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{fmt(va, row.format)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{fmt(vb, row.format)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${color}`}>
                        {pct == null ? '—' : `${pct > 0 ? '+' : ''}${pct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trend charts */}
      {trendSeries.length >= 2 && (
        <>
          <div className="bg-white border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Call Volume by Year</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total_calls" name="Total Calls" fill="#2563EB" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {trendSeries.some(d => d.avg_response_time) && (
            <div className="bg-white border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Response Time Trend (seconds)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg_response_time" name="Avg (s)" stroke="#2563EB" strokeWidth={2} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="p90_response_time" name="P90 (s)"  stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {(() => {
            const monthly = yearly.filter(y => y.calls_by_month && Object.keys(y.calls_by_month).length > 0);
            if (monthly.length < 2) return null;
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const series = months.map((m, i) => {
              const row = { month: m };
              monthly.forEach(y => { row[y.year] = y.calls_by_month?.[i+1] || y.calls_by_month?.[String(i+1)] || 0; });
              return row;
            });
            return (
              <div className="bg-white border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Volume by Year</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {monthly.map((y, i) => (
                      <Line key={y.year} type="monotone" dataKey={y.year} stroke={YEAR_COLORS[i % YEAR_COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
