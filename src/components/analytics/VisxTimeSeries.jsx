'use client';

import { useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';

const MARGIN = { top: 12, right: 16, bottom: 36, left: 48 };
const TOOLTIP_STYLES = {
  ...defaultStyles,
  background: '#1f2937',
  color: '#f9fafb',
  fontSize: 12,
  borderRadius: 6,
  padding: '6px 10px',
};

/**
 * Daily call-volume time series chart.
 *
 * Props:
 *   byDate         — { "YYYY-MM-DD": count } object
 *   width          — number
 *   height         — number (default 180)
 *   selectedDates  — Set<string> of active date filter values
 *   onToggleDate   — (date: string) => void
 *   color          — line colour (default #3b82f6)
 */
export default function VisxTimeSeries({
  byDate = {},
  width,
  height = 180,
  selectedDates,
  onToggleDate,
  color = '#3b82f6',
}) {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop, tooltipOpen } = useTooltip();

  const points = useMemo(() => {
    return Object.entries(byDate)
      .map(([date, count]) => ({ date: new Date(date + 'T00:00:00'), count, dateStr: date }))
      .sort((a, b) => a.date - b.date);
  }, [byDate]);

  const xMax = width  - MARGIN.left - MARGIN.right;
  const yMax = height - MARGIN.top  - MARGIN.bottom;

  const xScale = useMemo(() => {
    if (points.length === 0) return null;
    return scaleTime({
      domain: [points[0].date, points[points.length - 1].date],
      range:  [0, xMax],
    });
  }, [points, xMax]);

  const yScale = useMemo(() => {
    const maxVal = Math.max(...points.map(p => p.count), 1);
    return scaleLinear({ domain: [0, maxVal], range: [yMax, 0], nice: true });
  }, [points, yMax]);

  const bisectDate = bisector(d => d.date).left;

  const handleMouseMove = useCallback((event) => {
    if (!xScale || !points.length) return;
    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - MARGIN.left);
    const idx = bisectDate(points, x0, 1);
    const d0 = points[idx - 1];
    const d1 = points[idx];
    const d = d1 && x0 - d0?.date > d1?.date - x0 ? d1 : d0;
    if (!d) return;
    showTooltip({
      tooltipData: d,
      tooltipLeft: (xScale(d.date) ?? 0) + MARGIN.left,
      tooltipTop:  (yScale(d.count) ?? 0) + MARGIN.top,
    });
  }, [xScale, yScale, points, bisectDate, showTooltip]);

  if (!width || !xScale || points.length === 0) {
    return <div className="text-xs text-gray-400 py-8 text-center">No data</div>;
  }

  return (
    <div className="relative select-none">
      <svg width={width} height={height} onMouseMove={handleMouseMove} onMouseLeave={hideTooltip}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={xMax} stroke="#e5e7eb" strokeDasharray="3,3" numTicks={4} />

          <AreaClosed
            data={points}
            x={d => xScale(d.date)}
            y={d => yScale(d.count)}
            yScale={yScale}
            fill={color}
            fillOpacity={0.08}
            stroke="none"
          />
          <LinePath
            data={points}
            x={d => xScale(d.date)}
            y={d => yScale(d.count)}
            stroke={color}
            strokeWidth={1.8}
          />

          {/* Selected date markers */}
          {selectedDates && [...selectedDates].map(dateStr => {
            const d = points.find(p => p.dateStr === dateStr);
            if (!d) return null;
            return (
              <circle
                key={dateStr}
                cx={xScale(d.date)}
                cy={yScale(d.count)}
                r={4}
                fill="#1d4ed8"
                stroke="white"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Tooltip crosshair */}
          {tooltipOpen && tooltipData && (
            <g>
              <line
                x1={xScale(tooltipData.date)} x2={xScale(tooltipData.date)}
                y1={0} y2={yMax}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3,2"
              />
              <circle
                cx={xScale(tooltipData.date)}
                cy={yScale(tooltipData.count)}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
                onClick={() => onToggleDate?.(tooltipData.dateStr)}
                style={{ cursor: onToggleDate ? 'pointer' : 'default' }}
              />
            </g>
          )}

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
            numTicks={6}
            tickLabelProps={() => ({ fontSize: 10, fill: '#6b7280', textAnchor: 'middle' })}
            stroke="#e5e7eb"
            tickStroke="#e5e7eb"
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop - 36}
          left={tooltipLeft}
          style={TOOLTIP_STYLES}
        >
          <div>{tooltipData.dateStr}</div>
          <div className="font-semibold">{tooltipData.count} calls</div>
          {onToggleDate && (
            <div className="opacity-60 mt-0.5">Click to filter</div>
          )}
        </TooltipWithBounds>
      )}
    </div>
  );
}
