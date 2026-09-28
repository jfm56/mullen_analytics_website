'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Sparkles, Lock, Send, CheckCircle2 } from 'lucide-react';
import { logToolUsage } from '@/lib/toolUsage';
import { trackProfitCalculatorCompleted } from '@/lib/conversions';

const num = (s) => {
  const n = parseFloat(String(s ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
function fmtUSD(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n), sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}
const fmtPct = (n) => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(1)}%`);
const fmtNum = (n) => (n == null || !Number.isFinite(n) ? '—' : Math.round(n).toLocaleString());

const INDUSTRIES = ['Retail / e-commerce', 'Professional services', 'Software / SaaS', 'Food & beverage',
  'Manufacturing', 'Healthcare', 'Construction / trades', 'Other'];

const SAMPLE = { industry: 'Retail / e-commerce', customers: '320', unitsPer: '1.4', price: '85',
  material: '32', othervar: '6', fixed: '9500', startup: '40000' };

const F = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export default function ProfitCalculatorPage() {
  const [v, setV] = useState({ industry: '', customers: '', unitsPer: '1', price: '', material: '', othervar: '', fixed: '', startup: '' });
  const [result, setResult] = useState(null);
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));

  const calc = () => {
    const price = num(v.price);
    const units = num(v.customers) * (num(v.unitsPer) || 1);
    if (price <= 0 || units <= 0) { setResult({ error: 'Enter a sell price and how many you sell (customers × units) to calculate.' }); return; }

    const material = num(v.material);
    const varPer = material + num(v.othervar);
    const fixed = num(v.fixed);
    const startup = num(v.startup);

    const revenue = price * units;
    const varTotal = varPer * units;
    const cmPerUnit = price - varPer;
    const profit = revenue - varTotal - fixed;
    const grossMargin = revenue > 0 ? ((revenue - material * units) / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const breakevenUnits = cmPerUnit > 0 ? fixed / cmPerUnit : null;
    const paybackMonths = startup > 0 && profit > 0 ? startup / profit : null;
    const dir = profit > 1 ? 'up' : profit < -1 ? 'down' : 'flat';

    const r = {
      price, units, varPer, fixed, startup, revenue, varTotal, cmPerUnit, profit,
      grossMargin, netMargin, breakevenUnits, paybackMonths, annualProfit: profit * 12, dir,
    };
    setResult(r);
    logToolUsage('profit_calculator', { ...v }, r);
    try { trackProfitCalculatorCompleted({ industry: v.industry || 'unspecified' }); } catch { /* analytics optional */ }
    setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const fillSample = () => { setV({ ...SAMPLE }); setResult(null); };
  const clearAll = () => { setV({ industry: '', customers: '', unitsPer: '1', price: '', material: '', othervar: '', fixed: '', startup: '' }); setResult(null); };

  const r = result && !result.error ? result : null;
  // breakdown bar widths (% of revenue)
  const pct = (x) => (r && r.revenue > 0 ? Math.max(0, Math.min(100, (x / r.revenue) * 100)) : 0);

  return (
    <div className="bg-white">
      <section className="bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-4">Free Tool · No signup</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5">Business Profit Calculator</h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Plug in your pricing, costs, and sales volume to see your real monthly profit, margins, break-even point,
            and how fast your startup investment pays back. Free — no signup.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 space-y-8">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-slate-900">Tell us about your business</h2>
            <div className="flex items-center gap-4 text-sm">
              <button onClick={fillSample} className="text-blue-600 font-semibold hover:text-blue-700">Fill sample data</button>
              <button onClick={clearAll} className="text-slate-500 hover:text-slate-700">Clear</button>
            </div>
          </div>

          <Group n="1" title="Your business">
            <Field label="Industry">
              <select value={v.industry} onChange={(e) => set('industry', e.target.value)} className={F}>
                <option value="">Select…</option>
                {INDUSTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
          </Group>

          <Group n="2" title="Sales volume (per month)">
            <Field label="Customers per month"><input inputMode="decimal" value={v.customers} onChange={(e) => set('customers', e.target.value)} placeholder="0" className={F} /></Field>
            <Field label="Avg units per customer"><input inputMode="decimal" value={v.unitsPer} onChange={(e) => set('unitsPer', e.target.value)} placeholder="1" className={F} /></Field>
          </Group>

          <Group n="3" title="Pricing & materials (per unit)">
            <Field label="Sell price per unit ($)"><input inputMode="decimal" value={v.price} onChange={(e) => set('price', e.target.value)} placeholder="0" className={F} /></Field>
            <Field label="Material / product cost per unit ($)"><input inputMode="decimal" value={v.material} onChange={(e) => set('material', e.target.value)} placeholder="0" className={F} /></Field>
          </Group>

          <Group n="4" title="Costs">
            <Field label="Other variable cost per unit ($)" hint="shipping, fees, packaging"><input inputMode="decimal" value={v.othervar} onChange={(e) => set('othervar', e.target.value)} placeholder="0" className={F} /></Field>
            <Field label="Fixed costs per month ($)" hint="rent, salaries, software, loan payment"><input inputMode="decimal" value={v.fixed} onChange={(e) => set('fixed', e.target.value)} placeholder="0" className={F} /></Field>
          </Group>

          <Group n="5" title="Startup investment (one-time)">
            <Field label="Total startup / equipment / furniture ($)" hint="used to estimate payback"><input inputMode="decimal" value={v.startup} onChange={(e) => set('startup', e.target.value)} placeholder="0" className={F} /></Field>
          </Group>

          <div className="flex items-center gap-4 pt-1">
            <button onClick={calc} className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors">Calculate profit</button>
            <span className="flex items-center gap-1.5 text-xs text-slate-400"><Lock size={12} /> Calculated instantly. Entries saved anonymously to improve the tool — no name unless you message us.</span>
          </div>
          {result?.error && <p className="text-sm text-amber-700">{result.error}</p>}
        </div>
      </section>

      {r && (
        <section id="results" className="max-w-4xl mx-auto px-6 pb-8 space-y-6">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${
            r.dir === 'up' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : r.dir === 'down' ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {r.dir === 'up' ? <TrendingUp size={15} /> : r.dir === 'down' ? <TrendingDown size={15} /> : <Minus size={15} />}
            {r.dir === 'up' ? `Profitable — ${fmtUSD(r.profit)}/mo` : r.dir === 'down' ? `Operating at a loss — ${fmtUSD(r.profit)}/mo` : 'Breaking even'}
          </span>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Kpi label="Monthly revenue" value={fmtUSD(r.revenue)} />
            <Kpi label="Monthly profit" value={fmtUSD(r.profit)} good={r.profit >= 0} />
            <Kpi label="Net margin" value={fmtPct(r.netMargin)} good={r.netMargin >= 0} />
            <Kpi label="Contribution / unit" value={fmtUSD(r.cmPerUnit)} good={r.cmPerUnit >= 0} sub="price − variable cost" />
            <Kpi label="Break-even" value={r.breakevenUnits == null ? 'n/a' : `${fmtNum(r.breakevenUnits)} units/mo`} sub={r.breakevenUnits == null ? 'raise price above variable cost' : `you sell ${fmtNum(r.units)}/mo`} />
            <Kpi label="Startup payback" value={r.paybackMonths == null ? '—' : `${r.paybackMonths.toFixed(1)} mo`} sub="to recoup investment" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Where each month's revenue goes</h3>
              <span className="text-xs text-slate-400">of {fmtUSD(r.revenue)} revenue</span>
            </div>
            <div className="h-9 rounded-lg overflow-hidden flex bg-slate-100 text-[10px] font-semibold text-white">
              <Seg w={pct(r.varTotal)} color="#f59e0b" title={`Variable costs: ${fmtUSD(r.varTotal)}`} />
              <Seg w={pct(r.fixed)} color="#64748b" title={`Fixed costs: ${fmtUSD(r.fixed)}`} />
              {r.profit >= 0 && <Seg w={pct(r.profit)} color="#10b981" title={`Profit: ${fmtUSD(r.profit)}`} />}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-slate-600">
              <Legend color="#f59e0b" label="Variable" value={fmtUSD(r.varTotal)} />
              <Legend color="#64748b" label="Fixed" value={fmtUSD(r.fixed)} />
              <Legend color={r.profit >= 0 ? '#10b981' : '#ef4444'} label={r.profit >= 0 ? 'Profit' : 'Loss'} value={fmtUSD(r.profit)} />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-3">What this says</p>
            <ul className="space-y-2.5 text-sm text-slate-700">
              <li>• At <strong>{fmtNum(r.units)}</strong> units/month and <strong>{fmtUSD(r.price)}</strong> each, you make <strong>{fmtUSD(r.revenue)}</strong> in revenue and <strong>{fmtUSD(r.profit)}</strong> in profit — a <strong>{fmtPct(r.netMargin)}</strong> net margin.</li>
              <li>• Every unit contributes <strong>{fmtUSD(r.cmPerUnit)}</strong> after its variable costs{r.cmPerUnit < 0 ? ' — you lose money on each sale; price or costs need to change.' : '.'}</li>
              {r.breakevenUnits != null && <li>• You break even at <strong>{fmtNum(r.breakevenUnits)}</strong> units/month; you&apos;re {r.units >= r.breakevenUnits ? <><strong>{fmtNum(r.units - r.breakevenUnits)}</strong> units above break-even.</> : <>currently <strong>{fmtNum(r.breakevenUnits - r.units)}</strong> units short of break-even.</>}</li>}
              <li>• Annualized, that&apos;s about <strong>{fmtUSD(r.annualProfit)}</strong> in profit.</li>
              {r.paybackMonths != null && <li>• At this rate, your <strong>{fmtUSD(r.startup)}</strong> startup investment pays back in about <strong>{r.paybackMonths.toFixed(1)} months</strong>.</li>}
            </ul>
            <p className="mt-4 text-xs text-slate-400">Directional estimate based on the numbers you entered — not an audited figure.</p>
          </div>

          <LeadForm r={r} v={v} />
        </section>
      )}

      {!r && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-navy-deep rounded-2xl px-6 py-8 text-center">
            <p className="text-slate-300">Or check your revenue trend and forecast with the <Link href="/revenue-checker" className="text-sky-400 font-semibold hover:text-sky-300">free Revenue Checker →</Link></p>
          </div>
        </section>
      )}
    </div>
  );
}

function Group({ n, title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/10 text-blue-700 mr-2 text-[11px]">{n}</span>{title}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-slate-500 mb-1">{label}{hint && <span className="text-slate-400 font-normal"> — {hint}</span>}</span>
      {children}
    </label>
  );
}
function Kpi({ label, value, sub, good }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${good == null ? 'text-slate-900' : good ? 'text-emerald-600' : 'text-red-600'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
function Seg({ w, color, title }) {
  if (w <= 0) return null;
  return <div className="flex items-center justify-center overflow-hidden" style={{ width: `${w}%`, backgroundColor: color }} title={title}>{w > 8 ? `${Math.round(w)}%` : ''}</div>;
}
function Legend({ color, label, value }) {
  return <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} /> {label}: <strong className="text-slate-800">{value}</strong></span>;
}

function LeadForm({ r, v }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [include, setInclude] = useState(true);
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');

  const snapshot = () =>
    `Industry: ${v.industry || 'n/a'}\n` +
    `Revenue: ${fmtUSD(r.revenue)}/mo | Profit: ${fmtUSD(r.profit)}/mo | Net margin: ${fmtPct(r.netMargin)}\n` +
    `Units/mo: ${fmtNum(r.units)} @ ${fmtUSD(r.price)} | Contribution/unit: ${fmtUSD(r.cmPerUnit)}\n` +
    `Break-even: ${r.breakevenUnits == null ? 'n/a' : fmtNum(r.breakevenUnits) + ' units/mo'} | ` +
    `Fixed: ${fmtUSD(r.fixed)}/mo | Startup: ${fmtUSD(r.startup)}` +
    (r.paybackMonths != null ? ` (payback ~${r.paybackMonths.toFixed(1)} mo)` : '');

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) { setErr('Please enter a valid email.'); return; }
    setState('sending'); setErr('');
    try {
      const res = await fetch('/api/proxy/revenue-checker/lead', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null, email: email.trim(), company: company.trim() || null,
          message: message.trim() || null, revenue_summary: include ? snapshot() : null, tool: 'profit_calculator',
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail || 'Could not send — please try again.');
      setState('done');
    } catch (e2) { setErr(e2.message); setState('error'); }
  };

  if (state === 'done') return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-3">
      <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
      <div>
        <p className="font-semibold text-emerald-900">Thanks — your message is on its way.</p>
        <p className="text-sm text-emerald-800 mt-1">Jim will follow up with specific ways to widen the margin and grow profit. Talk soon.</p>
      </div>
    </div>
  );

  return (
    <div className="bg-navy-deep rounded-2xl p-6 md:p-8">
      <div className="flex items-start gap-2 mb-2">
        <Sparkles className="text-sky-400 mt-1 flex-shrink-0" size={20} />
        <div>
          <h3 className="text-xl font-bold text-white">Want help improving these margins?</h3>
          <p className="text-sm text-slate-300 mt-1">Send it over and I&apos;ll come back with practical ways to raise your margin, lower break-even, and grow profit — no pitch, no obligation.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 grid sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" required className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 sm:col-span-2" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="What would you most like to improve? (optional)" className="px-3 py-2.5 rounded-lg bg-white/95 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 sm:col-span-2" />
        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} className="w-4 h-4 rounded" />
          Include my numbers so the advice is specific
        </label>
        {err && <p className="sm:col-span-2 text-sm text-red-300">{err}</p>}
        <div className="sm:col-span-2">
          <button type="submit" disabled={state === 'sending'} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-base transition-colors">
            <Send size={16} /> {state === 'sending' ? 'Sending…' : 'Send my numbers to Jim'}
          </button>
        </div>
      </form>
    </div>
  );
}
