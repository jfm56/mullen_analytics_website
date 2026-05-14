'use client';

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-blue-600 ml-0.5 leading-none"
        aria-label={`Remove filter ${label}`}
      >×</button>
    </span>
  );
}

function dimLabel(dim, value) {
  if (dim === 'dows')   return DOW_LABELS[value] ?? value;
  if (dim === 'months') return MONTH_LABELS[value - 1] ?? value;
  if (dim === 'hours')  return `${String(value).padStart(2, '0')}:00`;
  return String(value);
}

const DIM_PREFIX = { units: 'Unit', hours: 'Hour', dows: 'Day', months: 'Month', cats: 'Type' };

/**
 * FilterBar — displays active filter chips above the dashboard charts.
 *
 * Props:
 *   filters    — { units, hours, dows, months, cats }
 *   toggle     — (dim, value) => void
 *   reset      — () => void
 *   isActive   — bool
 *   total      — total filtered call count
 *   allTotal   — total unfiltered call count
 */
export default function FilterBar({ filters, toggle, reset, isActive, total, allTotal }) {
  const chips = [];
  for (const [dim, values] of Object.entries(filters)) {
    for (const v of values) {
      chips.push({ dim, value: v, label: `${DIM_PREFIX[dim]}: ${dimLabel(dim, v)}` });
    }
  }

  if (!isActive) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
        <span>Click any bar to filter</span>
        {allTotal != null && (
          <span className="ml-auto font-medium text-gray-700">
            {allTotal.toLocaleString()} calls
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-2 py-1">
      <span className="text-xs text-gray-500 shrink-0">Filters:</span>
      {chips.map(({ dim, value, label }) => (
        <Chip
          key={`${dim}-${value}`}
          label={label}
          onRemove={() => toggle(dim, value)}
        />
      ))}
      <button
        onClick={reset}
        className="text-xs text-gray-400 hover:text-gray-700 underline ml-1"
      >
        Clear all
      </button>
      <span className="ml-auto text-xs font-semibold text-gray-800">
        {total.toLocaleString()}
        {allTotal != null && allTotal !== total && (
          <span className="text-gray-400 font-normal"> / {allTotal.toLocaleString()}</span>
        )}
        {' '}calls
      </span>
    </div>
  );
}
