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
          <a className={link} href="tel:16092005818" aria-label="Phone">
            609-200-5818
          </a>
          <a className={link} href="https://www.linkedin.com/company/mullen-analytics" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.8v2.1h.05c.53-1 1.84-2.1 3.79-2.1 4.06 0 4.81 2.67 4.81 6.14V24h-4v-6.67c0-1.59-.03-3.64-2.22-3.64-2.22 0-2.56 1.73-2.56 3.52V24h-4V8.5z"/>
            </svg>
          </a>
          <a className={link} href="https://www.facebook.com/profile.php?id=61583215691139" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.79 4.659-4.79 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.765v2.315h3.59l-.467 3.622h-3.123V24h6.125C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z"/>
            </svg>
          </a>
          <a className={link} href="mailto:hello@mullenanalytics.com" aria-label="Email">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 13.065 0 6V4l12 7 12-7v2z"/><path d="M0 6.5 12 13l12-6.5V20a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
