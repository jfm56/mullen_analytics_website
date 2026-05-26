'use client';

/**
 * DashboardFilterBar
 * Permanent filter bar for the EMS analytics dashboard.
 * Emits a filters object on Apply; supports preset quick-select.
 */

import { useState, useEffect, useCallback } from 'react';
import { dashboardFilter } from '@/lib/api';

const EMPTY_FILTERS = {
  date_range: null,
  units: [],
  municipalities: [],
  call_types: [],
  exclude_interfacility: false,
  emergency_only: false,
};

const PRESETS = [
  { label: 'All Calls', filters: {} },
  { label: '911 / Emergency', filters: { emergency_only: true } },
  { label: 'Excl. IFT', filters: { exclude_interfacility: true } },
  { label: 'IFT Only', filters: { ift_only: true } },
];

function MultiSelect({ label, options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const toggle = (v) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 border rounded px-2.5 py-1.5 text-xs whitespace-nowrap
          ${selected.length ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}
          hover:border-blue-400 focus:outline-none`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-blue-600 text-white text-[10px] rounded-full px-1.5">{selected.length}</span>
        )}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[180px] max-h-52 overflow-y-auto">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder={`Search ${placeholder || label}…`}
              className="w-full text-xs border rounded px-2 py-1 focus:outline-none"
              autoFocus
              onChange={e => {
                const el = e.target.closest('.absolute').querySelector('.opts');
                if (el) el.dataset.filter = e.target.value.toLowerCase();
              }}
            />
          </div>
          <div className="opts p-1">
            {options.length === 0
              ? <p className="text-xs text-gray-400 px-2 py-1">No options</p>
              : options.map(opt => (
                <label key={opt} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer rounded text-xs">
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="flex-shrink-0" />
                  <span className="truncate">{opt}</span>
                </label>
              ))
            }
          </div>
          {selected.length > 0 && (
            <div className="border-t p-2">
              <button onClick={() => { onChange([]); setOpen(false); }} className="text-xs text-red-500 hover:underline w-full text-left">
                Clear {label}
              </button>
            </div>
          )}
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}

export default function DashboardFilterBar({ uploadId, onFilterApply, onCompareOpen, initialFilters = {} }) {
  const [opts, setOpts] = useState(null);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...initialFilters });
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const loadOpts = useCallback(async () => {
    if (!uploadId) return;
    try {
      const r = await dashboardFilter.getFilterOptions(uploadId);
      setOpts(r);
    } catch (e) {
      console.error('filter-options error', e);
    }
  }, [uploadId]);

  useEffect(() => { loadOpts(); }, [loadOpts]);

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const applyPreset = (preset) => {
    const next = { ...EMPTY_FILTERS, ...preset.filters };
    setFilters(next);
    handleApply(next);
  };

  const handleApply = useCallback(async (overrideFilters) => {
    setLoading(true);
    const f = overrideFilters || filters;
    try {
      await onFilterApply(f);
      setApplied(true);
    } finally {
      setLoading(false);
    }
  }, [filters, onFilterApply]);

  const clearAll = () => {
    setFilters({ ...EMPTY_FILTERS });
    onFilterApply({ ...EMPTY_FILTERS });
    setApplied(false);
  };

  const hasFilters = filters.units?.length > 0 || filters.municipalities?.length > 0 ||
    filters.call_types?.length > 0 || filters.exclude_interfacility || filters.emergency_only ||
    filters.date_range;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5">
      {/* Presets */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Preset:</span>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p)}
            className="text-xs px-2.5 py-0.5 rounded-full border border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors">
            {p.label}
          </button>
        ))}
        {opts?.interfacility_count > 0 && (
          <span className="text-[10px] text-orange-500 ml-2">
            {opts.interfacility_count.toLocaleString()} IFT rows detected
          </span>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date range */}
        <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white">
          <span className="text-xs text-gray-400">From</span>
          <input type="date" value={filters.date_range?.[0] || opts?.date_range?.min || ''}
            min={opts?.date_range?.min} max={opts?.date_range?.max}
            onChange={e => setF('date_range', [e.target.value, filters.date_range?.[1] || opts?.date_range?.max || ''])}
            className="text-xs border-none focus:outline-none w-32" />
          <span className="text-xs text-gray-400">–</span>
          <input type="date" value={filters.date_range?.[1] || opts?.date_range?.max || ''}
            min={opts?.date_range?.min} max={opts?.date_range?.max}
            onChange={e => setF('date_range', [filters.date_range?.[0] || opts?.date_range?.min || '', e.target.value])}
            className="text-xs border-none focus:outline-none w-32" />
        </div>

        <MultiSelect label="Units" options={opts?.units || []} selected={filters.units || []} onChange={v => setF('units', v)} />
        <MultiSelect label="Municipalities" options={opts?.municipalities || []} selected={filters.municipalities || []} onChange={v => setF('municipalities', v)} />
        <MultiSelect label="Call Types" options={opts?.call_types || []} selected={filters.call_types || []} onChange={v => setF('call_types', v)} />

        {/* Toggle switches */}
        <label className="flex items-center gap-1.5 cursor-pointer ml-1">
          <input type="checkbox" checked={filters.exclude_interfacility}
            onChange={e => setF('exclude_interfacility', e.target.checked)}
            className="w-3.5 h-3.5 rounded" />
          <span className="text-xs text-gray-600 whitespace-nowrap">Excl. IFT</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filters.emergency_only}
            onChange={e => setF('emergency_only', e.target.checked)}
            className="w-3.5 h-3.5 rounded" />
          <span className="text-xs text-gray-600 whitespace-nowrap">Emergency only</span>
        </label>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-red-500 hover:underline px-2 py-1">
              Clear
            </button>
          )}
          <button
            onClick={() => handleApply()}
            disabled={loading}
            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-medium"
          >
            {loading ? 'Applying…' : applied ? '✓ Applied' : 'Apply Filters'}
          </button>
          {onCompareOpen && (
            <button
              onClick={onCompareOpen}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded font-medium"
            >
              ⇄ Compare
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
