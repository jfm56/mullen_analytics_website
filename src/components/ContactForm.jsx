'use client';

import { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { trackLead } from '../lib/conversions';

export default function ContactForm() {
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const recaptchaRef = useRef(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    setStatus('Sending...');
    
    const sitekey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const recaptchaToken = sitekey ? recaptchaRef.current?.getValue() : 'no-captcha';
    if (sitekey && !recaptchaToken) {
      setStatus('Please verify you are human.');
      return;
    }
    
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    payload.recaptchaToken = recaptchaToken;
    
    setSending(true);
    try {
      const res = await fetch('/api/contact', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not send your message. Please try again.');
      setStatus('Sent! We will be in touch shortly.');
      recaptchaRef.current?.reset();
      trackLead({ focus: payload.projectFocus });
    } catch (error) {
      setStatus(error.message || 'Could not connect. Please email jmullen@mullenanalytics.com.');
    } finally {
      setSending(false);
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 ' +
    'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition';
  const labelClass = 'block text-sm font-semibold text-slate-800 mb-1.5';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="contact-name" className={labelClass}>Name</label>
        <input id="contact-name" name="name" required className={fieldClass} />
      </div>
      <div>
        <label htmlFor="contact-email" className={labelClass}>Email</label>
        <input type="email" id="contact-email" name="email" required className={fieldClass} />
      </div>
      <div>
        <label htmlFor="contact-projectFocus" className={labelClass}>What are you trying to improve?</label>
        <select id="contact-projectFocus" name="projectFocus" className={fieldClass}>
          <option value="Analytics Strategy">Analytics Strategy</option>
          <option value="Data Platform">Data Platform</option>
          <option value="Dashboard Build">Dashboard Build</option>
          <option value="Machine Learning / Automation">Machine Learning / Automation</option>
          <option value="Not sure (need guidance)">Not sure (need guidance)</option>
        </select>
      </div>
      <div>
        <label htmlFor="contact-message" className={labelClass}>Message</label>
        <textarea id="contact-message" name="message" rows="4" required className={fieldClass} />
      </div>
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <div>
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={sending}
        className="w-full sm:w-auto px-8 py-3.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
      >
        {sending ? 'Sending…' : 'Send message'}
      </button>
      {status && <div className="text-sm text-slate-600" aria-live="polite">{status}</div>}
    </form>
  );
}
