'use client';
/**
 * EMS QA client for the in-portal QA screens.
 *
 * Every call goes through the portal's guarded, same-origin proxy:
 *   browser  /api/proxy/qa/<path>   (Next.js route handler, forwards the portal
 *                                     `session` cookie)
 *     -> FastAPI /api/qa/<path>      (routers/qa_proxy.py — allow-lists the QA
 *                                     surface, establishes an EMS QA session
 *                                     SERVER-SIDE via the Ed25519 SSO bridge)
 *     -> EMS QA  /api/<path>         (independently enforces agency membership +
 *                                     role via its own session + Postgres RLS)
 *
 * The browser never holds an EMS QA cookie or any secret. Paths here are the EMS
 * QA backend paths WITHOUT the leading /api (the proxy adds it), e.g.
 *   qaGet(`/agencies/${id}/flags?status=pending`).
 */
import { useEffect, useState } from 'react';

const QA_PREFIX = '/api/proxy/qa';

function toLoginOn401() {
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/portal/login';
  }
}

async function handle(res) {
  if (res.status === 401) {
    toLoginOn401();
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (res.status === 402) {
    throw new Error('This action is unavailable — the agency trial/subscription has lapsed.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = body.detail || body.message || `Request failed (${res.status})`;
    if (detail === 'mfa_enrollment_required') {
      throw new Error('Two-factor authentication is required for EMS QA. Please set it up to continue.');
    }
    if (detail === 'mfa_verification_required') {
      throw new Error('Please verify two-factor authentication to continue.');
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined;
  return res.json();
}

export async function qaGet(path) {
  return handle(await fetch(`${QA_PREFIX}${path}`, { credentials: 'include' }));
}

export async function qaSend(path, { method = 'POST', body } = {}) {
  return handle(
    await fetch(`${QA_PREFIX}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function qaUpload(path, file) {
  const fd = new FormData();
  fd.append('file', file);
  // No Content-Type header: the browser sets the multipart boundary.
  return handle(await fetch(`${QA_PREFIX}${path}`, { method: 'POST', credentials: 'include', body: fd }));
}

/** Stream a file (PDF/CSV) through the proxy and trigger a browser download. */
export async function qaDownload(path, filename) {
  const res = await fetch(`${QA_PREFIX}${path}`, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Resolve the signed-in member's EMS QA agency (UUID + role) once.
 * The portal user is single-agency (provisioned by SSO into ems_agency_slug),
 * so /auth/me/agencies returns exactly one entry. `role` is the authoritative
 * EMS QA role, used to pre-gate write controls (the backend still enforces).
 */
export function useQaAgency() {
  const [agency, setAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    qaGet('/auth/me/agencies')
      .then((list) => {
        if (!alive) return;
        setAgency((Array.isArray(list) && list[0]) || null);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  return { agency, loading, error };
}

/** True when the member may perform the given write (backend still enforces). */
export function canDecide(role) {
  return role === 'admin' || role === 'qa_reviewer';
}
export function canUpload(role) {
  return role === 'admin' || role === 'qa_reviewer';
}
export function canMarkCorrected(role) {
  return role === 'admin' || role === 'field_crew';
}
export function canRotateSftp(role) {
  return role === 'admin';
}

// ---- shared presentational primitives (match EMS QA's Badge/BarRow) ----

export const SEVERITY_TONE = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const STATUS_TONE = {
  pending: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  dismissed: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const IMPORT_TONE = {
  received: 'bg-blue-100 text-blue-700 border-blue-200',
  analyzing: 'bg-blue-100 text-blue-700 border-blue-200',
  proposed: 'bg-amber-100 text-amber-700 border-amber-200',
  mapped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  normalizing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  normalized: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

export function Badge({ tone, children }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        tone || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      {children}
    </span>
  );
}

export function BarRow({ label, value, max, tone = 'bg-blue-500', suffix }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-36 shrink-0 truncate text-gray-600" title={label}>
        {label}
      </div>
      <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
        <div className={`h-full ${tone} rounded`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-14 text-right tabular-nums text-gray-700">
        {value}
        {suffix}
      </div>
    </div>
  );
}

export function QaPageHeader({ title, subtitle, agency, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        {agency && (
          <p className="text-xs text-gray-400 mt-0.5">
            {agency.name} · {agency.role}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Friendly card shown when QA isn't enabled / agency can't be resolved. */
export function QaUnavailable({ error }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-8 text-center max-w-lg mx-auto mt-8">
      <h2 className="text-base font-semibold text-gray-900 mb-1">EMS QA is not available</h2>
      <p className="text-sm text-gray-500">
        {error || 'EMS QA is not enabled for your account. Contact your administrator if you believe this is a mistake.'}
      </p>
    </div>
  );
}
