// Timestamp formatting for backend values.
//
// The backend stores naive UTC (SQLAlchemy `Column(DateTime, default=datetime.utcnow)`)
// and serializes it WITHOUT a timezone marker — e.g. "2026-07-15T23:28:47".
// `new Date(...)` parses a timezone-less string as LOCAL time, which silently
// shifts every timestamp by the viewer's UTC offset (a UTC reading gets shown
// as if it were already local). These helpers normalize to UTC first, then
// render in the agency's timezone, so times read correctly no matter where the
// viewer is — the calls happened on Eastern time, so that's how we show them.

export const AGENCY_TIME_ZONE = 'America/New_York'; // handles EST/EDT automatically

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a backend timestamp, treating timezone-less date-times as UTC. */
export function parseUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();

  // A bare calendar date ("2026-07-15") has no time or zone — it means that day,
  // everywhere. Anchoring at NOON UTC keeps it on the same calendar day in any
  // timezone; parsing it plainly would land on UTC midnight and render as the
  // PREVIOUS day west of Greenwich (the classic off-by-one).
  if (DATE_ONLY_RE.test(s)) {
    const d = new Date(`${s}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Already carries a zone (trailing Z or ±HH:MM)? Let Date parse it as-is.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const d = new Date(hasZone ? s : `${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date + time in Eastern, e.g. "7/15/2026, 3:28:47 PM EDT". */
export function fmtDateTime(value, { seconds = true, tzLabel = true, fallback = '—' } = {}) {
  const d = parseUtc(value);
  if (!d) return fallback;
  const opts = {
    timeZone: AGENCY_TIME_ZONE,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    ...(tzLabel ? { timeZoneName: 'short' } : {}),
  };
  return d.toLocaleString('en-US', opts);
}

/** Date only in Eastern, e.g. "7/15/2026". */
export function fmtDate(value, { fallback = 'Never' } = {}) {
  const d = parseUtc(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-US', {
    timeZone: AGENCY_TIME_ZONE,
    year: 'numeric', month: 'numeric', day: 'numeric',
  });
}

/** Time only in Eastern, e.g. "3:28 PM". */
export function fmtTimeOnly(value, { fallback = '—' } = {}) {
  const d = parseUtc(value);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-US', {
    timeZone: AGENCY_TIME_ZONE, hour: 'numeric', minute: '2-digit',
  });
}

export default { AGENCY_TIME_ZONE, parseUtc, fmtDateTime, fmtDate, fmtTimeOnly };
