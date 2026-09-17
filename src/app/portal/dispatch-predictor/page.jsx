'use client';
import { useState } from 'react';
import { dispatch } from '@/lib/api';
import { Siren, AlertTriangle, Activity, Loader2, Sparkles, ShieldAlert } from 'lucide-react';

const SAMPLES = [
  { label: 'Chest pain', text: '58-year-old male with chest pain radiating to the left arm, sweaty and short of breath, history of heart problems.' },
  { label: 'Fall', text: 'Elderly woman fell at home, awake and alert, complaining of hip pain, no loss of consciousness.' },
  { label: 'Trouble breathing', text: 'Adult with severe difficulty breathing and wheezing, history of asthma, rescue inhaler not helping.' },
  { label: 'MVA', text: 'Two-vehicle crash on the highway, one patient still in the car, complaining of neck and back pain.' },
  { label: 'Cardiac arrest', text: 'Man collapsed and is not breathing, bystander performing CPR.' },
  { label: 'Overdose', text: 'Young adult unresponsive, suspected opioid overdose, shallow breathing, blue lips.' },
];

const LEVEL_STYLE = { ALS: 'bg-red-100 text-red-700 border-red-200', BLS: 'bg-blue-100 text-blue-700 border-blue-200' };
const ACUITY_STYLE = { high: 'bg-red-100 text-red-700', moderate: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };
const LIKELIHOOD = { high: { w: 'w-full', c: 'bg-red-500', t: 'text-red-600' }, moderate: { w: 'w-2/3', c: 'bg-amber-500', t: 'text-amber-600' }, low: { w: 'w-1/3', c: 'bg-slate-400', t: 'text-slate-500' } };

export default function DispatchPredictorPage() {
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const analyze = async (t) => {
    const input = (t ?? text).trim();
    if (input.length < 3) { setErr('Enter a chief complaint or call note.'); return; }
    setLoading(true); setErr(''); setRes(null);
    try {
      const r = await dispatch.predict(input);
      if (r && r.available === false) setErr(r.reason || 'Could not analyze.');
      else setRes(r);
    } catch (e) { setErr(e.message || 'Request failed.'); }
    finally { setLoading(false); }
  };

  const runSample = (s) => { setText(s.text); analyze(s.text); };

  return (
    <div className="max-w-4xl mx-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center flex-shrink-0"><Siren size={20} /></div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Dispatch Resource Predictor</h1>
            <span className="text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">R&amp;D Preview</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Paste a 911 chief complaint or call note to estimate ALS vs BLS need, acuity, and likely interventions.</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <ShieldAlert size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Decision support only.</strong> This is an R&amp;D prototype, not a medical device or medical direction — a
          qualified dispatcher makes the final call. <strong>Do not enter patient-identifying information.</strong>
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
          placeholder="e.g. 62-year-old female, sudden severe headache, one-sided weakness, slurred speech…"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Try:</span>
          {SAMPLES.map((s) => (
            <button key={s.label} type="button" onClick={() => runSample(s)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-3 py-1 transition-colors">{s.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => analyze()} disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Analyze
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      {/* Results */}
      {res && (
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg border ${LEVEL_STYLE[res.level] || LEVEL_STYLE.BLS}`}>
              <Activity size={15} /> {res.level} recommended
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1.5 rounded-lg ${ACUITY_STYLE[res.acuity] || ACUITY_STYLE.moderate}`}>{res.acuity} acuity</span>
            {res.recommended_response && <span className="text-sm text-gray-600">→ <strong className="text-gray-900">{res.recommended_response}</strong></span>}
          </div>

          {res.red_flags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" />
              {res.red_flags.map((f, i) => <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-full px-2.5 py-0.5">{f}</span>)}
            </div>
          )}

          {res.interventions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Likely time-critical interventions</p>
              <div className="space-y-2.5">
                {res.interventions.map((it, i) => {
                  const lk = LIKELIHOOD[it.likelihood] || LIKELIHOOD.moderate;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-800 truncate">{it.name}</span>
                          <span className={`text-xs font-semibold ${lk.t}`}>{it.likelihood}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${lk.w} ${lk.c} rounded-full`} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {res.rationale && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Why</p>
              <p className="text-sm text-gray-700 leading-relaxed">{res.rationale}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t text-[11px] text-gray-400">
            <span>{res.method === 'ai' ? 'Generated by Claude (private, in-the-loop).' : 'Generated by the keyword fallback.'}</span>
            <span>Estimate only — confirm with caller interrogation and local protocol.</span>
          </div>
        </div>
      )}
    </div>
  );
}
