'use client';

import { useState, useEffect, useMemo } from 'react';
import { applyFilters } from './useFilters';
import { p90 } from '../lib/nfpaStandards';

/**
 * Fetch the compact incident dataset for a single pipeline run.
 *
 * Returns { rows, meta, loading, error }
 *   rows — raw incident array (all incidents, unfiltered)
 *   meta — { unit_type, ts_resolution, total_rows }
 */
export function useIncidents(agencyId, runId) {
  const [rows, setRows]   = useState([]);
  const [meta, setMeta]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agencyId || !runId) return;
    let active = true;

    fetch(
      `/api/proxy/agencies/${agencyId}/pipeline/runs/${runId}/incidents`,
      { credentials: 'include' },
    )
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!active) return;
        setRows(data.rows ?? []);
        setMeta({
          unit_type:     data.unit_type,
          ts_resolution: data.ts_resolution,
          total_rows:    data.total_rows,
        });
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { active = false; };
  }, [agencyId, runId]);

  return { rows, meta, loading, error };
}

/**
 * Given a raw incident array and an active filter state, compute all
 * aggregations the dashboard needs. Returns a stable object reference
 * only when the filtered rows actually change (useMemo).
 */
export function useAggregations(rows, filters) {
  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);

  return useMemo(() => {
    const n = filtered.length;

    const countBy = (key) => {
      const acc = {};
      for (const r of filtered) {
        const v = r[key];
        if (v != null) acc[v] = (acc[v] ?? 0) + 1;
      }
      return acc;
    };

    const countByDate = () => {
      const acc = {};
      for (const r of filtered) {
        if (!r.ts) continue;
        const date = r.ts.slice(0, 10); // YYYY-MM-DD
        acc[date] = (acc[date] ?? 0) + 1;
      }
      return acc;
    };

    const phaseP90 = (field) =>
      p90(filtered.map(r => r[field]).filter(v => v != null));

    return {
      filtered,
      total:   n,
      byUnit:  countBy('unit'),
      byHour:  countBy('hr'),
      byDow:   countBy('dow'),
      byMonth: countBy('mo'),
      byCat:   countBy('cat'),
      byDate:  countByDate(),
      nfpa: {
        cp: phaseP90('cp'),
        to: phaseP90('to'),
        tr: phaseP90('tr'),
        rp: phaseP90('rp'),
        count: filtered.filter(r => r.rp != null).length,
      },
    };
  }, [filtered]);
}
