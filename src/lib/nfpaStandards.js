/**
 * NFPA 1710 and NFPA 1720 response-time standards.
 *
 * Sources:
 *  - NFPA 1710, Standard for the Organization and Deployment of Fire Suppression
 *    Operations, Emergency Medical Operations, and Special Operations to the
 *    Public by Career Fire Departments, 2020 Edition.
 *  - NFPA 1720, Standard for the Organization and Deployment of Fire Suppression
 *    Operations, Emergency Medical Operations, and Special Operations to the
 *    Public by Volunteer Fire Departments, 2020 Edition.
 *  - IAFF NFPA 1710 Standards Summary (2022).
 *  - DC Fire & EMS NFPA 1710 Compliance Report, 2023.
 *
 * NOTE: All response-time targets are at the 90th percentile (P90) unless
 * stated otherwise. "P90" means ≥ 90 % of incidents must fall within the target.
 */

/**
 * NFPA 1710 — Career (paid) fire departments, 2020 edition.
 *
 * Phase definitions and targets for EMS responses:
 *
 *  1. Call Processing  — 911 pickup → dispatch sent          ≤ 64 s  @ P90
 *  2. Turnout (EMS)    — dispatch → wheels rolling           ≤ 60 s  @ P90
 *  3. Travel (BLS)     — wheels rolling → on scene           ≤ 240 s @ P90
 *  4. Travel (ALS)     — wheels rolling → on scene           ≤ 480 s @ P90
 *  5. Total Resp (BLS) — dispatch → on scene (2 + 3)         ≤ 300 s @ P90
 *  6. Total Resp (ALS) — dispatch → on scene (2 + 4)         ≤ 540 s @ P90
 *
 * The incident data payload uses:
 *   cp — call-processing seconds  (§4.1.2.1)
 *   to — turnout seconds           (§4.1.2.2)
 *   tr — travel seconds            (§4.1.2.3)
 *   rp — total response seconds    (§4.1.2.4, dispatch→scene)
 */
export const NFPA_1710 = {
  standard:       'NFPA 1710',
  edition:        '2020',
  applicability:  'Career (paid) fire departments',
  url:            'https://www.nfpa.org/codes-and-standards/1/7/1/0/NFPA-1710',

  phases: [
    {
      id:          'call_processing',
      label:       'Call Processing',
      description: '911 pickup → dispatch sent',
      field:       'cp',
      target_s:    64,
      percentile:  90,
      citation:    'NFPA 1710 §4.1.2.1 (2020 ed.)',
    },
    {
      id:          'turnout_ems',
      label:       'Turnout — EMS',
      description: 'Dispatch → wheels rolling',
      field:       'to',
      target_s:    60,
      percentile:  90,
      citation:    'NFPA 1710 §4.1.2.2(2) (2020 ed.)',
    },
    {
      id:          'travel_bls',
      label:       'Travel — BLS',
      description: 'Wheels rolling → on scene (BLS first responder)',
      field:       'tr',
      target_s:    240,
      percentile:  90,
      citation:    'NFPA 1710 §4.1.2.3 (2020 ed.)',
    },
    {
      id:          'travel_als',
      label:       'Travel — ALS',
      description: 'Wheels rolling → on scene (ALS)',
      field:       'tr',
      target_s:    480,
      percentile:  90,
      citation:    'NFPA 1710 §4.1.2.3 (2020 ed.)',
    },
    {
      id:          'total_response_bls',
      label:       'Total Response — BLS',
      description: 'Dispatch → on scene (BLS)',
      field:       'rp',
      target_s:    300,
      percentile:  90,
      citation:    'NFPA 1710 §4.1.2.4 (2020 ed.)',
    },
    {
      id:          'total_response_als',
      label:       'Total Response — ALS',
      description: 'Dispatch → on scene (ALS)',
      field:       'rp',
      target_s:    540,
      percentile:  90,
      citation:    'NFPA 1710 §4.1.2.4 (2020 ed.)',
    },
  ],
};

/**
 * NFPA 1720 — Volunteer / combination departments, 2020 edition.
 *
 * Response targets are demand-zone-based (staffing + travel combined).
 * NFPA 1720 does not specify separate EMS travel-time benchmarks the way
 * 1710 does; EMS targets are treated flexibly. Many volunteer agencies
 * adopt NFPA 1710's EMS benchmarks as aspirational targets.
 *
 * "Minutes" below are total response (dispatch → on scene).
 */
export const NFPA_1720 = {
  standard:       'NFPA 1720',
  edition:        '2020',
  applicability:  'Volunteer / combination fire departments',
  url:            'https://www.nfpa.org/codes-and-standards/1/7/2/0/NFPA-1720',
  note:           'NFPA 1720 does not define separate EMS travel-time benchmarks. ' +
                  'Targets below are for fire suppression response by demand zone.',

  zones: [
    {
      id:           'urban',
      label:        'Urban',
      description:  'Population density > 1,000/sq mi',
      min_personnel: 15,
      target_s:     540,   // 9 min
      percentile:   90,
      citation:     'NFPA 1720 §4.3.2 (2020 ed.)',
    },
    {
      id:           'suburban',
      label:        'Suburban',
      description:  'Population density 500–1,000/sq mi',
      min_personnel: 10,
      target_s:     600,   // 10 min
      percentile:   80,
      citation:     'NFPA 1720 §4.3.2 (2020 ed.)',
    },
    {
      id:           'rural',
      label:        'Rural',
      description:  'Population density < 500/sq mi',
      min_personnel: 6,
      target_s:     840,   // 14 min
      percentile:   80,
      citation:     'NFPA 1720 §4.3.2 (2020 ed.)',
    },
    {
      id:           'remote',
      label:        'Remote',
      description:  'Low-density / unincorporated areas',
      min_personnel: 4,
      target_s:     null,  // no numeric threshold — "per travel distance"
      percentile:   null,
      citation:     'NFPA 1720 §4.3.2 (2020 ed.)',
    },
  ],
};

/**
 * Which standard and phases are relevant for a given unit type.
 * Returns the phases the dashboard should display for an all-BLS agency.
 */
export function getRelevantPhases(unitType = 'BLS') {
  if (unitType === 'ALS') {
    return NFPA_1710.phases.filter(p =>
      ['call_processing', 'turnout_ems', 'travel_als', 'total_response_als'].includes(p.id)
    );
  }
  if (unitType === 'mixed') {
    return NFPA_1710.phases.filter(p =>
      ['call_processing', 'turnout_ems', 'travel_bls', 'travel_als',
       'total_response_bls', 'total_response_als'].includes(p.id)
    );
  }
  // BLS (default)
  return NFPA_1710.phases.filter(p =>
    ['call_processing', 'turnout_ems', 'travel_bls', 'total_response_bls'].includes(p.id)
  );
}

/**
 * Format seconds as "Xm Ys" for display.
 */
export function fmtSecs(s) {
  if (s == null || isNaN(s)) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0
    ? `${m}m ${String(sec).padStart(2, '0')}s`
    : `${sec}s`;
}

/**
 * Compute the P90 of an array of numbers (ignoring nulls).
 */
export function p90(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const idx = Math.ceil(valid.length * 0.9) - 1;
  return valid[Math.max(0, idx)];
}

/**
 * Evaluate NFPA 1710 compliance for a set of incidents against a specific phase.
 *
 * Returns { p90_s, target_s, compliant, pct_within, count, ts_resolution_note }
 */
export function evaluatePhase(rows, phase, tsResolution = 'second') {
  const values = rows.map(r => r[phase.field]).filter(v => v != null && !isNaN(v));
  if (values.length === 0) {
    return { p90_s: null, target_s: phase.target_s, compliant: null, pct_within: null, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.9) - 1;
  const p90_s = sorted[Math.max(0, idx)];

  const within = values.filter(v => v <= phase.target_s).length;
  const pct_within = (within / values.length) * 100;
  const compliant = p90_s <= phase.target_s;

  const ts_resolution_note =
    tsResolution === 'minute' && phase.target_s < 120
      ? 'Timestamps are minute-resolution; sub-minute compliance cannot be measured.'
      : null;

  return { p90_s, target_s: phase.target_s, compliant, pct_within, count: values.length, ts_resolution_note };
}
