'use client';

import { useState, useCallback, useMemo } from 'react';

const INIT = {
  units:  [],   // unit IDs — empty = no filter
  hours:  [],   // 0-23
  dows:   [],   // 0 (Mon) – 6 (Sun)
  months: [],   // 1-12
  cats:   [],   // incident categories
};

/**
 * Cross-filter state for the interactive EMS dashboard.
 *
 * Usage:
 *   const { filters, toggle, reset, isActive, activeCount } = useFilters();
 *
 * toggle(dim, value) — add or remove a value from the given dimension filter.
 * reset()            — clear all filters.
 * isActive           — true when any filter is set.
 * activeCount        — total number of active filter values.
 * isSelected(dim, v) — true when that value is currently filtered in.
 */
export function useFilters() {
  const [filters, setFilters] = useState(INIT);

  const toggle = useCallback((dim, value) => {
    setFilters(prev => {
      const current = prev[dim] ?? [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [dim]: next };
    });
  }, []);

  const reset = useCallback(() => setFilters(INIT), []);

  const isSelected = useCallback(
    (dim, value) => (filters[dim] ?? []).includes(value),
    [filters],
  );

  const isActive = useMemo(
    () => Object.values(filters).some(arr => arr.length > 0),
    [filters],
  );

  const activeCount = useMemo(
    () => Object.values(filters).reduce((sum, arr) => sum + arr.length, 0),
    [filters],
  );

  return { filters, toggle, reset, isActive, activeCount, isSelected };
}

/**
 * Apply a filter state to an array of incident rows.
 * An incident passes if it satisfies ALL active dimensions.
 */
export function applyFilters(rows, filters) {
  return rows.filter(r => {
    if (filters.units.length  && !filters.units.includes(r.unit))   return false;
    if (filters.hours.length  && !filters.hours.includes(r.hr))     return false;
    if (filters.dows.length   && !filters.dows.includes(r.dow))     return false;
    if (filters.months.length && !filters.months.includes(r.mo))    return false;
    if (filters.cats.length   && !filters.cats.includes(r.cat))     return false;
    return true;
  });
}
