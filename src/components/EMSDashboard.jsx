'use client';

/**
 * EMSDashboard
 * Renders pre-computed metrics_json from the /dashboard endpoint.
 * Supports filter bar and compare mode when uploadId is provided.
 */

import { useState, useCallback } from 'react';
import {
  BarChart as RBarChart, Bar, LineChart as RLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import DashboardFilterBar from './DashboardFilterBar';
import CompareMode from './CompareMode';
import ColumnMappingModal from './ColumnMappingModal';
import { dashboardFilter } from '@/lib/api';

// ---------------------------------------------------------------------------
// Tiny stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50   border-blue-200   text-blue-800',
    green:  'bg-green-50  border-green-200  text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red:    'bg-red-50    border-red-200    text-red-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    gray:   'bg-gray-50   border-gray-200   text-gray-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
  };
  return (
    <div className={`rounded-xl border px-5 py-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value ?? '—'}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar chart (horizontal)
// ---------------------------------------------------------------------------
function HBarChart({ data, labelKey = 'label', valueKey = 'count', title, color = '#3b82f6', top = 15 }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const sliced = data.slice(0, top);
  const max = Math.max(...sliced.map(d => d[valueKey] || 0), 1);
  const ROW_H = 30, LABEL_W = 180, BAR_W = 280, VALUE_PAD = 55, PAD = 8;
  const svgW = LABEL_W + BAR_W + VALUE_PAD;
  const height = sliced.length * ROW_H + PAD * 2;

  return (
    <div className="chart-wrapper">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>}
      <svg width={svgW} height={height} style={{ minWidth: svgW }}>
        {sliced.map((d, i) => {
          const barW = Math.max(2, (d[valueKey] / max) * BAR_W);
          const y = PAD + i * ROW_H;
          const raw = String(d[labelKey] ?? '');
          const label = raw.length > 26 ? raw.slice(0, 25) + '…' : raw;
          const valStr = typeof d[valueKey] === 'number' && !Number.isInteger(d[valueKey])
            ? d[valueKey].toFixed(1)
            : String(d[valueKey] ?? '');
          return (
            <g key={i}>
              <text x={LABEL_W - 8} y={y + 19} textAnchor="end" fontSize={11} fill="#6b7280">{label}</text>
              <rect x={LABEL_W} y={y + 6} width={barW} height={18} rx={3} fill={color} opacity={0.85} />
              <text x={LABEL_W + barW + 6} y={y + 19} fontSize={11} fill="#374151">{valStr}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line chart (calls by day)
// ---------------------------------------------------------------------------
function LineChart({ data, title }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const W = 560, H = 160, PAD = { top: 10, right: 40, bottom: 40, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = data.map(d => d.count);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);

  const xStep = innerW / Math.max(data.length - 1, 1);
  const yScale = (v) => innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  const points = data.map((d, i) => [PAD.left + i * xStep, PAD.top + yScale(d.count)]);
  const polyline = points.map(p => p.join(',')).join(' ');

  // tick labels — show ~6 dates
  const step = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="chart-wrapper">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>}
      <svg width={W} height={H}>
        {/* y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const yy = PAD.top + t * innerH;
          const val = Math.round(maxV - t * (maxV - minV));
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#e5e7eb" strokeWidth={1} />
              <text x={PAD.left - 4} y={yy + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{val}</text>
            </g>
          );
        })}
        {/* line */}
        <polyline fill="none" stroke="#3b82f6" strokeWidth={2} points={polyline} />
        {/* dots */}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#3b82f6" />
        ))}
        {/* x tick labels */}
        {ticks.map((d) => {
          const idx = data.indexOf(d);
          const x = PAD.left + idx * xStep;
          return (
            <text key={d.date} x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af"
              transform={`rotate(-35,${x},${H - 6})`}>
              {d.date?.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar chart (vertical — for calls by hour)
// ---------------------------------------------------------------------------
function VBarChart({ data, xKey = 'hour', yKey = 'count', title, color = '#6366f1' }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const W = 560, H = 160, PAD = { top: 10, right: 30, bottom: 30, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map(d => d[yKey] || 0), 1);
  const barW = innerW / data.length - 2;

  return (
    <div className="chart-wrapper">
      {title && <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>}
      <svg width={W} height={H}>
        {[0, 0.5, 1].map((t, i) => {
          const yy = PAD.top + t * innerH;
          const val = Math.round(max * (1 - t));
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} stroke="#e5e7eb" />
              <text x={PAD.left - 4} y={yy + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{val}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = (d[yKey] / max) * innerH;
          const x = PAD.left + i * (barW + 2);
          const y = PAD.top + innerH - barH;
          const show = i % Math.max(1, Math.floor(data.length / 12)) === 0;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={2} fill={color} opacity={0.85} />
              {show && (
                <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">
                  {d[xKey]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recharts: Trend chart (Day / Week / Month toggle)
// ---------------------------------------------------------------------------
function TrendChart({ byDay, byWeek, byMonth }) {
  const datasets = { day: byDay, week: byWeek, month: byMonth };
  const xKeys    = { day: 'date', week: 'week', month: 'month' };
  const hasData  = (k) => Array.isArray(datasets[k]) && datasets[k].length > 0;
  const defaultTrend = hasData('week') ? 'week' : hasData('day') ? 'day' : 'month';
  const [trend, setTrend] = useState(defaultTrend);
  const data = hasData(trend) ? datasets[trend] : [];
  const xKey = xKeys[trend];

  const fmtTick = (v) => {
    if (!v) return '';
    if (trend === 'day' || trend === 'week') return String(v).slice(5);  // MM-DD
    return String(v);  // YYYY-MM
  };

  const chartHasData = data.length > 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">Call Volume Trend</h4>
        <div className="flex gap-1">
          {[['day','Day'],['week','Week'],['month','Month']].map(([val, label]) => (
            <button key={val} onClick={() => setTrend(val)}
              disabled={!hasData(val)}
              className={`text-xs px-2.5 py-0.5 rounded border transition-colors ${
                trend === val
                  ? 'bg-blue-600 text-white border-blue-600'
                  : hasData(val)
                    ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {!chartHasData
        ? <span className="text-xs text-gray-400 italic">No data for this period</span>
        : (
          <ResponsiveContainer width="100%" height={280}>
            <RLineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 55 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tickFormatter={fmtTick}
                tick={{ fontSize: 10 }} angle={-30} textAnchor="end"
                interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip formatter={(v) => [v.toLocaleString(), 'Calls']}
                labelFormatter={(l) => `${trend.charAt(0).toUpperCase() + trend.slice(1)}: ${l}`} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6"
                strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </RLineChart>
          </ResponsiveContainer>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recharts: Average calls by day of week
// ---------------------------------------------------------------------------
function DayOfWeekChart({ data }) {
  if (!Array.isArray(data) || !data.length) return null;
  const maxAvg = Math.max(...data.map(d => d.avg));
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Avg Daily Call Volume by Weekday</h4>
      <ResponsiveContainer width="100%" height={220}>
        <RBarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="day" tickFormatter={(d) => d.slice(0, 3)}
            tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip formatter={(v) => [v, 'Avg Calls']} labelFormatter={(d) => d} />
          <Bar dataKey="avg" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.avg === maxAvg ? '#2563eb' : '#93c5fd'} />
            ))}
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recharts: Calls by hour of day
// ---------------------------------------------------------------------------
function HourBarChart({ data }) {
  if (!Array.isArray(data) || !data.length) return null;
  const maxVal = Math.max(...data.map(d => d.count));
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Calls by Hour of Day</h4>
      <ResponsiveContainer width="100%" height={220}>
        <RBarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`}
            tick={{ fontSize: 10 }} interval={1} />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip
            formatter={(v) => [v.toLocaleString(), 'Calls']}
            labelFormatter={(h) => `${h}:00 – ${(h + 1) % 24}:00`} />
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

// ---------------------------------------------------------------------------
// Operational metrics cards row (busiest day, busiest hour, avg/day, avg/week)
// ---------------------------------------------------------------------------
function OperationalCards({ cv }) {
  const items = [
    cv.busiest_day_of_week  != null && { label: 'Busiest Weekday',  value: cv.busiest_day_of_week, color: 'indigo' },
    cv.busiest_hour         != null && { label: 'Busiest Hour',     value: `${cv.busiest_hour}:00`, color: 'indigo' },
    cv.avg_calls_per_day    != null && { label: 'Avg Calls / Day',  value: cv.avg_calls_per_day,   color: 'blue' },
    cv.avg_calls_per_week   != null && { label: 'Avg Calls / Week', value: cv.avg_calls_per_week,  color: 'blue' },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, color }) => (
        <StatCard key={label} label={label} value={value} color={color} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export button
// ---------------------------------------------------------------------------
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
      className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded border border-gray-200">
      ↓ CSV
    </button>
  );
}

// ---------------------------------------------------------------------------
// Unavailable placeholder
// ---------------------------------------------------------------------------
function Unavailable({ reason }) {
  return (
    <span className="text-xs text-gray-400 italic">{reason || 'Not available'}</span>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filtered metrics snapshot renderer (reuses same chart components)
// ---------------------------------------------------------------------------
function FilteredMetricsView({ metrics }) {
  if (!metrics) return null;
  const cv = metrics.call_volume || {};
  const rt = metrics.response_times || {};
  const up = metrics.unit_performance || {};
  const fmt = (n) => n != null ? Number(n).toLocaleString() : '—';
  const fmtMin = (n) => n != null ? `${n} min` : '—';

  return (
    <div className="space-y-4">
      {metrics.filters_applied?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {metrics.filters_applied.map((f, i) => (
            <span key={i} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{f}</span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Dispatched Calls" value={fmt(cv.total)} color="blue"
          sub={cv.method?.replace(/_/g, ' ')} />
        <StatCard label="IFT Rows" value={fmt(metrics.interfacility_count)} color="orange" />
        {rt.available && (
          <>
            <StatCard label="Median Response" value={fmtMin(rt.median_minutes)} color="purple"
              sub={rt.metric?.replace(/_/g, ' ')} />
            <StatCard label="P90 Response" value={fmtMin(rt.p90_minutes)} color="red" />
          </>
        )}
      </div>

      <Section title="Call Volume" defaultOpen={true}>
        <OperationalCards cv={cv} />
        {(Array.isArray(cv.by_day) || Array.isArray(cv.by_week) || Array.isArray(cv.by_month)) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <TrendChart byDay={cv.by_day} byWeek={cv.by_week} byMonth={cv.by_month} />
          </div>
        )}
        {Array.isArray(cv.by_day_of_week_avg) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <DayOfWeekChart data={cv.by_day_of_week_avg} />
          </div>
        )}
        <div className="bg-gray-50 rounded-lg p-4">
          {Array.isArray(cv.by_hour)
            ? <HourBarChart data={cv.by_hour} />
            : <Unavailable reason="No time data" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.isArray(metrics.by_call_type) && (
            <HBarChart data={metrics.by_call_type} title="By Call Type" color="#f59e0b" top={15} />
          )}
          {Array.isArray(metrics.by_municipality) && (
            <HBarChart data={metrics.by_municipality} title="By Municipality" color="#10b981" top={15} />
          )}
        </div>
      </Section>

      {up.available !== false && (
        <Section title="Unit Performance">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.isArray(metrics.by_unit) && (
              <HBarChart data={metrics.by_unit} labelKey="label" valueKey="count" title="Calls per Unit" color="#3b82f6" top={20} />
            )}
            {metrics.avg_response_time_by_unit?.length > 0 && (
              <HBarChart data={metrics.avg_response_time_by_unit} labelKey="unit" valueKey="avg_response_time_minutes"
                title="Avg Response Time by Unit (min)" color="#f59e0b" top={20} />
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mapping warning banner (shown when a section has no column)
// ---------------------------------------------------------------------------
function MappingWarning({ reason, onMap }) {
  if (!reason || !reason.includes('set column mapping')) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-3 py-2">
      <span>⚠ {reason}</span>
      {onMap && (
        <button onClick={onMap} className="ml-auto underline font-medium whitespace-nowrap">Set Analytics Fields</button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static pre-computed dashboard view
// ---------------------------------------------------------------------------
function StaticDashboardView({ metrics, generatedAt, onMap }) {
  const sum = metrics.upload_summary  || {};
  const cv  = metrics.call_volume     || {};
  const rt  = metrics.response_times  || {};
  const up  = metrics.unit_performance || {};
  const dq  = metrics.data_quality    || {};

  const fmt    = (n) => n != null ? Number(n).toLocaleString() : '—';
  const fmtMin = (n) => n != null ? `${n} min` : '—';

  return (
    <div className="space-y-4">
      {generatedAt && (
        <p className="text-xs text-gray-400">
          Generated: {new Date(generatedAt).toLocaleString()}
        </p>
      )}

      {/* ── Upload Summary ── */}
      <Section title="Upload Summary">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Calls"     value={fmt(cv.total_calls)}              color="blue" />
          <StatCard label="Original Rows"   value={fmt(sum.row_count_original)}      color="gray" />
          <StatCard label="Cleaned Rows"    value={fmt(sum.row_count_cleaned)}       color="green" />
          <StatCard label="Duplicates"      value={fmt(sum.duplicate_count)}         color="yellow" />
          <StatCard label="Missing Values"  value={fmt(sum.missing_value_count)}     color="orange" />
          {rt.available && (
            <>
              <StatCard label="Median Response" value={fmtMin(rt.median_minutes)} color="purple"
                sub={rt.metric?.replace(/_/g, ' ')} />
              <StatCard label="Avg Response"    value={fmtMin(rt.mean_minutes)}   color="purple" />
              <StatCard label="P90 Response"    value={fmtMin(rt.p90_minutes)}    color="red" />
            </>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
          {sum.file_name   && <span><b>File:</b> {sum.file_name}</span>}
          {sum.upload_date && <span><b>Uploaded:</b> {new Date(sum.upload_date).toLocaleDateString()}</span>}
        </div>
      </Section>

      {/* ── Call Volume ── */}
      <Section title="Call Volume">
        <MappingWarning reason={cv.by_day?.reason} onMap={onMap} />

        {/* Operational metrics cards */}
        <OperationalCards cv={cv} />

        {/* Trend chart: Day / Week / Month toggle */}
        {(Array.isArray(cv.by_day) || Array.isArray(cv.by_week) || Array.isArray(cv.by_month)) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <TrendChart byDay={cv.by_day} byWeek={cv.by_week} byMonth={cv.by_month} />
            <div className="flex justify-end mt-2">
              <ExportCSVButton data={cv.by_week} filename="calls_by_week.csv" />
            </div>
          </div>
        )}

        {/* Avg calls by day of week */}
        {Array.isArray(cv.by_day_of_week_avg) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <DayOfWeekChart data={cv.by_day_of_week_avg} />
            <div className="flex justify-end mt-2">
              <ExportCSVButton data={cv.by_day_of_week_avg} filename="calls_by_weekday.csv" />
            </div>
          </div>
        )}

        {/* Calls by hour */}
        <div className="bg-gray-50 rounded-lg p-4">
          {Array.isArray(cv.by_hour)
            ? (
              <>
                <HourBarChart data={cv.by_hour} />
                <div className="flex justify-end mt-2">
                  <ExportCSVButton data={cv.by_hour} filename="calls_by_hour.csv" />
                </div>
              </>
            )
            : !cv.by_hour?.reason?.includes('set column mapping') && <Unavailable reason={cv.by_hour?.reason} />}
        </div>

        {/* Incident type + municipality ranked lists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <MappingWarning reason={cv.by_incident_type?.reason} onMap={onMap} />
            {Array.isArray(cv.by_incident_type)
              ? <HBarChart data={cv.by_incident_type} title="Calls by Incident Type" color="#f59e0b" top={15} />
              : !cv.by_incident_type?.reason?.includes('set column mapping') && <Unavailable reason={cv.by_incident_type?.reason} />}
          </div>
          <div>
            <MappingWarning reason={cv.by_municipality?.reason} onMap={onMap} />
            {Array.isArray(cv.by_municipality)
              ? <HBarChart data={cv.by_municipality} title="Calls by Municipality / Zone" color="#10b981" top={15} />
              : !cv.by_municipality?.reason?.includes('set column mapping') && <Unavailable reason={cv.by_municipality?.reason} />}
          </div>
        </div>
      </Section>

      {/* ── Response Times ── */}
      <Section title="Response Times">
        <MappingWarning reason={rt.available === false ? rt.reason : null} onMap={onMap} />
        {rt.available ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatCard label="Sample Size" value={fmt(rt.sample_size)} color="gray" />
              <StatCard label="Median"      value={fmtMin(rt.median_minutes)} color="blue" />
              <StatCard label="Average"     value={fmtMin(rt.mean_minutes)}   color="blue" />
              <StatCard label="P90"         value={fmtMin(rt.p90_minutes)}    color="orange" />
              <StatCard label="Longest"     value={fmtMin(rt.max_minutes)}    color="red" />
            </div>
            <p className="text-xs text-gray-400">
              Metric: {rt.metric?.replace(/_/g, ' ')}
            </p>
          </div>
        ) : (
          <Unavailable reason={rt.reason} />
        )}
      </Section>

      {/* ── Unit Performance ── */}
      <Section title="Unit Performance">
        <MappingWarning reason={up.available === false ? up.reason : null} onMap={onMap} />
        {up.available ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <HBarChart
              data={up.calls_per_unit}
              labelKey="unit" valueKey="calls"
              title="Calls per Unit"
              color="#3b82f6"
              top={20}
            />
            {up.avg_response_time_by_unit?.length > 0 && (
              <HBarChart
                data={up.avg_response_time_by_unit}
                labelKey="unit" valueKey="avg_response_time_minutes"
                title="Avg Response Time by Unit (min)"
                color="#f59e0b"
                top={20}
              />
            )}
          </div>
        ) : (
          <Unavailable reason={up.reason} />
        )}
      </Section>

      {/* ── Data Quality ── */}
      <Section title="Data Quality">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Columns Detected"    value={dq.columns_detected?.length ?? '—'} color="gray" />
          <StatCard label="Unrecognized Cols"   value={dq.columns_unrecognized?.length ?? '—'} color="yellow" />
          <StatCard label="Duplicate Rows"      value={fmt(dq.duplicate_rows)} color="orange" />
          <StatCard label="Rows Removed"        value={fmt(dq.rows_removed)}   color="red" />
        </div>

        {dq.missing_values_by_column && Object.keys(dq.missing_values_by_column).length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Missing Values by Column</h4>
            <div className="max-h-52 overflow-y-auto border rounded text-xs">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-gray-600 font-medium">Column</th>
                    <th className="px-3 py-1.5 text-right text-gray-600 font-medium">Missing</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(dq.missing_values_by_column)
                    .sort(([, a], [, b]) => b - a)
                    .map(([col, cnt]) => (
                      <tr key={col} className="hover:bg-gray-50">
                        <td className="px-3 py-1 font-mono text-gray-700">{col}</td>
                        <td className="px-3 py-1 text-right text-red-600 font-medium">{cnt}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dq.columns_unrecognized?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-1">Unrecognized Columns</h4>
            <div className="flex flex-wrap gap-1">
              {dq.columns_unrecognized.map(c => (
                <span key={c} className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono text-yellow-800">{c}</span>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function EMSDashboard({ metrics, generatedAt, uploadId, filterOpts, onRefresh }) {
  const [filteredMetrics, setFilteredMetrics] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
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
    <div className="space-y-3">
      <div className="text-sm text-gray-400">No metrics available.</div>
      {uploadId && (
        <button
          onClick={() => setMappingOpen(true)}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
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
      <div className="h-full">
        <CompareMode
          uploadId={uploadId}
          onClose={() => setCompareOpen(false)}
          onOpenMapping={() => { setCompareOpen(false); setMappingOpen(true); }}
        />
      </div>
    );
  }

  const showFiltered = filteredMetrics && !filterLoading;

  return (
    <div className="space-y-4">
      {/* Mapping button row */}
      {uploadId && (
        <div className="flex justify-end">
          <button
            onClick={() => setMappingOpen(true)}
            className="text-xs px-3 py-1.5 border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
          >
            ⚙ Set Analytics Fields
          </button>
        </div>
      )}

      {hasFilters && (
        <DashboardFilterBar
          uploadId={uploadId}
          onFilterApply={handleFilterApply}
          onCompareOpen={() => setCompareOpen(true)}
        />
      )}
      {filterLoading && (
        <div className="text-xs text-blue-500 animate-pulse px-1">Applying filters…</div>
      )}
      {showFiltered && <FilteredMetricsView metrics={filteredMetrics} />}
      {!showFiltered && (
        <StaticDashboardView
          metrics={metrics}
          generatedAt={generatedAt}
          onMap={uploadId ? () => setMappingOpen(true) : null}
        />
      )}

      {mappingOpen && (
        <ColumnMappingModal
          uploadId={uploadId}
          onClose={() => setMappingOpen(false)}
          onSaved={handleMappingSaved}
        />
      )}
    </div>
  );
}

