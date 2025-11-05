'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setStatus('Sending...');
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    setStatus(data.ok ? 'Sent! We will be in touch shortly.' : 'Error sending message.');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" id="contact">
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
      <button type="submit" className="px-6 py-3 rounded bg-black text-white">Send</button>
      <div className="text-sm text-gray-600">{status}</div>
    </form>
  );
}
