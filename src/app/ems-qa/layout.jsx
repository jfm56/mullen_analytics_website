// Metadata for the EMS QA page. The page itself is a client component (custom
// theme + hover handlers), so its <title>/description live here in the segment
// layout instead.
export const metadata = {
  title: 'EMS QA/QI Software & Automated Chart Review | Mullen Analytics',
  description:
    'On-prem EMS QA/QI software: automated ePCR chart review against your protocols, PHI never leaves your hardware, cited findings, crew coaching, and board-ready reporting.',
};

export default function EmsQaLayout({ children }) {
  return children;
}
