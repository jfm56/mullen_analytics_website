'use client';

import { useMemo } from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { fmtSecs } from '../../lib/nfpaStandards';

const MARGIN = { top: 24, right: 20, bottom: 56, left: 56 };
const TOOLTIP_STYLES = {
  ...defaultStyles,
  background: '#1f2937',
  color: '#f9fafb',
  fontSize: 12,
  borderRadius: 6,
  padding: '8px 12px',
};

const COLOR_COMPLIANT     = '#22c55e';
const COLOR_NONCOMPLIANT  = '#ef4444';
const COLOR_MARGINAL      = '#f59e0b';
const COLOR_DIMMED        = '#cbd5e1';
const NFPA_LINE_COLOR     = '#ef4444';

function unitColor(p90, target) {
  if (p90 == null) return COLOR_DIMMED;
  if (p90 <= target)             return COLOR_COMPLIANT;
  if (p90 <= target * 1.5)       return COLOR_MARGINAL;
  return COLOR_NONCOMPLIANT;
}

/**
 * Per-unit P90 response-time bar chart with an NFPA reference line.
 *
 * Props:
 *   filtered      — filtered incident rows (from useAggregations)
 *   width         — SVG width
 *   height        — number (default 280)
 *   field         — which RT field to use: 'tr' (travel) | 'rp' (total response)
 *   target_s      — NFPA target in seconds (default 240 for BLS travel)
 *   targetLabel   — string label for the reference line
 *   selectedUnits — Set<string> of currently selected units
 *   onToggleUnit  — (unitId: string) => void
 */
export default function ResponseTimeBarChart({
  filtered = [],
  width,
  height = 280,
  field = 'tr',
  target_s = 240,
  targetLabel = 'NFPA BLS Travel ≤4 min',
  selectedUnits,
  onToggleUnit,
}) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip();

  const unitStats = useMemo(() => {
    const byUnit = {};
    for (const r of filtered) {
      if (!r.unit) continue;
      if (!byUnit[r.unit]) byUnit[r.unit] = [];
      if (r[field] != null) byUnit[r.unit].push(r[field]);
    }
    return Object.entries(byUnit)
      .map(([unit, vals]) => {
        const sorted = [...vals].sort((a, b) => a - b);
        const n = sorted.length;
        const p90_s = n > 0 ? sorted[Math.ceil(n * 0.9) - 1] : null;
        return { unit, n, p90_s };
      })
      .filter(d => d.n > 0)
      .sort((a, b) => (a.p90_s ?? Infinity) - (b.p90_s ?? Infinity));
  }, [filtered, field]);

  const xMax = width  - MARGIN.left - MARGIN.right;
  const yMax = height - MARGIN.top  - MARGIN.bottom;

  const maxP90 = Math.max(...unitStats.map(d => d.p90_s ?? 0), target_s * 1.2, 1);

  const xScale = useMemo(() => scaleBand({
    domain: unitStats.map(d => d.unit),
    range:  [0, xMax],
    padding: 0.3,
  }), [unitStats, xMax]);

  const yScale = useMemo(() => scaleLinear({
    domain: [0, maxP90],
    range:  [yMax, 0],
    nice:   true,
  }), [maxP90, yMax]);

  const refLineY = yScale(target_s);
  const hasSelection = selectedUnits && selectedUnits.size > 0;

  if (!width || unitStats.length === 0) {
    return <div className="text-xs text-gray-400 py-8 text-center">No response-time data</div>;
  }

  return (
    <div className="relative select-none">
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={xMax} stroke="#e5e7eb" strokeDasharray="3,3" numTicks={5} />

          {/* NFPA target reference line */}
          <line
            x1={0} x2={xMax}
            y1={refLineY} y2={refLineY}
            stroke={NFPA_LINE_COLOR}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
          <text
            x={xMax - 2}
            y={refLineY - 5}
            fill={NFPA_LINE_COLOR}
            fontSize={9}
            textAnchor="end"
            fontFamily="system-ui, sans-serif"
          >
            {targetLabel} ({fmtSecs(target_s)})
          </text>

          {unitStats.map(({ unit, n, p90_s }) => {
            const barX = xScale(unit);
            const barW = xScale.bandwidth();
            const barH = Math.max(0, yMax - yScale(p90_s ?? 0));
            const barY = yMax - barH;

            const isSelected = selectedUnits?.has(unit);
            const dimmed     = hasSelection && !isSelected;
            const fill = dimmed ? COLOR_DIMMED : unitColor(p90_s, target_s);

            return (
              <g key={unit}>
                <Bar
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  fill={fill}
                  rx={2}
                  style={{ cursor: onToggleUnit ? 'pointer' : 'default', transition: 'fill 120ms' }}
                  onClick={() => onToggleUnit?.(unit)}
                  onMouseEnter={e => {
                    const rect = e.target.getBoundingClientRect();
                    showTooltip({
                      tooltipData:  { unit, n, p90_s },
                      tooltipLeft:  rect.left + rect.width / 2,
                      tooltipTop:   rect.top - 8,
                    });
                  }}
                  onMouseLeave={hideTooltip}
                />
                {/* P90 value label above bar */}
                {p90_s != null && (
                  <text
                    x={(barX ?? 0) + barW / 2}
                    y={barY - 3}
                    textAnchor="middle"
                    fontSize={9}
                    fill={dimmed ? '#94a3b8' : '#374151'}
                    fontFamily="system-ui, sans-serif"
                  >
                    {fmtSecs(p90_s)}
                  </text>
                )}
              </g>
            );
          })}

          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickFormat={v => fmtSecs(v)}
            tickLabelProps={() => ({ fontSize: 9, fill: '#6b7280', textAnchor: 'end', dy: '0.33em' })}
            stroke="#e5e7eb"
            tickStroke="#e5e7eb"
          />
          <AxisBottom
            top={yMax}
            scale={xScale}
            tickLabelProps={() => ({
              fontSize: 10,
              fill: '#374151',
              textAnchor: 'start',
              transform: 'rotate(30)',
              dx: 4,
            })}
            stroke="#e5e7eb"
            tickStroke="#e5e7eb"
          />
        </Group>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-1 px-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: COLOR_COMPLIANT }} />
          Compliant (P90 ≤ target)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: COLOR_MARGINAL }} />
          Marginal (≤ 1.5× target)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: COLOR_NONCOMPLIANT }} />
          Non-compliant
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={NFPA_LINE_COLOR} strokeWidth="1.5" strokeDasharray="4,3" /></svg>
          NFPA target
        </span>
      </div>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={TOOLTIP_STYLES}>
          <div className="font-semibold mb-1">{tooltipData.unit}</div>
          <div>P90: {fmtSecs(tooltipData.p90_s)}</div>
          <div>Sample: {tooltipData.n.toLocaleString()} calls with RT data</div>
          <div className={`mt-1 font-medium ${
            tooltipData.p90_s <= target_s ? 'text-green-400'
            : tooltipData.p90_s <= target_s * 1.5 ? 'text-amber-400'
            : 'text-red-400'
          }`}>
            {tooltipData.p90_s <= target_s ? '✓ Compliant' : '✗ Non-compliant'}
          </div>
          {onToggleUnit && <div className="opacity-50 mt-1 text-[10px]">Click to filter</div>}
        </TooltipWithBounds>
      )}
    </div>
  );
}
