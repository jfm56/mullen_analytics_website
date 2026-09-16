import { Server, EyeOff, UserCheck, ScrollText } from 'lucide-react';

// Private & Secure AI positioning — the differentiator for regulated EMS/healthcare
// buyers (vs. third-party frontier models with data-retention / IP concerns). Uses
// the fixed-navy palette (navy-deep === #071829), so it matches both the Tailwind
// pages (Healthcare) and the inline-hex pages (EMS QA), whose navy is the same.
const PILLARS = [
  {
    Icon: Server,
    title: 'Runs in your environment',
    desc: 'Models can run on your own hardware or your controlled cloud — your data never leaves your environment or gets retained to train someone else’s model.',
  },
  {
    Icon: EyeOff,
    title: 'No unnecessary exposure',
    desc: 'We process only what’s needed and prefer de-identified data, keeping PHI and sensitive records out of anything that doesn’t require them.',
  },
  {
    Icon: UserCheck,
    title: 'Human in the loop',
    desc: 'AI assists; your people decide. Every AI output is reviewable and overridable — nothing clinical or operationally critical acts on its own.',
  },
  {
    Icon: ScrollText,
    title: 'Audit trails & explainability',
    desc: 'Every AI-assisted step is logged and explainable, so you can stand behind it in QA/QI, compliance, and procurement reviews.',
  },
];

export default function PrivateSecureAI({ domain = 'sensitive operational and patient data' }) {
  return (
    <section className="py-24 bg-navy-deep border-t border-navy-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-3">Private &amp; Secure AI</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">AI you can trust with {domain}</h2>
          <p className="text-base text-slate-300 leading-relaxed">
            Major enterprises are pulling back from third-party AI over where their data goes and whether it&rsquo;s
            retained. We take the opposite approach: AI that runs under your control, touches only what it must, keeps a
            human in the loop, and leaves an audit trail you can stand behind — the difference between &ldquo;we use
            AI&rdquo; and AI you can actually deploy on regulated data.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map(({ Icon, title, desc }) => (
            <div key={title} className="bg-navy-surface border border-navy-border rounded-xl p-6">
              <div className="w-11 h-11 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <Icon size={22} strokeWidth={2} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
