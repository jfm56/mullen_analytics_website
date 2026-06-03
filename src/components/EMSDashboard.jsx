'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart as RBarChart, Bar, LineChart as RLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import DashboardFilterBar from './DashboardFilterBar';
import CompareMode from './CompareMode';
import ColumnMappingModal from './ColumnMappingModal';
import { dashboardFilter } from '@/lib/api';
import {
  Phone, Clock, TrendingUp, AlertTriangle, CheckCircle,
  BarChart2, Activity, Users, Shield, FileText,
  ChevronDown, ChevronUp, Lightbulb, Download,
  Settings, Calendar, Database, Zap,
} from 'lucide-react';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n) => n != null ? Number(n).toLocaleString() : '—';
const fmtMin = (n) => {
  if (n == null) return '—';
  const m = Math.floor(n); const s = Math.round((n - m) * 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'blue', tooltip }) {
  const schemes = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',  icon: 'text-blue-500',   val: 'text-blue-900' },
    green:  { bg: 'bg-green-50',  border: 'border-green-100', icon: 'text-green-500',  val: 'text-green-900' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-100',icon: 'text-purple-500', val: 'text-purple-900' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-100',icon: 'text-orange-500', val: 'text-orange-900' },
    red:    { bg: 'bg-red-50',    border: 'border-red-100',   icon: 'text-red-500',    val: 'text-red-900' },
    gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',  icon: 'text-gray-400',   val: 'text-gray-900' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100',icon: 'text-indigo-500', val: 'text-indigo-900' },
  };
  const s = schemes[color] || schemes.blue;
  return (
    <div className={`rounded-xl border ${s.bg} ${s.border} px-4 py-3.5 relative group`} title={tooltip}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className={`text-2xl font-bold ${s.val} tabular-nums`}>{value ?? '—'}</div>
          <div className="text-xs font-semibold text-gray-500 mt-1 leading-tight">{label}</div>
          {sub && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</div>}
        </div>
        {Icon && <Icon size={18} className={`${s.icon} mt-0.5 flex-shrink-0 ml-2`} />}
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 text-center shadow-lg pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────
function Section({ id, title, icon: Icon, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ems_dash_${id}`);
      if (saved !== null) setOpen(saved === '1');
    } catch { /* ignore */ }
  }, [id]);
  const toggle = () => {
    setOpen(o => {
      try { localStorage.setItem(`ems_dash_${id}`, !o ? '1' : '0'); } catch { /* ignore */ }
      return !o;
    });
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2.5">
          {Icon && <Icon size={16} className="text-blue-600 flex-shrink-0" />}
          <span className="text-sm font-bold text-gray-900">{title}</span>
          {badge}
        </span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 space-y-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0 ${
            active === t.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── ExportCSVButton ──────────────────────────────────────────────────────────
function ExportCSVButton({ data, filename = 'export.csv' }) {
  const handleClick = () => {
    if (!Array.isArray(data) || !data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r =>
      Object.values(r).map(v => (String(v).includes(',') ? `"${v}"` : v)).join(',')
    ).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={handleClick} title="Export CSV"
      className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-200 transition-colors">
      <Download size={11} /> CSV
    </button>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function HBarChart({ data, labelKey = 'label', valueKey = 'count', color = '#3b82f6', top = 10, showAll = false }) {
  const [expanded, setExpanded] = useState(false);
  if (!Array.isArray(data) || data.length === 0) return null;
  const displayCount = expanded || showAll ? data.length : top;
  const sliced = data.slice(0, displayCount);
  const max = Math.max(...sliced.map(d => d[valueKey] || 0), 1);
  const ROW_H = 32, LABEL_W = 180, BAR_AREA = 260, VALUE_W = 60;
  const svgW = LABEL_W + BAR_AREA + VALUE_W;
  const height = sliced.length * ROW_H + 8;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg width={svgW} height={height} style={{ minWidth: Math.min(svgW, 500) }}>
          {sliced.map((d, i) => {
            const barW = Math.max(2, (d[valueKey] / max) * BAR_AREA);
            const y = 4 + i * ROW_H;
            const raw = String(d[labelKey] ?? '');
            const label = raw.length > 28 ? raw.slice(0, 27) + '…' : raw;
            const valStr = typeof d[valueKey] === 'number' && !Number.isInteger(d[valueKey])
              ? d[valueKey].toFixed(1) : String(d[valueKey] ?? '');
            return (
              <g key={i}>
                <text x={LABEL_W - 8} y={y + 20} textAnchor="end" fontSize={11} fill="#6b7280">{label}</text>
                <rect x={LABEL_W} y={y + 6} width={barW} height={20} rx={3} fill={color} opacity={0.8} />
                <text x={LABEL_W + barW + 6} y={y + 20} fontSize={11} fill="#374151" fontWeight="500">{valStr}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {data.length > top && (
        <button onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs text-blue-600 hover:underline">
          {expanded ? `Show Top ${top}` : `View All ${data.length} Categories`}
        </button>
      )}
    </div>
  );
}

function TrendChart({ byDay, byWeek, byMonth }) {
  const datasets = { day: byDay, week: byWeek, month: byMonth };
  const xKeys = { day: 'date', week: 'week', month: 'month' };
  const hasData = (k) => Array.isArray(datasets[k]) && datasets[k].length > 0;
  const defaultTrend = hasData('week') ? 'week' : hasData('day') ? 'day' : 'month';
  const [trend, setTrend] = useState(defaultTrend);
  const data = hasData(trend) ? datasets[trend] : [];
  const xKey = xKeys[trend];
  const fmtTick = (v) => !v ? '' : trend === 'month' ? String(v) : String(v).slice(5);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">Call volume over time</p>
        <div className="flex gap-1">
          {[['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']].map(([val, label]) => (
            <button key={val} onClick={() => setTrend(val)} disabled={!hasData(val)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                trend === val ? 'bg-blue-600 text-white border-blue-600'
                : hasData(val) ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0
        ? <span className="text-xs text-gray-400 italic">No trend data available</span>
        : (
          <ResponsiveContainer width="100%" height={300}>
            <RLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tickFormatter={fmtTick} tick={{ fontSize: 11 }}
                angle={-30} textAnchor="end" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip formatter={(v) => [v.toLocaleString(), 'Calls']}
                labelFormatter={(l) => `${trend.charAt(0).toUpperCase() + trend.slice(1)}: ${l}`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6"
                strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </RLineChart>
          </ResponsiveContainer>
        )}
    </div>
  );
}

function DayOfWeekChart({ data }) {
  if (!Array.isArray(data) || !data.length) return null;
  const maxAvg = Math.max(...data.map(d => d.avg));
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Average daily calls per weekday</p>
      <ResponsiveContainer width="100%" height={240}>
        <RBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="day" tickFormatter={(d) => d.slice(0, 3)} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={36} />
          <Tooltip formatter={(v) => [v, 'Avg Calls']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.avg === maxAvg ? '#2563eb' : '#93c5fd'} />
            ))}
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourBarChart({ data }) {
  if (!Array.isArray(data) || !data.length) return null;
  const maxVal = Math.max(...data.map(d => d.count));
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Number of calls dispatched each hour</p>
      <ResponsiveContainer width="100%" height={240}>
        <RBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10 }} interval={1} />
          <YAxis tick={{ fontSize: 11 }} width={36} />
          <Tooltip formatter={(v) => [v.toLocaleString(), 'Calls']}
            labelFormatter={(h) => `${h}:00 – ${(h + 1) % 24}:00`}
            contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.count === maxVal ? '#4f46e5' : '#a5b4fc'} />
            ))}
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Executive Insights ───────────────────────────────────────────────────────
function generateInsights(metrics) {
  const cv  = metrics.call_volume    || {};
  const rt  = metrics.response_times || {};
  const sum = metrics.upload_summary || {};
  const dq  = metrics.data_quality   || {};
  const insights = [];

  if (cv.busiest_day_of_week) {
    const found = cv.by_day_of_week_avg?.find(d => d.day === cv.busiest_day_of_week);
    const avgStr = found?.avg != null ? ` with an average of ${found.avg} calls` : '';
    insights.push({ text: `${cv.busiest_day_of_week} is the busiest weekday${avgStr}.`, type: 'info' });
  }
  if (cv.busiest_hour != null) {
    insights.push({ text: `Peak call volume occurs around ${cv.busiest_hour}:00.`, type: 'info' });
  }
  if (cv.avg_calls_per_day != null) {
    const weekStr = cv.avg_calls_per_week ? ` (${cv.avg_calls_per_week} per week)` : '';
    insights.push({ text: `Average call volume is ${cv.avg_calls_per_day} calls per day${weekStr}.`, type: 'info' });
  }
  if (rt.p90_minutes != null) {
    const flag = rt.p90_minutes > 15 ? 'warning' : 'success';
    insights.push({ text: `90% of calls are handled within ${fmtMin(rt.p90_minutes)}.`, type: flag });
  }
  if ((sum.duplicate_count || 0) > 0) {
    insights.push({ text: `${fmt(sum.duplicate_count)} duplicate rows were detected and removed during cleaning.`, type: 'warning' });
  }
  if ((dq.columns_unrecognized?.length || 0) > 0) {
    const n = dq.columns_unrecognized.length;
    insights.push({ text: `${n} column${n > 1 ? 's were' : ' was'} not automatically recognized and may need column mapping.`, type: 'warning' });
  }
  return insights.slice(0, 6);
}

function InsightBullet({ text, type }) {
  const cfg = {
    info:    { icon: Lightbulb, cls: 'bg-blue-50 border-blue-100 text-blue-800', icn: 'text-blue-500' },
    success: { icon: CheckCircle, cls: 'bg-green-50 border-green-100 text-green-800', icn: 'text-green-500' },
    warning: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-100 text-amber-800', icn: 'text-amber-500' },
  };
  const { icon: Icon, cls, icn } = cfg[type] || cfg.info;
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm ${cls}`}>
      <Icon size={14} className={`${icn} mt-0.5 flex-shrink-0`} />
      <span>{text}</span>
    </div>
  );
}

// ─── Data Quality Score ───────────────────────────────────────────────────────
function computeDQScore(dq, sum) {
  let score = 100;
  const issues = [];
  const unrecog = dq.columns_unrecognized?.length || 0;
  if (unrecog > 0) {
    const p = Math.min(20, unrecog * 4);
    score -= p;
    issues.push({ label: `${unrecog} unrecognized column${unrecog > 1 ? 's' : ''}`, sev: 'medium' });
  }
  const dups = sum.duplicate_count || 0;
  if (dups > 0) {
    const p = dups > 20 ? 10 : dups > 5 ? 7 : 3;
    score -= p;
    issues.push({ label: `${fmt(dups)} duplicate row${dups > 1 ? 's' : ''}`, sev: dups > 10 ? 'high' : 'medium' });
  }
  const orig = sum.row_count_original || 1;
  const removed = dq.rows_removed || 0;
  if (removed / orig > 0.05) {
    const p = removed / orig > 0.2 ? 15 : 8;
    score -= p;
    issues.push({ label: `${((removed / orig) * 100).toFixed(1)}% of rows removed during cleaning`, sev: 'high' });
  }
  const missing = sum.missing_value_count || 0;
  if (missing > 500) { score -= 5; issues.push({ label: `${fmt(missing)} missing values detected`, sev: 'medium' }); }

  return { score: Math.max(0, score), issues };
}

function QualityScoreBadge({ score }) {
  const color = score >= 90 ? 'bg-green-100 text-green-700' : score >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${color}`}>{score}/100</span>;
}

// ─── Mapping Warning ──────────────────────────────────────────────────────────
function MappingWarning({ reason, onMap }) {
  if (!reason || !reason.includes('set column mapping')) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
      <AlertTriangle size={13} className="flex-shrink-0" />
      <span>{reason}</span>
      {onMap && <button onClick={onMap} className="ml-auto underline font-semibold whitespace-nowrap">Set Analytics Fields</button>}
    </div>
  );
}

// ─── StaticDashboardView ──────────────────────────────────────────────────────
function StaticDashboardView({ metrics, generatedAt, uploadInfo, onMap }) {
  const [cvTab, setCvTab]   = useState('trend');
  const [rtTab, setRtTab]   = useState('overview');
  const [upLimit, setUpLimit] = useState(10);

  const sum = metrics.upload_summary   || {};
  const cv  = metrics.call_volume      || {};
  const rt  = metrics.response_times   || {};
  const up  = metrics.unit_performance || {};
  const dq  = metrics.data_quality     || {};

  const insights = generateInsights(metrics);
  const { score: dqScore, issues: dqIssues } = computeDQScore(dq, sum);

  // Date range from by_day data
  const dateRange = (() => {
    if (Array.isArray(cv.by_day) && cv.by_day.length > 0) {
      return `${cv.by_day[0].date} – ${cv.by_day[cv.by_day.length - 1].date}`;
    }
    return null;
  })();

  const cvTabs = [
    { id: 'trend',   label: 'Trend' },
    { id: 'weekday', label: 'By Weekday' },
    { id: 'hour',    label: 'By Hour' },
    { id: 'type',    label: 'Incident Type' },
    { id: 'muni',    label: 'Municipality' },
  ].filter(t =>
    t.id === 'trend'   ? (Array.isArray(cv.by_day) || Array.isArray(cv.by_week) || Array.isArray(cv.by_month)) :
    t.id === 'weekday' ? Array.isArray(cv.by_day_of_week_avg) :
    t.id === 'hour'    ? Array.isArray(cv.by_hour) :
    t.id === 'type'    ? Array.isArray(cv.by_incident_type) :
    t.id === 'muni'    ? Array.isArray(cv.by_municipality) : false
  );

  const rtTabs = [
    { id: 'overview', label: 'Overview' },
    up.avg_response_time_by_unit?.length > 0 && { id: 'unit', label: 'By Unit' },
  ].filter(Boolean);

  const unitsToShow = up.calls_per_unit?.slice(0, upLimit) || [];
  const rtByUnitToShow = up.avg_response_time_by_unit?.slice(0, upLimit) || [];

  return (
    <div className="space-y-5">

      {/* ── Dataset Context Bar ── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-0.5">Dataset</p>
            <p className="font-semibold text-gray-900 truncate" title={sum.file_name || uploadInfo?.original_filename}>
              {sum.file_name || uploadInfo?.original_filename || 'Uploaded CSV'}
            </p>
          </div>
          {(uploadInfo?.reporting_year || sum.reporting_year) && (
            <div>
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-0.5">Reporting Year</p>
              <p className="font-semibold text-gray-900">{uploadInfo?.reporting_year || sum.reporting_year}</p>
            </div>
          )}
          {dateRange && (
            <div>
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-0.5">Date Range</p>
              <p className="font-semibold text-gray-900 text-xs">{dateRange}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-0.5">Rows Processed</p>
            <p className="font-semibold text-gray-900">{fmt(sum.row_count_cleaned || cv.total_calls)}</p>
          </div>
        </div>
        {generatedAt && (
          <p className="text-[10px] text-blue-400 mt-2">Generated {new Date(generatedAt).toLocaleString()}</p>
        )}
      </div>

      {/* ── Executive Summary KPIs ── */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 px-0.5">Executive Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Phone}     label="Total Calls"      value={fmt(cv.total_calls)}         color="blue" />
          <StatCard icon={TrendingUp} label="Avg Calls / Day" value={cv.avg_calls_per_day}        color="blue" />
          <StatCard icon={TrendingUp} label="Avg Calls / Week" value={cv.avg_calls_per_week}      color="indigo" />
          <StatCard icon={Clock}     label="Median Response"  value={fmtMin(rt.median_minutes)}   color="purple"
            tooltip="The middle response time. Half of calls were faster, half were slower." />
          <StatCard icon={Activity}  label="Avg Response"     value={fmtMin(rt.mean_minutes)}     color="purple" />
          <StatCard icon={Zap}       label="P90 Response"     value={fmtMin(rt.p90_minutes)}      color="orange"
            tooltip="90% of calls were completed at or below this response time." />
        </div>
      </div>

      {/* ── Executive Insights ── */}
      {insights.length > 0 && (
        <Section id="insights" title="Executive Insights" icon={Lightbulb} defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insights.map((ins, i) => <InsightBullet key={i} text={ins.text} type={ins.type} />)}
          </div>
        </Section>
      )}

      {/* ── Call Volume (Tabbed) ── */}
      <Section id="call_volume" title="Call Volume" icon={BarChart2} defaultOpen={true}>
        <MappingWarning reason={cv.by_day?.reason} onMap={onMap} />

        {/* Operational stat mini-cards */}
        {(cv.busiest_day_of_week || cv.busiest_hour != null || cv.avg_calls_per_day != null) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cv.busiest_day_of_week != null && <StatCard label="Busiest Weekday" value={cv.busiest_day_of_week} color="indigo" />}
            {cv.busiest_hour != null && <StatCard label="Peak Hour" value={`${cv.busiest_hour}:00`} color="indigo" />}
            {cv.avg_calls_per_day != null && <StatCard label="Avg / Day" value={cv.avg_calls_per_day} color="blue" />}
            {cv.avg_calls_per_week != null && <StatCard label="Avg / Week" value={cv.avg_calls_per_week} color="blue" />}
          </div>
        )}

        {cvTabs.length > 0 ? (
          <>
            <Tabs tabs={cvTabs} active={cvTab} onChange={setCvTab} />
            <div className="pt-3">
              {cvTab === 'trend' && (
                <>
                  <TrendChart byDay={cv.by_day} byWeek={cv.by_week} byMonth={cv.by_month} />
                  <div className="flex justify-end mt-2">
                    <ExportCSVButton data={cv.by_week || cv.by_day} filename="call_volume_trend.csv" />
                  </div>
                </>
              )}
              {cvTab === 'weekday' && (
                <>
                  <DayOfWeekChart data={cv.by_day_of_week_avg} />
                  <div className="flex justify-end mt-2">
                    <ExportCSVButton data={cv.by_day_of_week_avg} filename="calls_by_weekday.csv" />
                  </div>
                </>
              )}
              {cvTab === 'hour' && (
                <>
                  <HourBarChart data={cv.by_hour} />
                  <div className="flex justify-end mt-2">
                    <ExportCSVButton data={cv.by_hour} filename="calls_by_hour.csv" />
                  </div>
                </>
              )}
              {cvTab === 'type' && (
                <>
                  <MappingWarning reason={cv.by_incident_type?.reason} onMap={onMap} />
                  <HBarChart data={cv.by_incident_type} color="#f59e0b" top={10} />
                  <div className="flex justify-end mt-2">
                    <ExportCSVButton data={cv.by_incident_type} filename="calls_by_type.csv" />
                  </div>
                </>
              )}
              {cvTab === 'muni' && (
                <>
                  <MappingWarning reason={cv.by_municipality?.reason} onMap={onMap} />
                  <HBarChart data={cv.by_municipality} color="#10b981" top={10} />
                  <div className="flex justify-end mt-2">
                    <ExportCSVButton data={cv.by_municipality} filename="calls_by_municipality.csv" />
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400 italic">No call volume chart data available. Consider setting column mappings.</p>
        )}
      </Section>

      {/* ── Response Times ── */}
      <Section id="response_times" title="Response Times" icon={Clock} defaultOpen={true}>
        <MappingWarning reason={rt.available === false ? rt.reason : null} onMap={onMap} />
        {rt.available ? (
          <>
            <Tabs tabs={rtTabs} active={rtTab} onChange={setRtTab} />
            <div className="pt-3">
              {rtTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <StatCard label="Sample Size" value={fmt(rt.sample_size)} color="gray" />
                    <StatCard label="Median"      value={fmtMin(rt.median_minutes)} color="blue"
                      tooltip="The middle response time. Half of calls were faster." />
                    <StatCard label="Average"     value={fmtMin(rt.mean_minutes)}   color="blue" />
                    <StatCard label="P90"         value={fmtMin(rt.p90_minutes)}    color="orange"
                      tooltip="90% of calls completed at or below this time." />
                    <StatCard label="Longest"     value={fmtMin(rt.max_minutes)}    color="red" />
                  </div>
                  {(rt.dispatch_to_enroute_median != null || rt.enroute_to_arrival_median != null || rt.received_to_dispatch_median != null) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Response Time Breakdown</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {rt.received_to_dispatch_median != null && <StatCard label="Received → Dispatch" value={fmtMin(rt.received_to_dispatch_median)} color="indigo" />}
                        {rt.dispatch_to_enroute_median  != null && <StatCard label="Dispatch → Enroute"  value={fmtMin(rt.dispatch_to_enroute_median)}  color="indigo" />}
                        {rt.enroute_to_arrival_median   != null && <StatCard label="Enroute → On Scene"  value={fmtMin(rt.enroute_to_arrival_median)}    color="indigo" />}
                        {rt.dispatch_to_arrival_median  != null && <StatCard label="Dispatch → On Scene" value={fmtMin(rt.dispatch_to_arrival_median)}   color="purple" />}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Metric: {rt.metric?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <strong>P90</strong> is often more useful than average because it shows the slower end of your response performance.
                  </p>
                </div>
              )}
              {rtTab === 'unit' && up.avg_response_time_by_unit?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-3">Average response time per unit (minutes)</p>
                  <HBarChart data={up.avg_response_time_by_unit} labelKey="unit"
                    valueKey="avg_response_time_minutes" color="#f59e0b" top={10} />
                </div>
              )}
            </div>
          </>
        ) : <p className="text-xs text-gray-400 italic">{rt.reason || 'Response time data not available.'}</p>}
      </Section>

      {/* ── Unit Performance ── */}
      <Section id="unit_performance" title="Unit Performance" icon={Users} defaultOpen={true}>
        <MappingWarning reason={up.available === false ? up.reason : null} onMap={onMap} />
        {up.available !== false && up.calls_per_unit?.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{upLimit < (up.calls_per_unit?.length || 0) ? `Top ${upLimit} units by call volume` : 'All units'}</p>
              <div className="flex gap-2">
                {up.calls_per_unit?.length > 10 && (
                  <button onClick={() => setUpLimit(l => l === 10 ? up.calls_per_unit.length : 10)}
                    className="text-xs text-blue-600 hover:underline">
                    {upLimit === 10 ? `Show All ${up.calls_per_unit.length}` : 'Show Top 10'}
                  </button>
                )}
                <ExportCSVButton data={up.calls_per_unit} filename="unit_performance.csv" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Calls per Unit</p>
                <HBarChart data={unitsToShow} labelKey="unit" valueKey="calls" color="#3b82f6" showAll={true} />
              </div>
              {rtByUnitToShow.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Avg Response Time (min)</p>
                  <HBarChart data={rtByUnitToShow} labelKey="unit" valueKey="avg_response_time_minutes"
                    color="#f59e0b" showAll={true} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">{up.reason || 'Unit data not available.'}</p>
        )}
      </Section>

      {/* ── Data Quality ── */}
      <Section id="data_quality" title="Data Quality" icon={Shield}
        badge={<QualityScoreBadge score={dqScore} />} defaultOpen={dqScore < 90}>
        <div className="space-y-4">
          {/* Score bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${dqScore >= 90 ? 'bg-green-500' : dqScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${dqScore}%` }} />
            </div>
            <span className="text-sm font-bold text-gray-700 w-14 text-right">{dqScore} / 100</span>
          </div>

          {dqIssues.length > 0 && (
            <div className="space-y-1.5">
              {dqIssues.map((issue, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                  issue.sev === 'high' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                }`}>
                  <AlertTriangle size={12} className="flex-shrink-0" />
                  {issue.label}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Columns Detected"  value={dq.columns_detected?.length ?? '—'} color="gray" />
            <StatCard label="Unrecognized Cols" value={dq.columns_unrecognized?.length ?? '—'} color={dq.columns_unrecognized?.length > 0 ? 'orange' : 'gray'} />
            <StatCard label="Duplicate Rows"    value={fmt(dq.duplicate_rows ?? sum.duplicate_count)} color={sum.duplicate_count > 0 ? 'orange' : 'gray'} />
            <StatCard label="Rows Removed"      value={fmt(dq.rows_removed)}  color={dq.rows_removed > 0 ? 'red' : 'gray'} />
          </div>

          {dq.missing_values_by_column && Object.keys(dq.missing_values_by_column).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Missing Values by Column</p>
              <div className="max-h-48 overflow-y-auto border rounded-lg text-xs">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 font-semibold">Column</th>
                      <th className="px-3 py-2 text-right text-gray-600 font-semibold">Missing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(dq.missing_values_by_column)
                      .sort(([, a], [, b]) => b - a)
                      .map(([col, cnt]) => (
                        <tr key={col} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-mono text-gray-700">{col}</td>
                          <td className="px-3 py-1.5 text-right text-red-600 font-semibold">{cnt}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dq.columns_unrecognized?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-600">Unrecognized Columns</p>
                {onMap && (
                  <button onClick={onMap}
                    className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                    <Settings size={11} /> Review Column Mapping
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dq.columns_unrecognized.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono text-yellow-800">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Data Processing Summary ── */}
      <Section id="processing" title="Data Processing Summary" icon={FileText} defaultOpen={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Original Rows"  value={fmt(sum.row_count_original)} color="gray" />
          <StatCard label="Cleaned Rows"   value={fmt(sum.row_count_cleaned)}  color="green" />
          <StatCard label="Duplicates"     value={fmt(sum.duplicate_count)}    color={sum.duplicate_count > 0 ? 'orange' : 'gray'} />
          <StatCard label="Missing Values" value={fmt(sum.missing_value_count)} color={sum.missing_value_count > 0 ? 'orange' : 'gray'} />
          <StatCard label="Cols Detected"  value={dq.columns_detected?.length ?? '—'} color="gray" />
          <StatCard label="Rows Removed"   value={fmt(dq.rows_removed)}        color={dq.rows_removed > 0 ? 'red' : 'gray'} />
        </div>
        {sum.upload_date && (
          <p className="text-xs text-gray-400">Uploaded: {new Date(sum.upload_date).toLocaleDateString()}</p>
        )}
      </Section>
    </div>
  );
}

// ─── Filtered Metrics View ────────────────────────────────────────────────────
function FilteredMetricsView({ metrics }) {
  if (!metrics) return null;
  const cv = metrics.call_volume    || {};
  const rt = metrics.response_times || {};

  return (
    <div className="space-y-5">
      {metrics.filters_applied && Object.keys(metrics.filters_applied).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(metrics.filters_applied)
            .filter(([, v]) => v !== null && v !== false && !(Array.isArray(v) && v.length === 0))
            .map(([k, v]) => (
              <span key={k} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                {k.replace(/_/g, ' ')}: {Array.isArray(v) ? v.join(', ') : String(v)}
              </span>
            ))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Phone}    label="Filtered Calls"   value={cv.total_calls ?? cv.total} color="blue" />
        <StatCard icon={Activity} label="IFT Rows"         value={metrics.interfacility_count} color="orange" />
        {rt.available && (
          <>
            <StatCard icon={Clock} label="Median Response"  value={fmtMin(rt.median_minutes)} color="purple" />
            <StatCard icon={Zap}   label="P90 Response"     value={fmtMin(rt.p90_minutes)}    color="orange" />
          </>
        )}
      </div>
      {(Array.isArray(cv.by_day) || Array.isArray(cv.by_week)) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <TrendChart byDay={cv.by_day} byWeek={cv.by_week} byMonth={cv.by_month} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EMSDashboard({ metrics, generatedAt, uploadId, uploadInfo, onRefresh }) {
  const [filteredMetrics, setFilteredMetrics] = useState(null);
  const [filterLoading, setFilterLoading]     = useState(false);
  const [compareOpen, setCompareOpen]         = useState(false);
  const [mappingOpen, setMappingOpen]         = useState(false);
  const hasFilters = uploadId != null;

  const handleFilterApply = useCallback(async (filters) => {
    if (!uploadId) return;
    setFilterLoading(true);
    try {
      const result = await dashboardFilter.filter(uploadId, filters);
      setFilteredMetrics(result);
    } catch (e) {
      console.error('filter error', e);
    } finally {
      setFilterLoading(false);
    }
  }, [uploadId]);

  const handleMappingSaved = useCallback(() => {
    setMappingOpen(false);
    onRefresh?.();
  }, [onRefresh]);

  if (!metrics) return (
    <div className="space-y-3 p-6 text-center">
      <p className="text-sm text-gray-400">No dashboard metrics available.</p>
      {uploadId && (
        <button onClick={() => setMappingOpen(true)}
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Set Analytics Fields
        </button>
      )}
      {mappingOpen && (
        <ColumnMappingModal uploadId={uploadId} onClose={() => setMappingOpen(false)} onSaved={handleMappingSaved} />
      )}
    </div>
  );

  if (compareOpen && uploadId) {
    return (
      <CompareMode uploadId={uploadId} onClose={() => setCompareOpen(false)}
        onOpenMapping={() => { setCompareOpen(false); setMappingOpen(true); }} />
    );
  }

  const showFiltered = filteredMetrics && !filterLoading;

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">EMS Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">
            Operational analytics from uploaded EMSCharts data
            {uploadInfo?.original_filename && ` · ${uploadInfo.original_filename}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploadId && (
            <button onClick={() => setMappingOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
              <Settings size={12} /> Analytics Fields
            </button>
          )}
        </div>
      </div>

      {hasFilters && (
        <DashboardFilterBar uploadId={uploadId} onFilterApply={handleFilterApply}
          onCompareOpen={() => setCompareOpen(true)} />
      )}
      {filterLoading && (
        <div className="text-xs text-blue-500 animate-pulse px-1">Applying filters…</div>
      )}

      {showFiltered
        ? <FilteredMetricsView metrics={filteredMetrics} />
        : <StaticDashboardView metrics={metrics} generatedAt={generatedAt}
            uploadInfo={uploadInfo} onMap={uploadId ? () => setMappingOpen(true) : null} />
      }

      {mappingOpen && (
        <ColumnMappingModal uploadId={uploadId} onClose={() => setMappingOpen(false)} onSaved={handleMappingSaved} />
      )}
    </div>
  );
}
