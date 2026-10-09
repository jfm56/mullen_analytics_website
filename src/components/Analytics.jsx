'use client';

import Script from 'next/script';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { isPrivateAppPath } from '@/lib/sitePaths.mjs';

// Read from env so IDs aren't hardcoded. GA4 is optional (blank = disabled);
// the Google Ads ID defaults to the existing live value so ad tracking is preserved.
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-17747483900';

/**
 * Sends a GA4 page_view on every client-side route change. The Next.js App
 * Router does NOT emit page_view on soft navigations, so without this you'd
 * only ever see the first/landing page. The initial page_view is sent here too
 * (config uses send_page_view:false to avoid double-counting).
 */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef(null);

  useEffect(() => {
    if (!GA_ID || isPrivateAppPath(pathname)) return;
    // Query strings can contain reset tokens or user-supplied identifiers.
    const page_path = pathname;
    if (lastPath.current === page_path) return; // guard against duplicate fires
    lastPath.current = page_path;

    // gtag may not be defined yet if this runs before the bootstrap script;
    // fall back to the dataLayer queue so the event is processed once gtag loads.
    if (typeof window.gtag !== 'function') {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() { window.dataLayer.push(arguments); };
    }
    window.gtag('event', 'page_view', {
      page_path,
      page_location: `${window.location.origin}${pathname}`,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  // The gtag.js library only needs to be loaded once with any valid ID.
  const libId = GA_ID || ADS_ID;
  if (!libId) return null;

  return (
    <>
      {/*
        Bootstrap runs first: defines gtag, sets Consent Mode v2 defaults to
        DENIED (so nothing tracks before the visitor accepts), restores a prior
        choice for returning visitors, then configures the tags.
      */}
      <Script id="gtag-bootstrap" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;

          var granted = false;
          try {
            var m = document.cookie.match(/(?:^|;\\s*)mullen-analytics-cookie-consent=([^;]+)/);
            granted = m && decodeURIComponent(m[1]) === 'true';
          } catch (e) {}

          gtag('consent', 'default', {
            ad_storage:            granted ? 'granted' : 'denied',
            ad_user_data:          granted ? 'granted' : 'denied',
            ad_personalization:    granted ? 'granted' : 'denied',
            analytics_storage:     granted ? 'granted' : 'denied',
            functionality_storage: 'granted',
            security_storage:      'granted',
            wait_for_update: 500
          });
          gtag('set', 'ads_data_redaction', !granted);
          gtag('set', 'url_passthrough', true);

          gtag('js', new Date());
          ${GA_ID ? `gtag('config', '${GA_ID}', { send_page_view: false });` : ''}
          ${ADS_ID ? `gtag('config', '${ADS_ID}', { send_page_view: false });` : ''}
        `}
      </Script>

      <Script
        id="gtag-lib"
        src={`https://www.googletagmanager.com/gtag/js?id=${libId}`}
        strategy="afterInteractive"
      />

      {GA_ID && (
        <Suspense fallback={null}>
          <PageviewTracker />
        </Suspense>
      )}
    </>
  );
}

/**
 * Called by the cookie banner. Updates Consent Mode when the visitor makes a
 * choice. Exported so CookieConsent.jsx can grant/deny without duplicating the
 * consent-key list.
 */
export function updateConsent(granted) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const v = granted ? 'granted' : 'denied';
  window.gtag('consent', 'update', {
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
    analytics_storage: v,
  });
  window.gtag('set', 'ads_data_redaction', !granted);
}
