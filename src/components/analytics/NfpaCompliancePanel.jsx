'use client';

import { NFPA_1710, NFPA_1720, getRelevantPhases, evaluatePhase, fmtSecs } from '../../lib/nfpaStandards';

function StatusBadge({ compliant }) {
  if (compliant === null || compliant === undefined) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }
  return compliant ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
      ✓ Compliant
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
      ✗ Non-compliant
    </span>
  );
}

function PhaseRow({ phase, result, showAls }) {
  if (!showAls && (phase.id === 'travel_als' || phase.id === 'total_response_als')) return null;

  const { p90_s, target_s, compliant, pct_within, count, ts_resolution_note } = result;
  const hasData = count > 0;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="py-2.5 pr-4">
        <div className="text-xs font-medium text-gray-800">{phase.label}</div>
        <div className="text-[10px] text-gray-400">{phase.description}</div>
      </td>
      <td className="py-2.5 pr-4 text-xs text-gray-600 whitespace-nowrap">
        ≤ {fmtSecs(target_s)} @ P{phase.percentile}
      </td>
      <td className={`py-2.5 pr-4 text-xs font-semibold whitespace-nowrap ${
        !hasData ? 'text-gray-300'
          : compliant ? 'text-green-700'
          : 'text-red-700'
      }`}>
        {hasData ? fmtSecs(p90_s) : '—'}
      </td>
      <td className="py-2.5 pr-4 text-xs text-gray-500 whitespace-nowrap">
        {hasData && pct_within != null ? `${pct_within.toFixed(1)}%` : '—'}
      </td>
      <td className="py-2.5">
        <StatusBadge compliant={hasData ? compliant : null} />
        {ts_resolution_note && (
          <div className="text-[9px] text-amber-600 mt-0.5 max-w-[140px]" title={ts_resolution_note}>
            ⚠ min-res timestamps
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * NFPA 1710/1720 compliance panel with 4-phase breakdown.
 *
 * Props:
 *   rows          — filtered incident rows from useIncidents
 *   meta          — { unit_type, ts_resolution }
 *   standard      — '1710' | '1720' (default '1710')
 *   onStandardChange — (std) => void
 *   zone          — NFPA 1720 demand zone ('urban'|'suburban'|'rural'|'remote') (for 1720)
 */
export default function NfpaCompliancePanel({
  rows = [],
  meta,
  standard = '1710',
  onStandardChange,
  zone = 'suburban',
}) {
  const unitType     = meta?.unit_type ?? 'BLS';
  const tsResolution = meta?.ts_resolution ?? 'unknown';
  const showAls      = unitType === 'ALS' || unitType === 'mixed';
  const phases       = getRelevantPhases(unitType);

  const results = phases.reduce((acc, phase) => {
    acc[phase.id] = evaluatePhase(rows, phase, tsResolution);
    return acc;
  }, {});

  const overallPhase = phases.find(p => p.id.startsWith('total_response'));
  const overallResult = overallPhase ? results[overallPhase.id] : null;
  const isCompliant = overallResult?.compliant;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">NFPA Response Time Standards</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {unitType === 'BLS' ? 'BLS first-responder benchmarks' : unitType} ·{' '}
            {rows.length.toLocaleString()} incidents
          </p>
        </div>

        {/* Standard picker */}
        <div className="flex gap-1 shrink-0">
          {['1710', '1720'].map(s => (
            <button
              key={s}
              onClick={() => onStandardChange?.(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                standard === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              NFPA {s}
            </button>
          ))}
        </div>
      </div>

      {standard === '1710' && (
        <>
          {/* Overall status banner */}
          {overallResult && (
            <div className={`rounded-lg px-4 py-2.5 mb-4 flex items-center gap-3 ${
              isCompliant === null
                ? 'bg-gray-50 border border-gray-200'
                : isCompliant
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <span className="text-lg">
                {isCompliant === null ? '○' : isCompliant ? '✓' : '✗'}
              </span>
              <div>
                <p className={`text-sm font-semibold ${
                  isCompliant === null ? 'text-gray-600'
                  : isCompliant ? 'text-green-800'
                  : 'text-red-800'
                }`}>
                  {isCompliant === null
                    ? 'Insufficient data for NFPA evaluation'
                    : isCompliant
                    ? `Compliant — Total Response P90 ≤ ${fmtSecs(overallPhase?.target_s)}`
                    : `Non-compliant — Total Response P90 ${fmtSecs(overallResult.p90_s)} (target ≤ ${fmtSecs(overallPhase?.target_s)})`
                  }
                </p>
                <p className="text-[10px] text-gray-500">
                  {overallPhase?.citation} · {unitType} agency · 90th percentile standard
                </p>
              </div>
            </div>
          )}

          {/* Phase table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Phase', 'Target (P90)', 'Your P90', '% within', 'Status'].map(h => (
                    <th key={h} className="pb-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phases.map(phase => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    result={results[phase.id]}
                    showAls={showAls}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Timestamp resolution note */}
          {tsResolution === 'minute' && (
            <p className="text-[10px] text-amber-600 mt-3 border-t border-gray-100 pt-2">
              ⚠ Source timestamps are minute-resolution — sub-minute phases (call processing, turnout)
              cannot be accurately measured. Values appear as clean multiples of 60 s.
            </p>
          )}

          {/* Citation */}
          <p className="text-[10px] text-gray-400 mt-2">
            Source:{' '}
            <a
              href={NFPA_1710.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600"
            >
              NFPA 1710, {NFPA_1710.edition} Edition
            </a>{' '}
            · EMS deployment standards for career fire departments.
          </p>
        </>
      )}

      {standard === '1720' && (
        <div>
          <p className="text-xs text-gray-500 mb-3">{NFPA_1720.note}</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Zone', 'Population Density', 'Min. Personnel', 'Target', 'Percentile'].map(h => (
                    <th key={h} className="pb-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NFPA_1720.zones.map(z => (
                  <tr key={z.id} className={`border-b border-gray-50 ${z.id === zone ? 'bg-blue-50' : ''}`}>
                    <td className="py-2 pr-4 text-xs font-medium text-gray-800">{z.label}</td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{z.description}</td>
                    <td className="py-2 pr-4 text-xs text-gray-700">{z.min_personnel}</td>
                    <td className="py-2 pr-4 text-xs text-gray-700">
                      {z.target_s != null ? fmtSecs(z.target_s) : 'Per travel distance'}
                    </td>
                    <td className="py-2 text-xs text-gray-500">
                      {z.percentile != null ? `${z.percentile}th` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Source:{' '}
            <a href={NFPA_1720.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              NFPA 1720, {NFPA_1720.edition} Edition
            </a>{' '}
            · Standards for volunteer / combination departments.
          </p>
        </div>
      )}
    </div>
  );
}
