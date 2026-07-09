// Single source of truth for chart colors + styles, so every dashboard chart
// reads consistently. Aligned with the app's Tailwind blue/indigo accent.
//
// Usage:
//   import CHART, { RESPONSE_TARGET_MIN } from '@/lib/chartTheme';
//   <Bar fill={CHART.primary} /> · <Tooltip contentStyle={CHART.tooltip} />
//   {CHART.series[i]} for multi-series / compare colors.

export const CHART = {
  // Named roles
  primary:      '#2563eb', // blue-600
  primaryLight: '#93c5fd', // blue-300
  accent:       '#4f46e5', // indigo-600
  accentLight:  '#a5b4fc', // indigo-300
  good:         '#16a34a', // green-600
  warn:         '#f59e0b', // amber-500
  bad:          '#dc2626', // red-600
  badLight:     '#fca5a5', // red-300
  neutral:      '#94a3b8', // slate-400

  // Categorical series (compare years, multi-series bars/lines, pies)
  series: ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'],

  // ZOLL call-lifecycle segments, in order (sequential, light → teal)
  lifecycle: {
    chute_time:      '#c7d2fe',
    response_time:   '#7c3aed',
    scene_time:      '#2563eb',
    transport_time:  '#0891b2',
    turnaround_time: '#14b8a6',
  },

  // Shared style objects for Recharts primitives
  grid:    '#eef2f7',
  tick:    { fontSize: 11, fill: '#6b7280' },
  tickSm:  { fontSize: 10, fill: '#9ca3af' },
  tooltip: { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },

  // Reference / threshold lines
  reference:    '#ef4444', // target / threshold (red-500)
  referenceAvg: '#64748b', // period-average line (slate-500)
};

// EMS time-to-scene target (dispatch → on-scene), minutes. Common operational
// benchmark; surfaced as a reference line on response-time charts.
export const RESPONSE_TARGET_MIN = 9;

export default CHART;
