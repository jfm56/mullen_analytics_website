'use client';

import { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

export default function ContactForm() {
  const [status, setStatus] = useState('');
  const recaptchaRef = useRef(null);

  async function onSubmit(e) {
    e.preventDefault();
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
    
    const res = await fetch('/api/contact', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    setStatus(data.ok ? 'Sent! We will be in touch shortly.' : 'Error sending message.');
    
    if (data.ok) {
      recaptchaRef.current?.reset();
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 ' +
    'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition';
  const labelClass = 'block text-sm font-semibold text-slate-800 mb-1.5';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Name</label>
        <input name="name" required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" name="email" required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>What are you trying to improve?</label>
        <select name="projectFocus" className={fieldClass}>
          <option value="Analytics Strategy">Analytics Strategy</option>
          <option value="Data Platform">Data Platform</option>
          <option value="Dashboard Build">Dashboard Build</option>
          <option value="Machine Learning / Automation">Machine Learning / Automation</option>
          <option value="Not sure (need guidance)">Not sure (need guidance)</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Message</label>
        <textarea name="message" rows="4" required className={fieldClass} />
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
        className="w-full sm:w-auto px-8 py-3.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
      >
        Send message
      </button>
      {status && <div className="text-sm text-slate-600" aria-live="polite">{status}</div>}
    </form>
  );
}
