'use client';

import { useEffect, useState } from 'react';
import CookieConsentLib from 'react-cookie-consent';

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <CookieConsentLib
      location="bottom"
      buttonText="Accept"
      declineButtonText="Decline"
      enableDeclineButton
      cookieName="mullen-analytics-cookie-consent"
      style={{
        background: '#0B3C5D',
        padding: '20px',
        alignItems: 'center',
      }}
      buttonStyle={{
        background: '#5FB3A2',
        color: '#0B3C5D',
        fontSize: '14px',
        fontWeight: '600',
        padding: '10px 24px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
      }}
      declineButtonStyle={{
        background: 'transparent',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: '600',
        padding: '10px 24px',
        borderRadius: '6px',
        border: '1px solid #FFFFFF',
        cursor: 'pointer',
      }}
      expires={365}
      onAccept={() => {
        // Enable analytics/tracking here if needed
        console.log('Cookie consent accepted');
      }}
      onDecline={() => {
        // Disable analytics/tracking here
        console.log('Cookie consent declined');
      }}
    >
      <span style={{ fontSize: '14px', color: '#FFFFFF' }}>
        We use cookies to enhance your browsing experience and analyze site traffic. 
        By clicking "Accept", you consent to our use of cookies.{' '}
        <a 
          href="/privacy" 
          style={{ color: '#5FB3A2', textDecoration: 'underline' }}
        >
          Learn more
        </a>
      </span>
    </CookieConsentLib>
  );
}
