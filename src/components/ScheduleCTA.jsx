'use client';

import { trackScheduleConsultation } from '../lib/conversions';

// Anchor to the external booking page that fires the schedule_consultation
// conversion on click. Opens in a new tab, so firing on click is safe (no need
// to delay navigation). Use anywhere a "book a call" link appears.
export default function ScheduleCTA({ href, className, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackScheduleConsultation()}
    >
      {children}
    </a>
  );
}
