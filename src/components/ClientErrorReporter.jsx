'use client';
import { useEffect } from 'react';
import { reportClientError } from '@/lib/api';

/**
 * Captures uncaught browser errors + unhandled promise rejections and reports
 * them to the backend (error_logs, source="client") so an admin can see what
 * users hit. Best-effort: deduped, capped per page load, ignores known noise,
 * and never throws or interrupts the user.
 */
export default function ClientErrorReporter() {
  useEffect(() => {
    const seen = new Set();
    let count = 0;
    const MAX = 20;

    const send = (message, stack, level) => {
      if (!message || count >= MAX) return;
      const key = String(message).slice(0, 200);
      if (seen.has(key)) return;
      seen.add(key);
      count += 1;
      reportClientError({
        message: String(message).slice(0, 2000),
        stack: stack ? String(stack).slice(0, 8000) : null,
        path: typeof window !== 'undefined' ? window.location.pathname : null,
        level: level || 'error',
        error_type: 'ClientError',
      });
    };

    const onError = (event) => {
      const msg = event?.message || event?.error?.message || 'Unknown client error';
      // Ignore benign noise (ResizeObserver loop, cross-origin "Script error.")
      if (/ResizeObserver loop|^Script error\.?$/i.test(msg)) return;
      send(msg, event?.error?.stack, 'error');
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      const msg = (reason && (reason.message || String(reason))) || 'Unhandled promise rejection';
      send(msg, reason?.stack, 'error');
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
