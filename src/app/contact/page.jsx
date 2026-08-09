import ContactForm from '@/components/ContactForm';
import ScheduleCTA from '@/components/ScheduleCTA';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

// Contact page. Same FIXED palette as the home page (see app/page.jsx):
// always-light with navy bands, not theme-aware. Server component — the
// interactive form lives in the ContactForm client component.

export const metadata = {
  title: 'Contact | Mullen Analytics & Data Solutions',
  description:
    'Get in touch with Mullen Analytics. Tell us what you are trying to solve with your data, or schedule a free strategy call.',
};

const CALENDAR_URL = 'https://calendar.app.google/1BFgdi2pgjF9vwAB8';

const CONTACT_METHODS = [
  { Icon: Mail,   label: 'Email',           value: 'jmullen@mullenanalytics.com',       href: 'mailto:jmullen@mullenanalytics.com' },
  { Icon: Phone,  label: 'Phone',           value: '(609) 200-5818',                    href: 'tel:+16092005818' },
  { Icon: MapPin, label: 'Mailing Address', value: 'P.O. Box 2058\nSouthampton, NJ 08088' },
  { Icon: Clock,  label: 'Hours',           value: 'Monday – Friday\n9:00 AM – 5:00 PM EST' },
];

const SOCIALS = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/mullen-analytics',
    d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61583215691139',
    d: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  { label: 'GitHub', href: 'https://github.com/jfm56', even: true,
    d: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z' },
];

export default function ContactPage() {
  return (
    <div className="bg-white">

      {/* HERO — navy band */}
      <section className="bg-navy-deep">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-5">Contact</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Let&rsquo;s talk about your data
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-10">
              Bring a problem, a sample dataset, a report, or a workflow. In a free 20-minute assessment we&rsquo;ll
              pinpoint where analytics, automation, or forecasting could help &mdash; and recommend a concrete next
              step. No pressure, no jargon, no obligation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <ScheduleCTA href={CALENDAR_URL}
                className="px-8 py-4 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
                Get a Free 20-Minute Data Assessment
              </ScheduleCTA>
              <a href="#message-form"
                className="px-8 py-4 rounded border border-navy-border hover:border-slate-500 text-slate-200 hover:text-white font-semibold text-base text-center transition-colors">
                Send a message
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT METHODS — white */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CONTACT_METHODS.map(({ Icon, label, value, href }) => {
              const inner = (
                <>
                  <div className="w-11 h-11 rounded-lg bg-blue-600/10 flex items-center justify-center mb-4">
                    <Icon size={20} strokeWidth={1.75} className="text-blue-700" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-2">{label}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line break-words">{value}</p>
                </>
              );
              return href ? (
                <a key={label} href={href}
                  className="block bg-slate-50 border border-slate-200 rounded-xl p-6 hover:border-blue-500 transition-colors">
                  {inner}
                </a>
              ) : (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FORM — slate-50 */}
      <section id="message-form" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-4">Send a Message</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
              Tell us about your goals
            </h2>
            <p className="text-base text-slate-700 leading-relaxed">
              A few details about what you&rsquo;re working on is all we need to point you in the right direction.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* FINAL CTA + SOCIAL — navy band */}
      <section className="py-24 bg-navy-deep">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight mb-6">
            Prefer to talk it through?
          </h2>
          <p className="text-lg text-slate-300 mb-10 leading-relaxed mx-auto max-w-xl">
            Grab a time that works for you. In 20 minutes we&rsquo;ll walk through your goals together &mdash; often
            with a quick look at what it means for your own data. No obligation.
          </p>
          <ScheduleCTA href={CALENDAR_URL}
            className="inline-block px-10 py-5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base text-center transition-colors">
            Get a Free 20-Minute Data Assessment
          </ScheduleCTA>
          <div className="mt-12 pt-10 border-t border-navy-border">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">Connect with us</p>
            <div className="flex justify-center gap-4">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-11 h-11 rounded-full bg-white/5 border border-navy-border hover:bg-blue-600 hover:border-blue-600 flex items-center justify-center text-slate-200 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.d} {...(s.even ? { fillRule: 'evenodd', clipRule: 'evenodd' } : {})} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
