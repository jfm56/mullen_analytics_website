'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Activity, CalendarRange, Sparkles, Lock, Send, CheckCircle2 } from 'lucide-react';
import { logToolUsage } from '@/lib/toolUsage';
import { trackRevenueCheckerCompleted } from '@/lib/conversions';

// ── helpers ────────────────────────────────────────────────────────────────
function monthLabels() {
  // Trailing 12 months ending with the current month.
  const out = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.toLocaleString('en-US', { month: 'short' }) + " '" + String(d.getFullYear()).slice(2));
  }
  return out;
}

const num = (s) => {
  const n = parseFloat(String(s ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function fmtUSD(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
const fmtPct = (n) => (n == null || !Number.isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);

function linreg(y) {
  // least-squares slope/intercept over x = 0..n-1
  const n = y.length;
  const xm = (n - 1) / 2;
  const ym = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (i - xm) * (y[i] - ym); sxx += (i - xm) ** 2; }
  const slope = sxx ? sxy / sxx : 0;
  return { slope, intercept: ym - slope * xm };
}

const SAMPLE = [312000, 298000, 335000, 342000, 358000, 371000, 349000, 388000, 402000, 415000, 398000, 441000];

// ── page ─────────────────────────────────────────────────────────────────────
export default function RevenueCheckerPage() {
  const labels = useMemo(() => monthLabels(), []);
  const [vals, setVals] = useState(Array(12).fill(''));
  const [priorYear, setPriorYear] = useState('');
  const [result, setResult] = useState(null);

  const setVal = (i, v) => setVals((a) => a.map((x, j) => (j === i ? v : x)));

  const analyze = () => {
    const y = vals.map(num);
    const nonZero = y.filter((v) => v > 0).length;
    if (nonZero < 3) { setResult({ error: 'Enter at least 3 months of revenue to analyze.' }); return; }

    const total = y.reduce((a, b) => a + b, 0);
    const avg = total / 12;
    let bestI = 0, worstI = 0;
    y.forEach((v, i) => { if (v > y[bestI]) bestI = i; if (v < y[worstI]) worstI = i; });

    const { slope, intercept } = linreg(y);
    const fittedStart = intercept;
    const fittedEnd = intercept + slope * 11;
    const trendPct = fittedStart ? ((fittedEnd - fittedStart) / Math.abs(fittedStart)) * 100 : 0;

    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const first3 = mean(y.slice(0, 3));
    const last3 = mean(y.slice(9));
    const momentumPct = first3 ? ((last3 - first3) / first3) * 100 : 0;

    const py = num(priorYear);
    const yoyPct = py > 0 ? ((total - py) / py) * 100 : null;

    const forecast = [12, 13, 14].map((x) => Math.max(0, intercept + slope * x));
    const nextQuarter = forecast.reduce((a, b) => a + b, 0);

    // consistency: coefficient of variation
    const variance = mean(y.map((v) => (v - avg) ** 2));
    const cv = avg ? Math.sqrt(variance) / avg : 0;
    const steady = cv < 0.18;

    const dir = trendPct > 3 ? 'up' : trendPct < -3 ? 'down' : 'flat';

    const r = {
      y, total, avg, bestI, worstI, trendPct, momentumPct, yoyPct,
      forecast, nextQuarter, steady, cv, dir,
    };
    setResult(r);
    logToolUsage('revenue_checker', { monthly: y, prior_year: py }, r);
    try { trackRevenueCheckerCompleted({ trend: r.dir, months_entered: nonZero }); } catch { /* analytics optional */ }
    setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const clearAll = () => { setVals(Array(12).fill('')); setPriorYear(''); setResult(null); };
  const fillSample = () => { setVals(SAMPLE.map(String)); setPriorYear('4020000'); setResult(null); };

  const r = result && !result.error ? result : null;
  const chartMax = r ? Math.max(...r.y, ...r.forecast, 1) : 1;

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-4">Free Tool · No signup</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5">
            Business Revenue Checker
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Enter your last 12 months of revenue and get an instant read on growth, trend, momentum, and what next
            quarter looks like — plus plain-English takeaways. Free — no signup.
          </p>
        </div>
      </section>

      {/* INPUT */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-slate-900">Your monthly revenue</h2>
            <div className="flex items-center gap-4 text-sm">
              <button onClick={fillSample} className="text-blue-600 font-semibold hover:text-blue-700">Fill sample data</button>
              <button onClick={clearAll} className="text-slate-500 hover:text-slate-700">Clear</button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {labels.map((lab, i) => (
              <label key={i} className="block">
                <span className="block text-[11px] font-medium text-slate-500 mb-1">{lab}</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    inputMode="decimal"
                    value={vals[i]}
                    onChange={(e) => setVal(i, e.target.value)}
                    placeholder="0"
                    className="w-full pl-6 pr-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white tabular-nums"
                  />
                </div>
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-end gap-4">
            <label className="block sm:max-w-xs">
              <span className="block text-[11px] font-medium text-slate-500 mb-1">Prior year total revenue (optional — for year-over-year)</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input inputMode="decimal" value={priorYear} onChange={(e) => setPriorYear(e.target.value)} placeholder="0"
                  className="w-full pl-6 pr-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white tabular-nums" />
              </div>
            </label>
            <button onClick={analyze}
              className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors">
              Analyze revenue
            </button>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Lock size={12} /> Calculated instantly in your browser. We save your entries anonymously to improve this tool — no name or email unless you message us.
          </p>
          {result?.error && <p className="mt-3 text-sm text-amber-700">{result.error}</p>}
        </div>
      </section>

      {/* RESULTS */}
      {r && (
        <section id="results" className="max-w-4xl mx-auto px-6 pb-8 space-y-6">
          {/* health pill */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${
              r.dir === 'up' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : r.dir === 'down' ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {r.dir === 'up' ? <TrendingUp size={15} /> : r.dir === 'down' ? <TrendingDown size={15} /> : <Minus size={15} />}
              {r.dir === 'up' ? 'Revenue is growing' : r.dir === 'down' ? 'Revenue is declining' : 'Revenue is flat'}
            </span>
            <span className="text-sm text-slate-500">{r.steady ? 'Steady month to month' : 'Variable month to month'}</span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Kpi label="Total (12 mo)" value={fmtUSD(r.total)} />
            <Kpi label="Avg / month" value={fmtUSD(r.avg)} />
            <Kpi label="Full-year trend" value={fmtPct(r.trendPct)} good={r.trendPct >= 0} icon={<TrendingUp size={16} />} />
            <Kpi label="Recent momentum" value={fmtPct(r.momentumPct)} sub="last 3 mo vs first 3" good={r.momentumPct >= 0} icon={<Activity size={16} />} />
            {r.yoyPct != null && <Kpi label="Year over year" value={fmtPct(r.yoyPct)} good={r.yoyPct >= 0} icon={<TrendingUp size={16} />} />}
            <Kpi label="Forecast next quarter" value={fmtUSD(r.nextQuarter)} sub="at current trend" icon={<CalendarRange size={16} />} />
          </div>

          {/* chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="text-base font-bold text-slate-900">Monthly revenue + forecast</h3>
              <span className="text-xs text-slate-400">solid = actual · striped = projected</span>
            </div>
            <div className="flex gap-1.5 h-52">
              {r.y.map((v, i) => (
                <Bar key={i} label={labels[i]} title={`${labels[i]}: ${fmtUSD(v)}`} h={(v / chartMax) * 100} color="#2563eb" />
              ))}
              {r.forecast.map((v, i) => (
                <Bar key={`f${i}`} label={`+${i + 1}`} title={`Forecast +${i + 1} mo: ${fmtUSD(v)}`} h={(v / chartMax) * 100} forecast />
              ))}
            </div>
          </div>

          {/* insights */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">What this says</p>
            <ul className="space-y-2.5 text-sm text-slate-700">
              <li>• Over the last 12 months you brought in <strong>{fmtUSD(r.total)}</strong>, averaging <strong>{fmtUSD(r.avg)}</strong> per month.</li>
              <li>• Your revenue trend is <strong>{fmtPct(r.trendPct)}</strong> across the year{r.dir === 'up' ? ' — an upward trajectory.' : r.dir === 'down' ? ' — trending down.' : ' — essentially flat.'}</li>
              <li>• Recent momentum (last 3 months vs. the first 3) is <strong>{fmtPct(r.momentumPct)}</strong>.</li>
              {r.yoyPct != null && <li>• Compared with the prior year, you&apos;re <strong>{fmtPct(r.yoyPct)}</strong> year over year.</li>}
              <li>• Best month: <strong>{labels[r.bestI]}</strong> ({fmtUSD(r.y[r.bestI])}); slowest: <strong>{labels[r.worstI]}</strong> ({fmtUSD(r.y[r.worstI])}).</li>
              <li>• Revenue is <strong>{r.steady ? 'fairly steady' : 'fairly variable'}</strong> month to month{r.steady ? '.' : ' — smoothing the swings is often an easy win.'}</li>
              <li>• If the current trend holds, next quarter projects to about <strong>{fmtUSD(r.nextQuarter)}</strong>.</li>
            </ul>
            <p className="mt-4 text-xs text-slate-400">Illustrative, based only on the numbers you entered — a directional read, not an audited figure.</p>
          </div>

          <LeadForm result={r} labels={labels} />
        </section>
      )}

      {/* fallback CTA when no result yet */}
      {!r && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-navy-deep rounded-2xl px-6 py-8 text-center">
            <p className="text-slate-300">Run the checker above, then get tailored ideas to grow the number.</p>
            <Link href="/business-analytics" className="inline-block mt-4 text-sky-400 font-semibold hover:text-sky-300">
              Explore our business analytics services →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, good, icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
        {icon}{label}
      </p>
      <p className={`text-2xl font-bold tracking-tight ${good == null ? 'text-slate-900' : good ? 'text-emerald-600' : 'text-red-600'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Bar({ label, title, h, color, forecast }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5 group min-w-0">
      <div className="w-full flex-1 flex items-end min-h-0">
        <div
          className="w-full rounded-t transition-colors"
          style={{
            height: `${Math.max(2, h)}%`,
            backgroundColor: forecast ? '#bae6fd' : color,
            backgroundImage: forecast ? 'repeating-linear-gradient(45deg,#bae6fd,#bae6fd 3px,#e0f2fe 3px,#e0f2fe 6px)' : 'none',
          }}
          title={title}
        />
      </div>
      <span className="text-[9px] text-slate-400 truncate w-full text-center">{label}</span>
    </div>
  );
}

function LeadForm({ result, labels }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [err, setErr] = useState('');

  const snapshot = () => {
    const lines = labels.map((l, i) => `${l}: ${fmtUSD(result.y[i])}`).join('\n');
    return (
      `Total (12mo): ${fmtUSD(result.total)} | Avg/mo: ${fmtUSD(result.avg)}\n` +
      `Trend: ${fmtPct(result.trendPct)} | Momentum: ${fmtPct(result.momentumPct)}` +
      (result.yoyPct != null ? ` | YoY: ${fmtPct(result.yoyPct)}` : '') +
      ` | Next-qtr forecast: ${fmtUSD(result.nextQuarter)}\n\nMonthly:\n${lines}`
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) { setErr('Please enter a valid email.'); return; }
    setState('sending'); setErr('');
    try {
      const res = await fetch('/api/proxy/revenue-checker/lead', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          company: company.trim() || null,
          message: message.trim() || null,
          revenue_summary: includeNumbers ? snapshot() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail || 'Could not send — please try again.');
      setState('done');
    } catch (e2) { setErr(e2.message); setState('error'); }
  };

  if (state === 'done') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-3">
        <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <p className="font-semibold text-emerald-900">Thanks — your message is on its way.</p>
          <p className="text-sm text-emerald-800 mt-1">Jim will follow up personally with specific ideas to grow the number. Talk soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-deep rounded-2xl p-6 md:p-8">
      <div className="flex items-start gap-2 mb-2">
        <Sparkles className="text-sky-400 mt-1 flex-shrink-0" size={20} />
        <div>
          <h3 className="text-xl font-bold text-white">Want help growing this number?</h3>
          <p className="text-sm text-slate-300 mt-1">
            Send it over and I&apos;ll come back with specific, practical ideas to improve your revenue — forecasting,
            KPIs, and where the leverage is. No pitch, no obligation.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 grid sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
          className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company"
          className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" required
          className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 sm:col-span-2" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="What would you most like to improve? (optional)"
          className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 sm:col-span-2" />
        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={includeNumbers} onChange={(e) => setIncludeNumbers(e.target.checked)} className="w-4 h-4 rounded" />
          Include my revenue snapshot so the advice is specific
        </label>
        {err && <p className="sm:col-span-2 text-sm text-red-300">{err}</p>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={state === 'sending'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-base transition-colors">
            <Send size={16} /> {state === 'sending' ? 'Sending…' : 'Send my numbers to Jim'}
          </button>
        </div>
      </form>
    </div>
  );
}
