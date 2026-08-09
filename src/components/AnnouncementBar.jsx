'use client';

import { useState, useEffect } from 'react';
import { trackScheduleConsultation } from '../lib/conversions';

// Slim, dismissible promo bar for the free first-time consultation offer. Renders
// above the Navbar on marketing pages only (see ConditionalNav). Starts hidden and
// reveals after mount so there's no SSR/CSR hydration mismatch; stays dismissed for
// the browser session.
const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';
const DISMISS_KEY = 'ma-announce-dismissed';

export default function AnnouncementBar() {
  // Shown by default (server + initial client render match → no hydration
  // mismatch); hidden after mount only if it was dismissed this session.
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setShow(false);
    } catch { /* ignore */ }
  }, []);

  if (!show) return null;

  return (
    <div className="relative bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-10 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-center text-sm">
        <span>
          New client? Your <strong className="font-semibold">first project consultation is free</strong> — no obligation.
        </span>
        <a
          href={CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackScheduleConsultation()}
          className="font-semibold underline underline-offset-2 decoration-white/50 hover:decoration-white whitespace-nowrap"
        >
          Book yours →
        </a>
      </div>
      <button
        type="button"
        onClick={() => {
          try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
          setShow(false);
        }}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-xl leading-none"
      >
        &times;
      </button>
    </div>
  );
}
