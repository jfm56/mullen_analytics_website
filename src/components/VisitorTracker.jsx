'use client';

// First-party, consent-gated visitor tracking. Sends anonymous beacons to the
// self-hosted ingest (POST /api/analytics/collect via the proxy) ONLY when the
// visitor has accepted cookies (same cookie Analytics.jsx / CookieConsent use).
//
// Captures: pageview (route change), click (elements marked data-track, e.g.
// nav tabs), and dwell/time-on-page (sent on page leave via sendBeacon).
// No personal data: anonymous visitor + session ids only; the real IP is never
// stored (server uses it for rate-limiting only). Consent is re-checked on every
// send, so declining (or never accepting) produces zero events.

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const CONSENT_COOKIE = 'mullen-analytics-cookie-consent';
const VISITOR_COOKIE = 'ma_vid';
const SESSION_KEY = 'ma_sid';
const ENDPOINT = '/api/proxy2/analytics/collect'; // on-prem analytics origin (see proxy2 route)

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(name, value, days) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}
function consentGranted() {
  try { return getCookie(CONSENT_COOKIE) === 'true'; } catch { return false; }
}
function uid() {
  try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch { /* noop */ }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function deviceType() {
  const ua = navigator.userAgent || '';
  const w = window.innerWidth || 1200;
  if (/Mobi|Android|iPhone/i.test(ua) || w < 640) return 'mobile';
  if (/Tablet|iPad/i.test(ua) || w < 1024) return 'tablet';
  return 'desktop';
}
function ensureVisitor() {
  let vid = getCookie(VISITOR_COOKIE);
  let isNew = false;
  if (!vid) { vid = uid(); setCookie(VISITOR_COOKIE, vid, 365); isNew = true; }
  return { vid, isNew };
}
function ensureSession() {
  let sid = null;
  try { sid = sessionStorage.getItem(SESSION_KEY); } catch { /* noop */ }
  if (!sid) { sid = uid(); try { sessionStorage.setItem(SESSION_KEY, sid); } catch { /* noop */ } }
  return sid;
}
function send(payload, useBeacon) {
  try {
    const body = JSON.stringify(payload);
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, {
        method: 'POST', credentials: 'include', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body,
      }).catch(() => {});
    }
  } catch { /* fire-and-forget */ }
}

function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enterRef = useRef(0);
  const lastPathRef = useRef(null);
  const contextSentRef = useRef(false);

  // Send accumulated time-on-page for the page we're leaving, then stop its clock.
  const flushDwell = (useBeacon) => {
    if (!consentGranted()) return;
    const path = lastPathRef.current;
    if (!path || !enterRef.current) return;
    const dwell = Date.now() - enterRef.current;
    enterRef.current = 0;
    if (dwell < 300) return; // ignore instant bounces / prefetch flickers
    const { vid } = ensureVisitor();
    send({ session_id: ensureSession(), visitor_id: vid, type: 'dwell', path, dwell_ms: dwell }, useBeacon);
  };

  // pageview on first load + every client-side route change
  useEffect(() => {
    if (!consentGranted()) return;
    flushDwell(false); // close out the previous page's dwell

    const qs = searchParams?.toString();
    const path = pathname + (qs ? `?${qs}` : '');
    const { vid, isNew } = ensureVisitor();
    const payload = { session_id: ensureSession(), visitor_id: vid, type: 'pageview', path, is_new: isNew };

    if (!contextSentRef.current) {
      const sp = new URLSearchParams(window.location.search);
      payload.referrer = document.referrer || undefined;
      payload.utm_source = sp.get('utm_source') || undefined;
      payload.utm_medium = sp.get('utm_medium') || undefined;
      payload.utm_campaign = sp.get('utm_campaign') || undefined;
      payload.device = deviceType();
      payload.language = navigator.language;
      try { payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* noop */ }
      contextSentRef.current = true;
    }
    send(payload, false);
    enterRef.current = Date.now();
    lastPathRef.current = path;
  }, [pathname, searchParams]);

  // tracked clicks (data-track) + dwell flush on leave/hide
  useEffect(() => {
    const onClick = (e) => {
      if (!consentGranted()) return;
      const el = e.target.closest?.('[data-track]');
      const label = el?.getAttribute('data-track');
      if (!label) return;
      const { vid } = ensureVisitor();
      send({ session_id: ensureSession(), visitor_id: vid, type: 'click', path: lastPathRef.current, label }, false);
    };
    const onHide = () => flushDwell(true);
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide(); };

    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  return null;
}

export default function VisitorTracker() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
