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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input name="name" required className="mt-1 w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input type="email" name="email" required className="mt-1 w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">What are you trying to improve?</label>
        <select name="projectFocus" className="mt-1 w-full border rounded px-3 py-2">
          <option value="Analytics Strategy">Analytics Strategy</option>
          <option value="Data Platform">Data Platform</option>
          <option value="Dashboard Build">Dashboard Build</option>
          <option value="Machine Learning / AI">Machine Learning / AI</option>
          <option value="Not sure (need guidance)">Not sure (need guidance)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Message</label>
        <textarea name="message" rows="4" required className="mt-1 w-full border rounded px-3 py-2" />
      </div>
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <div>
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          />
        </div>
      )}
      <button type="submit" className="px-6 py-3 rounded bg-black text-white">Send</button>
      <div className="text-sm text-gray-600">{status}</div>
    </form>
  );
}
