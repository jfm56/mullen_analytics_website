'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, RefreshCw, AlertTriangle, TrendingUp,
  TrendingDown, Minus, BarChart2,
} from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';

const YEAR_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];

function KpiCard({ label, value, sub, trend }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const color = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400';
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
      {sub && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${color}`}>
          <Icon size={12} />{sub}
        </div>
      )}
    </div>
  );
}

function CompareTable({ rows, yearA, yearB, yearC }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3 font-medium">Metric</th>
            <th className="px-4 py-3 font-medium text-right">{yearA}</th>
            <th className="px-4 py-3 font-medium text-right">{yearB}</th>
            {yearC && <th className="px-4 py-3 font-medium text-right">{yearC}</th>}
            <th className="px-4 py-3 font-medium text-right">Change ({yearA}→{yearB})</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => {
            const chg = row.change_pct;
            const chgColor = chg == null ? '' : chg > 0 ? 'text-green-600' : chg < 0 ? 'text-red-600' : 'text-gray-400';
            const fmt = (v, type) => {
              if (v == null) return '—';
              if (type === 'seconds') return `${Math.round(v)}s`;
              if (type === 'pct') return `${v}%`;
              return Number(v).toLocaleString();
            };
            return (
              <tr key={row.metric} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-700">{row.metric}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{fmt(row[String(yearA)], row.format)}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{fmt(row[String(yearB)], row.format)}</td>
                {yearC && <td className="px-4 py-2.5 text-right text-gray-600">{fmt(row[String(yearC)], row.format)}</td>}
                <td className={`px-4 py-2.5 text-right font-medium ${chgColor}`}>
                  {chg == null ? '—' : `${chg > 0 ? '+' : ''}${chg}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function YearOverYearDashboard() {
  const router   = useRouter();
  const { id }   = useParams();
  const [authOk, setAuthOk]     = useState(false);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Compare controls
  const [yearA, setYearA] = useState('');
  const [yearB, setYearB] = useState('');
  const [yearC, setYearC] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [comparing, setComparing]     = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/proxy/datasets/${id}/dashboard`, { credentials: 'include' });
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
        const s   = await res.json();
        if (!s.authenticated || s.profile?.role !== 'admin') { router.replace('/portal/login'); return; }
        setAuthOk(true);
        load();
      } catch { router.replace('/portal/login'); }
    })();
  }, [router, load]);

  async function runCompare() {
    if (!yearA || !yearB) return;
    setComparing(true);
    try {
      const params = new URLSearchParams({ year_a: yearA, year_b: yearB });
      if (yearC) params.set('year_c', yearC);
      const res = await fetch(`/api/proxy/datasets/${id}/compare?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setCompareData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setComparing(false);
    }
  }

  const trendSeries = data?.trend_series || [];
  const cleanedYears = data?.cleaned_years || [];
  const summary = data?.summary || {};

  if (!authOk || loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading dashboard…
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Link href={`/admin/data/datasets/${id}`} className="flex items-center gap-1 hover:text-gray-900">
          <ArrowLeft size={14} /> {data?.name || 'Dataset'}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Year-over-Year Dashboard</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={20} /> Year-over-Year EMS Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.name} · {data?.client_name} · {cleanedYears.join(', ')}
          </p>
        </div>
        <button onClick={load} className="p-2 border rounded-lg bg-white hover:bg-gray-50">
          <RefreshCw size={14} />
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {data?.missing_years?.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={15} />
          Missing years: <strong>{data.missing_years.join(', ')}</strong>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Highest Volume Year" value={summary.highest_volume_year} />
        <KpiCard label="Lowest Volume Year"  value={summary.lowest_volume_year} />
        <KpiCard label="Avg Calls / Year"    value={summary.avg_calls_per_year?.toLocaleString()} />
        <KpiCard label="Best Response Year"  value={summary.best_response_year} />
      </div>

      {trendSeries.length > 0 && (
        <>
          {/* Calls by Year */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Total Calls by Year</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total_calls" name="Total Calls" fill="#2563EB" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Response time trends */}
          {trendSeries.some(d => d.avg_response_time) && (
            <div className="bg-white border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Average Response Time by Year (seconds)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg_response_time" name="Avg Response (s)" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="p90_response_time" name="P90 Response (s)"  stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Calls by Month across years — multi-line */}
          {(() => {
            const monthly = data?.yearly?.filter(y => y.calls_by_month && Object.keys(y.calls_by_month).length > 0);
            if (!monthly?.length) return null;
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const series = months.map((m, i) => {
              const row = { month: m };
              monthly.forEach(y => { row[y.year] = y.calls_by_month?.[i + 1] || y.calls_by_month?.[String(i + 1)] || 0; });
              return row;
            });
            return (
              <div className="bg-white border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Call Volume by Year</h2>
                <ResponsiveContainer width="100%" height={260}>
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

          {/* Transport breakdown */}
          {trendSeries.some(d => d.transports) && (
            <div className="bg-white border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Transport Breakdown by Year</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="transports"   name="Transports"   fill="#16A34A" radius={[4,4,0,0]} />
                  <Bar dataKey="ift_calls"    name="IFT Calls"    fill="#D97706" radius={[4,4,0,0]} />
                  <Bar dataKey="total_calls"  name="Total Calls"  fill="#2563EB" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Compare Years tool */}
      {cleanedYears.length >= 2 && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Compare Years</h2>
          <div className="flex items-end gap-3 flex-wrap">
            {[
              { label: 'Baseline Year', val: yearA, set: setYearA },
              { label: 'Compare To',   val: yearB, set: setYearB },
              { label: '+ Optional',   val: yearC, set: setYearC, optional: true },
            ].map(({ label, val, set, optional }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <select
                  value={val}
                  onChange={e => set(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {optional && <option value="">None</option>}
                  {cleanedYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            ))}
            <button
              onClick={runCompare}
              disabled={comparing || !yearA || !yearB}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {comparing ? <RefreshCw size={13} className="animate-spin" /> : <BarChart2 size={13} />}
              {comparing ? 'Comparing…' : 'Run Comparison'}
            </button>
          </div>

          {compareData?.rows && (
            <div className="border rounded-xl overflow-hidden">
              <CompareTable
                rows={compareData.rows}
                yearA={compareData.year_a}
                yearB={compareData.year_b}
                yearC={compareData.year_c}
              />
            </div>
          )}
        </div>
      )}

      {trendSeries.length === 0 && (
        <div className="bg-gray-50 border border-dashed rounded-xl p-10 text-center text-gray-400 text-sm">
          No cleaned yearly data found yet. Upload and clean yearly EMSCharts CSVs, assign them to this dataset group, then return here.
        </div>
      )}
    </div>
  );
}
