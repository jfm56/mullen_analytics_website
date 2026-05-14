'use client';
import { useState, useMemo } from 'react';

const ROLE_GROUPS = [
  {
    label: 'Timestamps',
    roles: [
      { value: 'date_dispatched', label: 'Date — Dispatched',       required: true  },
      { value: 'date_enroute',    label: 'Date — En Route',          required: false },
      { value: 'date_arrived',    label: 'Date — Arrived',           required: true  },
      { value: 'date_available',  label: 'Date — Available',         required: false },
      { value: 'date_received',   label: 'Date — Received',          required: false },
      { value: 'date_other',      label: 'Date — Other (unused)',     required: false },
    ],
  },
  {
    label: 'Identifiers & Categories',
    roles: [
      { value: 'unit',         label: 'Unit / Vehicle', required: true  },
      { value: 'incident_id',  label: 'Incident ID',    required: true  },
      { value: 'category',     label: 'Call Category',  required: false },
      { value: 'service_type', label: 'Service Type',   required: false },
    ],
  },
  {
    label: 'Pre-computed (pipeline re-derives these)',
    roles: [
      { value: 'derived_hour',  label: 'Hour of Day'  },
      { value: 'derived_dow',   label: 'Day of Week'  },
      { value: 'derived_month', label: 'Month'        },
    ],
  },
  {
    label: 'Other',
    roles: [
      { value: 'geography',   label: 'Geography'            },
      { value: 'disposition', label: 'Disposition'          },
      { value: 'numeric',     label: 'Numeric'              },
      { value: 'categorical', label: 'Categorical'          },
      { value: 'unknown',     label: 'Unknown'              },
      { value: 'ignore',      label: 'Ignore (do not use)'  },
    ],
  },
];

const ALL_ROLES       = ROLE_GROUPS.flatMap(g => g.roles);
const REQUIRED_ROLES  = ALL_ROLES.filter(r => r.required).map(r => r.value);

const ROLE_TO_MAP_KEY = {
  date_dispatched: 'date_dispatched',
  date_enroute:    'date_enroute',
  date_arrived:    'date_arrived',
  date_available:  'date_available',
  date_received:   'date_received',
  unit:            'unit',
  incident_id:     'incident_id',
  category:        'category',
  service_type:    'service_type',
};

const SCHEMA_LABELS = {
  mullen_analytics_cad: 'Mullen Analytics CAD export detected',
  generic_snake_case:   'Generic CAD export (snake_case schema)',
  unknown:              'Unknown schema — review suggestions carefully',
};

export default function ColumnPicker({ metadata, onSave, onClose }) {
  const [columns, setColumns] = useState(() =>
    metadata.columns.map(c => ({
      ...c,
      selected: c.suggested_selected,
      role:     c.suggested_role,
    }))
  );

  const toggleSelected = (name) =>
    setColumns(cols => cols.map(c =>
      c.name === name ? { ...c, selected: !c.selected } : c
    ));

  const setRole = (name, role) =>
    setColumns(cols => cols.map(c =>
      c.name === name ? { ...c, role } : c
    ));

  const { columnMap, conflicts, missingRequired } = useMemo(() => {
    const map = {};
    const claims = {};
    for (const c of columns) {
      if (!c.selected) continue;
      const key = ROLE_TO_MAP_KEY[c.role];
      if (!key) continue;
      claims[key] = [...(claims[key] || []), c.name];
      map[key] = c.name;
    }
    if (map.date_dispatched) map.date_created = map.date_dispatched;
    const conflicts = Object.entries(claims)
      .filter(([, names]) => names.length > 1)
      .map(([role, names]) => ({ role, names }));
    const missingRequired = REQUIRED_ROLES.filter(r => !map[r]);
    return { columnMap: map, conflicts, missingRequired };
  }, [columns]);

  const canSave        = missingRequired.length === 0 && conflicts.length === 0;
  const selectedCount  = columns.filter(c => c.selected).length;
  const schemaLabel    = SCHEMA_LABELS[metadata.schema_hint] || SCHEMA_LABELS.unknown;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900">{metadata.file}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {metadata.total_columns} columns · {metadata.preview_rows.toLocaleString()} rows previewed
          </p>
          <span className="mt-1.5 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700">
            {schemaLabel}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2">Column</th>
              <th className="px-3 py-2">Sample values</th>
              <th className="px-3 py-2 w-16">Null %</th>
              <th className="px-3 py-2 w-60">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {columns.map(c => (
              <ColumnRow
                key={c.name}
                col={c}
                onToggle={() => toggleSelected(c.name)}
                onRoleChange={role => setRole(c.name, role)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation + footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <ValidationMessages
          missingRequired={missingRequired}
          conflicts={conflicts}
          selectedCount={selectedCount}
          totalCount={columns.length}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            {selectedCount} of {columns.length} columns selected
          </span>
          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => onSave(columnMap)}
              disabled={!canSave}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save column mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnRow({ col, onToggle, onRoleChange }) {
  const nullClass =
    col.null_pct >= 99 ? 'text-red-600 font-semibold' :
    col.null_pct >= 20 ? 'text-amber-600' :
                         'text-gray-500';
  return (
    <tr className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${!col.selected ? 'opacity-50' : ''}`}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={col.selected}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-3 py-2">
        <p className="font-medium text-gray-800 truncate max-w-[180px]">{col.name}</p>
        {col.note && (
          <p className="text-[10px] text-amber-700 mt-0.5 leading-tight">{col.note}</p>
        )}
      </td>
      <td className="px-3 py-2 text-gray-500 max-w-[200px]">
        {col.sample_values.length
          ? <span className="truncate block" title={col.sample_values.join(' | ')}>{col.sample_values.join(', ')}</span>
          : <em className="text-gray-400">— all null —</em>}
      </td>
      <td className={`px-3 py-2 ${nullClass}`}>{col.null_pct}%</td>
      <td className="px-3 py-2">
        <select
          value={col.role}
          onChange={e => onRoleChange(e.target.value)}
          disabled={!col.selected}
          className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-white disabled:opacity-40 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          {ROLE_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </td>
    </tr>
  );
}

function ValidationMessages({ missingRequired, conflicts }) {
  if (!missingRequired.length && !conflicts.length) {
    return (
      <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        ✓ All required columns mapped. Ready to save.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {missingRequired.length > 0 && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-medium">Still needed: </span>
          {missingRequired.map(r => {
            const role = ALL_ROLES.find(x => x.value === r);
            return role?.label || r;
          }).join(', ')}
        </div>
      )}
      {conflicts.map(c => (
        <div key={c.role} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-medium">Conflict — {c.role}:</span> {c.names.join(' and ')} both claim this role.
        </div>
      ))}
    </div>
  );
}
