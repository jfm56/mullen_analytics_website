'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFilters } from '../../../../../../hooks/useFilters';
import { useIncidents, useAggregations } from '../../../../../../hooks/useIncidents';
import FilterBar from '../../../../../../components/analytics/FilterBar';
import VisxBarChart from '../../../../../../components/analytics/VisxBarChart';
import VisxTimeSeries from '../../../../../../components/analytics/VisxTimeSeries';
import NfpaCompliancePanel from '../../../../../../components/analytics/NfpaCompliancePanel';
import ResponseTimeBarChart from '../../../../../../components/analytics/ResponseTimeBarChart';
import { fmtSecs, NFPA_1710 } from '../../../../../../lib/nfpaStandards';

const DOW_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HOUR_LABELS = (h) => `${String(h).padStart(2,'0')}:00`;

function SummaryCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, badge }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Lightweight hook to measure container width via ResizeObserver */
function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function sortDesc(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

function toBarData(obj, labelFn = (k) => k) {
  return sortDesc(obj).map(([k, v]) => ({ label: k, value: v, labelDisplay: labelFn(k) }));
}

export default function InteractiveDashboard() {
  const { agencyId, runId } = useParams();
  const [nfpaStandard, setNfpaStandard] = useState('1710');

  const { rows, meta, loading, error } = useIncidents(agencyId, runId);
  const { filters, toggle, reset, isActive, isSelected } = useFilters();
  const agg = useAggregations(rows, filters);

  // Separate refs so each chart measures its own container
  const timeRef  = useRef(null);
  const unitRef  = useRef(null);
  const hourRef  = useRef(null);
  const dowRef   = useRef(null);
  const catRef   = useRef(null);
  const rtRef    = useRef(null);

  const timeW = useWidth(timeRef);
  const unitW = useWidth(unitRef);
  const hourW = useWidth(hourRef);
  const dowW  = useWidth(dowRef);
  const catW  = useWidth(catRef);
  const rtW   = useWidth(rtRef);

  // Summary metrics
  const pctNfpa = useMemo(() => {
    const vals = agg.filtered.map(r => r.rp).filter(v => v != null);
    if (!vals.length) return null;
    const within = vals.filter(v => v <= 300).length;
    return ((within / vals.length) * 100).toFixed(1);
  }, [agg.filtered]);

  const medianTravelMin = useMemo(() => {
    const vals = agg.filtered.map(r => r.tr).filter(v => v != null).sort((a, b) => a - b);
    if (!vals.length) return null;
    const mid = Math.floor(vals.length / 2);
    const med = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
    return fmtSecs(med);
  }, [agg.filtered]);

  // Chart data shapes
  const unitData    = toBarData(agg.byUnit);
  const hourData    = toBarData(agg.byHour,  HOUR_LABELS);
  const dowData     = toBarData(agg.byDow,   d => DOW_LABELS[d] ?? d);
  const catData     = toBarData(agg.byCat);

  const unitSelected  = useMemo(() => new Set(filters.units),            [filters.units]);
  const hourSelected  = useMemo(() => new Set(filters.hours.map(String)), [filters.hours]);
  const dowSelected   = useMemo(() => new Set(filters.dows.map(String)),  [filters.dows]);
  const catSelected   = useMemo(() => new Set(filters.cats),             [filters.cats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading incidents…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white border border-red-200 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-600 font-medium mb-2">Could not load incident data</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <p className="text-xs text-gray-400">
            Re-run the pipeline to generate the incidents dataset, then return to this page.
          </p>
          <Link
            href={`/platform/${agencyId}/analytics/${runId}`}
            className="mt-4 inline-block text-sm text-blue-600 underline"
          >
            ← Back to report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <Link
          href={`/platform/${agencyId}/analytics/${runId}`}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Report
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-sm font-semibold text-gray-900">Interactive EMS Dashboard</h1>
        <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium ml-1">
          Cross-filter
        </span>
        {meta && (
          <span className="ml-auto text-xs text-gray-400">
            {meta.unit_type} · {meta.total_rows?.toLocaleString()} incidents
          </span>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <FilterBar
            filters={filters}
            toggle={(dim, val) => {
              const numDims = ['hours', 'dows', 'months'];
              toggle(dim, numDims.includes(dim) ? Number(val) : val);
            }}
            reset={reset}
            isActive={isActive}
            total={agg.total}
            allTotal={rows.length}
          />
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Calls (filtered)"
            value={agg.total.toLocaleString()}
            sub={isActive ? `of ${rows.length.toLocaleString()} total` : undefined}
          />
          <SummaryCard
            label="Median Travel"
            value={medianTravelMin}
            sub="enroute → on scene"
          />
          <SummaryCard
            label="NFPA ≤5 min"
            value={pctNfpa != null ? `${pctNfpa}%` : '—'}
            sub="dispatch → scene · BLS target ≥90%"
            color={
              pctNfpa == null ? 'text-gray-400'
              : parseFloat(pctNfpa) >= 90 ? 'text-green-700'
              : parseFloat(pctNfpa) >= 60 ? 'text-amber-600'
              : 'text-red-700'
            }
          />
          <SummaryCard
            label="Units Active"
            value={Object.keys(agg.byUnit).length}
            sub={meta?.unit_type ?? ''}
          />
        </div>

        {/* Time series — full width */}
        <ChartCard title="Daily Call Volume" badge="click date to filter">
          <div ref={timeRef}>
            <VisxTimeSeries
              byDate={agg.byDate}
              width={timeW}
              height={180}
              color="#3b82f6"
            />
          </div>
        </ChartCard>

        {/* Unit + Hour side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Calls by Unit" badge="click to filter">
            <div ref={unitRef}>
              <VisxBarChart
                data={unitData}
                width={unitW}
                height={220}
                selectedKeys={unitSelected}
                onToggle={v => toggle('units', v)}
                maxBars={10}
                color="#3b82f6"
                valueFormat={v => v.toLocaleString()}
              />
            </div>
          </ChartCard>

          <ChartCard title="Calls by Hour of Day" badge="click to filter">
            <div ref={hourRef}>
              <VisxBarChart
                data={hourData.sort((a, b) => Number(a.label) - Number(b.label))}
                width={hourW}
                height={220}
                selectedKeys={hourSelected}
                onToggle={v => toggle('hours', Number(v))}
                maxBars={24}
                color="#8b5cf6"
                labelFormat={h => HOUR_LABELS(h)}
                valueFormat={v => v.toLocaleString()}
              />
            </div>
          </ChartCard>
        </div>

        {/* DOW + Category side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Calls by Day of Week" badge="click to filter">
            <div ref={dowRef}>
              <VisxBarChart
                data={dowData.sort((a, b) => Number(a.label) - Number(b.label))}
                width={dowW}
                height={180}
                selectedKeys={dowSelected}
                onToggle={v => toggle('dows', Number(v))}
                maxBars={7}
                color="#10b981"
                labelFormat={d => DOW_LABELS[d] ?? d}
                valueFormat={v => v.toLocaleString()}
              />
            </div>
          </ChartCard>

          <ChartCard title="Calls by Incident Type" badge="click to filter">
            <div ref={catRef}>
              <VisxBarChart
                data={catData}
                width={catW}
                height={180}
                selectedKeys={catSelected}
                onToggle={v => toggle('cats', v)}
                maxBars={10}
                color="#f59e0b"
                valueFormat={v => v.toLocaleString()}
              />
            </div>
          </ChartCard>
        </div>

        {/* NFPA Compliance Panel */}
        <NfpaCompliancePanel
          rows={agg.filtered}
          meta={meta}
          standard={nfpaStandard}
          onStandardChange={setNfpaStandard}
        />

        {/* Per-unit RT chart + table */}
        {Object.keys(agg.byUnit).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-gray-800">
                Unit P90 Travel Time vs. NFPA 1710 Target
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full">4 min BLS target</span>
            </div>
            <div ref={rtRef} className="mb-6">
              <ResponseTimeBarChart
                filtered={agg.filtered}
                width={rtW}
                height={260}
                field="tr"
                target_s={240}
                targetLabel="NFPA 1710 BLS Travel"
                selectedUnits={unitSelected}
                onToggleUnit={v => toggle('units', v)}
              />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Unit Detail Table
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Unit','Calls','Median Travel','P90 Travel','NFPA ≤4 min','Util. hrs'].map(h => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-500 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {unitData.map(({ label: unit }) => {
                    const unitRows = agg.filtered.filter(r => r.unit === unit);
                    const trs = unitRows.map(r => r.tr).filter(v => v != null).sort((a, b) => a - b);
                    const mid = Math.floor(trs.length / 2);
                    const medTr = trs.length ? (trs.length % 2 ? trs[mid] : (trs[mid-1]+trs[mid])/2) : null;
                    const p90Tr = trs.length ? trs[Math.ceil(trs.length * 0.9) - 1] : null;
                    const nfpaPct = trs.length
                      ? ((trs.filter(v => v <= 240).length / trs.length) * 100).toFixed(1)
                      : null;
                    const utilMins = unitRows.reduce((s, r) => s + (r.to ?? 0) + (r.tr ?? 0), 0);
                    const flagged = nfpaPct != null && parseFloat(nfpaPct) < 90;

                    return (
                      <tr
                        key={unit}
                        className={`${flagged ? 'bg-red-50' : ''} cursor-pointer hover:bg-gray-50`}
                        onClick={() => toggle('units', unit)}
                      >
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {unit}
                          {flagged && <span className="ml-1 text-[10px] text-red-600">⚠</span>}
                          {isSelected('units', unit) && <span className="ml-1 text-[10px] text-blue-600">●</span>}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{unitRows.length}</td>
                        <td className="py-2 pr-4 text-gray-600 text-xs">{medTr != null ? fmtSecs(medTr) : '—'}</td>
                        <td className={`py-2 pr-4 text-xs font-medium ${p90Tr != null && p90Tr > 240 ? 'text-red-600' : 'text-gray-700'}`}>
                          {p90Tr != null ? fmtSecs(p90Tr) : '—'}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs font-medium ${
                            nfpaPct == null ? 'text-gray-300'
                            : parseFloat(nfpaPct) >= 90 ? 'text-green-700'
                            : parseFloat(nfpaPct) >= 75 ? 'text-amber-600'
                            : 'text-red-700'
                          }`}>
                            {nfpaPct != null ? `${nfpaPct}%` : '—'}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500 text-xs">
                          {utilMins ? `${(utilMins / 60).toFixed(1)}h` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Standards reference */}
        <details className="bg-white border border-gray-200 rounded-xl">
          <summary className="px-5 py-3 text-sm font-medium text-gray-700 cursor-pointer select-none">
            NFPA 1710 Standards Reference
          </summary>
          <div className="px-5 pb-5 pt-2">
            <p className="text-xs text-gray-500 mb-3">
              NFPA 1710 (2020 ed.) sets minimum response-time benchmarks for career fire departments at the 90th percentile.
              All targets below apply to EMS incidents.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-1.5 text-left text-gray-500 pr-4">Phase</th>
                  <th className="pb-1.5 text-left text-gray-500 pr-4">Definition</th>
                  <th className="pb-1.5 text-left text-gray-500 pr-4">Target</th>
                  <th className="pb-1.5 text-left text-gray-500">Citation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {NFPA_1710.phases.map(phase => (
                  <tr key={phase.id}>
                    <td className="py-2 pr-4 font-medium text-gray-800">{phase.label}</td>
                    <td className="py-2 pr-4 text-gray-500">{phase.description}</td>
                    <td className="py-2 pr-4 text-gray-700">
                      ≤ {fmtSecs(phase.target_s)} @ P{phase.percentile}
                    </td>
                    <td className="py-2 text-gray-400">{phase.citation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

      </div>
    </div>
  );
}
