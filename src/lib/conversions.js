// Client-side conversion + lead events for GA4 and Google Ads.
//
// gtag and Consent Mode v2 are bootstrapped in components/Analytics.jsx (the
// Google Ads tag AW-17747483900 is already configured there). These helpers only
// FIRE events — Consent Mode decides whether ad data is actually stored, so it's
// safe to call them unconditionally on a real conversion action.
//
// Fire these on the SUCCESS of a real action (form submitted, call booked), never
// on a pageview — that's what lets Google Ads optimize for actual conversions.

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-17747483900';

// Google Ads conversion labels (from the Ads account), keyed by GA4 event name.
// Only events listed here also fire a Google Ads conversion; the rest are GA4-only.
const ADS_LABELS = {
  generate_lead: 'PD0_CMe13d4cEPy51I5C', // "Submit lead form" conversion
};

function gtagSafe(...args) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

/**
 * Fire a GA4 event (mark it as a Key Event in GA4) plus, when a label is mapped,
 * the matching Google Ads conversion.
 */
export function trackConversion(eventName, params = {}) {
  gtagSafe('event', eventName, params);
  const label = ADS_LABELS[eventName];
  if (label) {
    gtagSafe('event', 'conversion', {
      send_to: `${ADS_ID}/${label}`,
      value: params.value ?? 1.0,
      currency: params.currency ?? 'USD',
    });
  }
}

// Convenience wrappers for the audit's event taxonomy.
export const trackLead = (params = {}) => trackConversion('generate_lead', params);
export const trackScheduleConsultation = (params = {}) => trackConversion('schedule_consultation', params);
export const trackRequestDemo = (params = {}) => trackConversion('request_demo', params);
export const trackStartTrial = (params = {}) => trackConversion('start_trial', params);
export const trackClickPhone = () => trackConversion('click_phone');
export const trackClickEmail = () => trackConversion('click_email');

// ── Funnel-stage events (GA4-only) so we can see exactly where visitors drop off:
// tool completion → assessment start → assessment submit → schedule click.
export const trackScheduleClick = (params = {}) => trackConversion('schedule_clicked', params);
export const trackRevenueCheckerCompleted = (params = {}) => trackConversion('revenue_checker_completed', params);
export const trackProfitCalculatorCompleted = (params = {}) => trackConversion('profit_calculator_completed', params);
export const trackAssessmentStarted = (params = {}) => trackConversion('assessment_started', params);
export const trackAssessmentSubmitted = (params = {}) => trackConversion('assessment_submitted', params);
