'use client';

import { useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';

const MARGIN = { top: 12, right: 16, bottom: 40, left: 48 };
const TOOLTIP_STYLES = {
  ...defaultStyles,
  background: '#1f2937',
  color: '#f9fafb',
  fontSize: 12,
  borderRadius: 6,
  padding: '6px 10px',
};

/**
 * Reusable horizontal or vertical bar chart with:
 *   - Cross-filter click (toggle selection)
 *   - Dimmed bars when other values are selected
 *   - Optional NFPA reference line (vertical)
 *   - Hover tooltip
 *
 * Props:
 *   data         — { label: string|number, value: number, sub?: string }[]
 *   width        — SVG width (required)
 *   height       — SVG height (default 220)
 *   selectedKeys — Set<string|number> of currently selected labels
 *   onToggle     — (label) => void
 *   refLineValue — number | null — draws a red dashed ref line at this x-value (for RT charts)
 *   refLineLabel — string — label for the ref line
 *   color        — bar fill colour (default #3b82f6)
 *   labelFormat  — (label) => string
 *   valueFormat  — (value) => string (for tooltip)
 *   maxBars      — max items to show (default 20)
 *   horizontal   — if true, render horizontal bars (default false = vertical)
 */
export default function VisxBarChart({
  data = [],
  width,
  height = 220,
  selectedKeys,
  onToggle,
  refLineValue = null,
  refLineLabel = '',
  color = '#3b82f6',
  labelFormat = (l) => String(l),
  valueFormat = (v) => v.toLocaleString(),
  maxBars = 20,
  horizontal = false,
}) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip();

  const items = useMemo(() => data.slice(0, maxBars), [data, maxBars]);

  const xMax = width  - MARGIN.left - MARGIN.right;
  const yMax = height - MARGIN.top  - MARGIN.bottom;

  const hasSelection = selectedKeys && selectedKeys.size > 0;

  const xScale = useMemo(() => scaleBand({
    domain: items.map(d => d.label),
    range:  [0, xMax],
    padding: 0.25,
  }), [items, xMax]);

  const yScale = useMemo(() => scaleLinear({
    domain: [0, Math.max(...items.map(d => d.value), 1)],
    range:  [yMax, 0],
    nice:   true,
  }), [items, yMax]);

  const refLineX = useMemo(() => {
    if (refLineValue == null || horizontal) return null;
    return xScale(refLineValue);
  }, [refLineValue, xScale, horizontal]);

  const handleMouseEnter = useCallback((event, item) => {
    const rect = event.target.getBoundingClientRect();
    showTooltip({
      tooltipData:  item,
      tooltipLeft:  rect.left + rect.width / 2,
      tooltipTop:   rect.top - 8,
    });
  }, [showTooltip]);

  if (!width) return null;

  return (
    <div className="relative select-none">
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows
            scale={yScale}
            width={xMax}
            stroke="#e5e7eb"
            strokeDasharray="3,3"
            numTicks={4}
          />

          {/* NFPA reference line */}
          {refLineX != null && (
            <g>
              <line
                x1={refLineX} x2={refLineX}
                y1={0} y2={yMax}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              <text
                x={refLineX + 3}
                y={8}
                fill="#ef4444"
                fontSize={9}
                fontFamily="system-ui, sans-serif"
              >
                {refLineLabel || `NFPA ${refLineValue}s`}
              </text>
            </g>
          )}

          {items.map(item => {
            const barX = xScale(item.label);
            const barW = xScale.bandwidth();
            const barH = Math.max(0, yMax - yScale(item.value));
            const barY = yMax - barH;

            const isSelected = selectedKeys?.has(item.label);
            const dimmed = hasSelection && !isSelected;
            const fill = dimmed ? '#cbd5e1' : (isSelected ? '#1d4ed8' : color);

            return (
              <Bar
                key={item.label}
                x={barX}
                y={barY}
                width={barW}
                height={barH}
                fill={fill}
                rx={2}
                style={{ cursor: onToggle ? 'pointer' : 'default', transition: 'fill 120ms' }}
                onClick={() => onToggle?.(item.label)}
                onMouseEnter={(e) => handleMouseEnter(e, item)}
                onMouseLeave={hideTooltip}
              />
            );
          })}

          <AxisLeft
            scale={yScale}
            numTicks={4}
            tickLabelProps={() => ({ fontSize: 10, fill: '#6b7280', textAnchor: 'end', dy: '0.33em' })}
            stroke="#e5e7eb"
            tickStroke="#e5e7eb"
          />
          <AxisBottom
            top={yMax}
            scale={xScale}
            tickFormat={l => labelFormat(l)}
            tickLabelProps={() => ({ fontSize: 10, fill: '#6b7280', textAnchor: 'middle' })}
            stroke="#e5e7eb"
            tickStroke="#e5e7eb"
            numTicks={Math.min(items.length, 10)}
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={TOOLTIP_STYLES}
        >
          <div className="font-medium">{labelFormat(tooltipData.label)}</div>
          <div>{valueFormat(tooltipData.value)} calls</div>
          {tooltipData.sub && <div className="opacity-75">{tooltipData.sub}</div>}
        </TooltipWithBounds>
      )}
    </div>
  );
}
