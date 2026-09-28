'use client';
import { useState, useRef } from 'react';
import { Send, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { trackLead, trackAssessmentStarted, trackAssessmentSubmitted } from '@/lib/conversions';

// Reliable inline lead capture for the free-assessment landing pages. Posts to the
// public lead endpoint, which STORES the lead first (so it's captured in the admin
// even if email delivery is down) and emails a heads-up. Fires generate_lead on
// success so it counts as a conversion in GA4 / Google Ads.
export default function AssessmentRequestForm({
  tool,
  cta = 'Request my free assessment',
  orgLabel = 'Company',
  orgPlaceholder = 'Your company',
  doneNote = "We'll be in touch shortly to schedule your assessment.",
  privacyNote,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');
  const startedRef = useRef(false);

  // Fire assessment_started once, when the visitor first engages the form — the
  // top of the funnel, so we can measure start → submit drop-off.
  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try { trackAssessmentStarted({ focus: tool }); } catch { /* analytics optional */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) { setErr('Please enter a valid email.'); return; }
    setState('sending'); setErr('');
    try {
      const res = await fetch('/api/proxy/revenue-checker/lead', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          company: company.trim() || null,
          message: message.trim() || null,
          tool,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail || 'Could not send — please try again.');
      setState('done');
      try { trackLead({ focus: tool }); trackAssessmentSubmitted({ focus: tool }); } catch { /* analytics optional */ }
    } catch (e2) {
      setErr(e2.message || 'Could not send — please try again.');
      setState('error');
    }
  };

  if (state === 'done') return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-3">
      <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
      <div>
        <p className="font-semibold text-emerald-900">Request received — thank you.</p>
        <p className="text-sm text-emerald-800 mt-1">{doneNote}</p>
      </div>
    </div>
  );

  const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition';
  const label = 'block text-sm font-semibold text-slate-200 mb-1.5';

  return (
    <form onSubmit={submit} onFocusCapture={markStarted} className="bg-navy-deep border border-navy-border rounded-2xl p-6 md:p-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Your name" />
        </div>
        <div>
          <label className={label}>Email <span className="text-blue-400">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={input} placeholder="you@company.com" />
        </div>
      </div>
      <div>
        <label className={label}>{orgLabel}</label>
        <input value={company} onChange={(e) => setCompany(e.target.value)} className={input} placeholder={orgPlaceholder} />
      </div>
      <div>
        <label className={label}>What would you like us to look at? <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={input} placeholder="A sentence or two about your goals or the systems you use." />
      </div>
      <button type="submit" disabled={state === 'sending'}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold transition-colors">
        {state === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {cta}
      </button>
      {err && <p className="text-sm text-amber-300">{err}</p>}
      {privacyNote && (
        <p className="text-xs text-slate-400 flex items-start gap-1.5 pt-1">
          <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-slate-500" /> {privacyNote}
        </p>
      )}
    </form>
  );
}
