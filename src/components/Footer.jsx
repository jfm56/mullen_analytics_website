 export default function Footer() {
  const link =
    "inline-flex items-center gap-2 text-[var(--color-footer-text)] hover:text-[var(--brand-primary)] transition-colors";
  return (
    <footer className="mt-16 border-t py-10 text-sm bg-[var(--color-footer-bg)]">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-[var(--color-footer-text)]">
        <p>
          &copy; {new Date().getFullYear()} Mullen Analytics & AI Consulting
        </p>
        <div className="flex items-center gap-6">
          <a className={link} href="https://www.linkedin.com/company/mullen-analytics" target="_blank" rel="noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.8v2.1h.05c.53-1 1.84-2.1 3.79-2.1 4.06 0 4.81 2.67 4.81 6.14V24h-4v-6.67c0-1.59-.03-3.64-2.22-3.64-2.22 0-2.56 1.73-2.56 3.52V24h-4V8.5z"/>
            </svg>
            LinkedIn
          </a>
          <a className={link} href="mailto:hello@mullenanalytics.com">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 13.065 0 6V4l12 7 12-7v2z"/><path d="M0 6.5 12 13l12-6.5V20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z"/>
            </svg>
            hello@mullenanalytics.com
          </a>
        </div>
      </div>
    </footer>
  );
}
