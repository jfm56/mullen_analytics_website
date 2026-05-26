'use client';

/**
 * ColumnManager
 * Per-upload analytics column visibility panel.
 * Supports role tagging (analytics / ignore / sensitive / id / datetime / unit / category).
 * Ignored columns are excluded from chart builder, filter dropdowns, and analytics.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardFilter } from '@/lib/api';

export const COLUMN_ROLES = [
  { value: '',          label: '— Default —',       badge: null },
  { value: 'analytics', label: 'Use for analytics',  badge: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Analytics' } },
  { value: 'ignore',    label: 'Ignore',             badge: { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Ignored'   } },
  { value: 'sensitive', label: 'Sensitive',          badge: { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Sensitive' } },
  { value: 'id',        label: 'ID field',           badge: { bg: 'bg-sky-100',    text: 'text-sky-700',    label: 'ID'        } },
  { value: 'datetime',  label: 'Date / Time field',  badge: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'DateTime'  } },
  { value: 'unit',      label: 'Unit field',         badge: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Unit'      } },
  { value: 'category',  label: 'Category field',     badge: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Category'  } },
];

export function RoleBadge({ role }) {
  const def = COLUMN_ROLES.find(r => r.value === role);
  if (!def?.badge) return null;
  const { bg, text, label } = def.badge;
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
}

const BULK_ACTIONS = [
  { label: 'Ignore selected',  action: 'ignore_selected'  },
  { label: 'Restore selected', action: 'restore_selected' },
  { label: 'Tag as ID',        action: 'tag_id'           },
  { label: 'Tag as DateTime',  action: 'tag_datetime'     },
  { label: 'Tag as Sensitive', action: 'tag_sensitive'    },
  { label: 'Auto-ignore ID cols', action: 'ignore_id_like' },
];

export default function ColumnManager({ uploadId, allColumns = [], onSettingsChange }) {
  const [settings, setSettings] = useState({});
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showIgnored, setShowIgnored] = useState(false);

  const load = useCallback(async () => {
    if (!uploadId) return;
    try {
      const rows = await dashboardFilter.getColumnSettings(uploadId);
      const map = {};
      rows.forEach(r => { map[r.column_name] = r; });
      setSettings(map);
    } catch (e) {
      console.error('column settings error', e);
    }
  }, [uploadId]);

  useEffect(() => { load(); }, [load]);

  const isIgnored = (col) => settings[col]?.is_ignored === true;
  const getRole  = (col) => settings[col]?.role || '';

  const visibleColumns = useMemo(
    () => allColumns
      .filter(c => showIgnored ? isIgnored(c) : !isIgnored(c))
      .filter(c => c.toLowerCase().includes(search.toLowerCase())),
    [allColumns, settings, search, showIgnored],
  );

  const toggleSelect = (col) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(visibleColumns));
  const clearSel  = () => setSelected(new Set());

  const save = async (patches) => {
    setLoading(true); setSaveMsg('');
    try {
      const updated = await dashboardFilter.patchColumnSettings(uploadId, patches);
      const map = {};
      updated.forEach(r => { map[r.column_name] = r; });
      setSettings(map);
      setSaveMsg('Saved');
      setSelected(new Set());
      onSettingsChange?.(map);
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      setSaveMsg('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulk = async (action) => {
    const cols = [...selected];
    if (action === 'ignore_selected') {
      await save(cols.map(c => ({ column_name: c, is_ignored: true,  role: 'ignore',    reason: 'user ignored' })));
    } else if (action === 'restore_selected') {
      await save(cols.map(c => ({ column_name: c, is_ignored: false, role: '',          reason: null })));
    } else if (action === 'tag_id') {
      await save(cols.map(c => ({ column_name: c, is_ignored: false, role: 'id',        reason: null })));
    } else if (action === 'tag_datetime') {
      await save(cols.map(c => ({ column_name: c, is_ignored: false, role: 'datetime',  reason: null })));
    } else if (action === 'tag_sensitive') {
      await save(cols.map(c => ({ column_name: c, is_ignored: false, role: 'sensitive', reason: null })));
    } else if (action === 'ignore_id_like') {
      const idLike = allColumns.filter(c =>
        /^(id|_id|uuid|key|hash|token|internal)$/i.test(c) || c.endsWith('_id') || c.endsWith('_key')
      );
      await save(idLike.map(c => ({ column_name: c, is_ignored: true, role: 'ignore', reason: 'auto: ID-like column' })));
    }
  };

  const toggleOne = async (col) => {
    const nowIgnored = !isIgnored(col);
    await save([{
      column_name: col,
      is_ignored:  nowIgnored,
      role:        nowIgnored ? 'ignore' : '',
      reason:      nowIgnored ? 'user ignored' : null,
    }]);
  };

  const setRole = async (col, role) => {
    await save([{
      column_name: col,
      is_ignored:  role === 'ignore',
      role:        role,
      reason:      role === 'ignore' ? 'user ignored' : null,
    }]);
  };

  const ignoredCount = allColumns.filter(c => isIgnored(c)).length;
  const activeCount  = allColumns.length - ignoredCount;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Column Roles &amp; Visibility</span>
          {saveMsg && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${saveMsg.startsWith('Error') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {saveMsg}
            </span>
          )}
        </div>

        <input
          type="text" placeholder="Search columns…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        />

        <div className="flex gap-1">
          <button onClick={() => setShowIgnored(false)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!showIgnored ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            Active ({activeCount})
          </button>
          <button onClick={() => setShowIgnored(true)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${showIgnored ? 'bg-orange-100 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            Ignored ({ignoredCount})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={selectAll} className="text-[10px] text-blue-600 hover:underline">All</button>
          <button onClick={clearSel}  className="text-[10px] text-gray-400 hover:underline">None</button>
          {selected.size > 0 && <span className="text-[10px] text-gray-500">{selected.size} selected</span>}
        </div>

        {selected.size > 0 && (
          <div className="flex gap-1 flex-wrap">
            {BULK_ACTIONS.map(ba => (
              <button key={ba.action} onClick={() => handleBulk(ba.action)} disabled={loading}
                className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded disabled:opacity-50">
                {ba.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Column list */}
      <div className="flex-1 overflow-y-auto divide-y">
        {visibleColumns.length === 0 ? (
          <p className="px-3 py-6 text-xs text-gray-400 text-center">
            {showIgnored ? 'No ignored columns.' : 'No columns match.'}
          </p>
        ) : visibleColumns.map(col => {
          const ignored = isIgnored(col);
          const role    = getRole(col);
          const sel     = selected.has(col);
          return (
            <div key={col}
              className={`px-3 py-2 hover:bg-gray-50 transition-colors ${sel ? 'bg-blue-50' : ''}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={sel} onChange={() => toggleSelect(col)}
                  className="flex-shrink-0 mt-0.5" />
                <span className={`text-xs flex-1 truncate ${ignored ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {col}
                </span>
                <RoleBadge role={role} />
              </div>
              {/* Role selector */}
              <div className="flex items-center gap-1.5 mt-1.5 ml-5">
                <select
                  value={role}
                  onChange={e => setRole(col, e.target.value)}
                  disabled={loading}
                  className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 flex-1"
                >
                  {COLUMN_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => toggleOne(col)}
                  disabled={loading}
                  title={ignored ? 'Restore column' : 'Ignore column'}
                  className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 disabled:opacity-50 transition-colors
                    ${ignored
                      ? 'border-green-300 text-green-600 hover:bg-green-50'
                      : 'border-orange-200 text-orange-500 hover:bg-orange-50'}`}
                >
                  {ignored ? 'Restore' : 'Ignore'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {ignoredCount > 0 && !showIgnored && (
        <div className="p-2 border-t bg-orange-50 text-[10px] text-orange-600 text-center">
          {ignoredCount} column{ignoredCount > 1 ? 's' : ''} ignored — hidden from analytics
        </div>
      )}
    </div>
  );
}
