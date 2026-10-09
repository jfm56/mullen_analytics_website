'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Analytics from './Analytics';
import VisitorTracker from './VisitorTracker';
import ChatWidget from './ChatWidget';
import CookieConsent from './CookieConsent';
import { isPrivateAppPath } from '@/lib/sitePaths.mjs';

export default function MarketingTools() {
  const pathname = usePathname();
  const privatePage = isPrivateAppPath(pathname);
  useEffect(() => {
    // Also suppress an already-loaded Google tag on a soft navigation from marketing.
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (gaId) window[`ga-disable-${gaId}`] = privatePage;
    if (privatePage && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'denied', ad_user_data: 'denied',
        ad_personalization: 'denied', analytics_storage: 'denied',
      });
    }
  }, [privatePage]);
  if (privatePage) return null;
  return <><Analytics /><VisitorTracker /><ChatWidget /><CookieConsent /><SpeedInsights /></>;
}
