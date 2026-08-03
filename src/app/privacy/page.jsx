import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Mullen Analytics',
  description:
    'How Mullen Analytics & Data Solutions collects, uses, and protects your information, including our use of cookies and analytics.',
};

const LAST_UPDATED = 'August 3, 2026';

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl md:text-2xl font-bold mb-3" style={{ color: '#071829' }}>{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed" style={{ color: '#334155' }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div>
      {/* Header band */}
      <div style={{ background: 'linear-gradient(180deg, #071829 0%, #0D2035 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#0EA5E9' }}>
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: '#94A3B8' }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-10">
        <p className="text-[15px] leading-relaxed" style={{ color: '#334155' }}>
          This Privacy Policy explains how <strong>Mullen Analytics &amp; Data Solutions LLC</strong> (&ldquo;Mullen
          Analytics,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, discloses, and
          protects information when you visit{' '}
          <a href="https://mullenanalytics.com" style={{ color: '#1D4ED8' }}>mullenanalytics.com</a>{' '}
          (the &ldquo;Site&rdquo;) or use our client portal and services. By using the Site, you agree to the practices
          described here.
        </p>

        <Section id="information-we-collect" title="1. Information We Collect">
          <p><strong>Information you provide.</strong> When you submit our contact form, request a strategy call, or
          create a client portal account, we collect details such as your name, email address, phone number, company,
          and the contents of your message or uploaded files.</p>
          <p><strong>Information collected automatically.</strong> When you browse the Site, we and our analytics
          providers automatically collect usage information such as your IP address (often truncated/anonymized),
          browser and device type, referring page, the pages you view, and timestamps. This is collected through
          cookies and similar technologies (see Section 3).</p>
          <p><strong>First-party, self-hosted analytics.</strong> With your consent (see Section 2), we also run our own
          privacy-focused analytics on our own infrastructure — no third-party analytics vendor is involved. Using
          anonymous first-party identifiers, it records the pages you view, the links and tabs you click, how long you
          spend on a page, your approximate region (from your browser&rsquo;s time zone), and your device type. It does
          <strong> not</strong> store your IP address (your IP is used only momentarily to rate-limit abuse), and it does
          not attempt to identify you personally.</p>
        </Section>

        <Section id="cookies" title="2. Cookies &amp; Similar Technologies">
          <p>Cookies are small text files stored on your device. We use them to keep the Site working, remember your
          preferences (including your cookie choice), and — with your consent — to understand how the Site is used and
          to measure our advertising.</p>
          <p>We group cookies into the following categories:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Strictly necessary</strong> — required for core functionality such as authentication and
            remembering your consent choice. These are always active.</li>
            <li><strong>Analytics</strong> — Google Analytics 4 and our own first-party, self-hosted analytics, used to
            count visits and understand which pages and links are useful. Set only after you accept.</li>
            <li><strong>Advertising</strong> — Google Ads, used to measure ad conversions and reach relevant audiences.
            Set only after you accept.</li>
          </ul>
          <p>When you first visit, non-essential cookies are <strong>disabled by default</strong>. We load analytics and
          advertising only after you select &ldquo;Accept&rdquo; in our cookie banner (we use Google Consent Mode to
          enforce this). You can withdraw or change your choice at any time using the{' '}
          <strong>Cookie Preferences</strong> link in the Site footer, or by clearing cookies in your browser.</p>
        </Section>

        <Section id="analytics-advertising" title="3. Analytics &amp; Advertising Providers">
          <p>We use the following third-party services, which may set their own cookies and process data as independent
          controllers under their respective policies:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Google Analytics 4</strong> (Google LLC) — website analytics.{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#1D4ED8' }}>Google Privacy Policy</a></li>
            <li><strong>Google Ads</strong> (Google LLC) — advertising and conversion measurement.</li>
            <li><strong>Vercel</strong> — Site hosting and performance (Speed Insights) monitoring.</li>
            <li><strong>Mullen Analytics &amp; Data Solutions (first-party)</strong> — our own self-hosted visitor
              analytics; the data stays on our own infrastructure and is not shared with any third party.</li>
          </ul>
          <p>You can opt out of Google Analytics across all sites using Google&rsquo;s{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: '#1D4ED8' }}>browser add-on</a>.</p>
        </Section>

        <Section id="how-we-use" title="4. How We Use Information">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To respond to inquiries and provide the consulting services you request;</li>
            <li>To operate and secure the client portal and your account;</li>
            <li>To understand and improve Site performance and content (with consent);</li>
            <li>To measure marketing and advertising effectiveness (with consent);</li>
            <li>To comply with legal obligations and enforce our agreements.</li>
          </ul>
        </Section>

        <Section id="legal-bases" title="5. Legal Bases (EEA/UK)">
          <p>Where the GDPR or UK GDPR applies, we rely on: your <strong>consent</strong> (analytics and advertising
          cookies), the <strong>performance of a contract</strong> (providing services you request), our
          <strong> legitimate interests</strong> (securing and improving the Site), and <strong>legal obligations</strong>.</p>
        </Section>

        <Section id="sharing" title="6. How We Share Information">
          <p>We do <strong>not</strong> sell your personal information. We share it only with service providers who
          process it on our behalf (such as hosting, analytics, and email delivery), when required by law, or in
          connection with a business transfer. Service providers are bound to use the information only as instructed.</p>
        </Section>

        <Section id="retention" title="7. Data Retention">
          <p>We retain personal information only as long as necessary for the purposes described above or as required by
          law. Google Analytics data is retained per our Google Analytics configuration; our first-party analytics
          events are retained for up to 12 months (aggregated, non-identifying statistics may be kept longer); contact
          and account data is kept for the duration of our relationship and a reasonable period afterward.</p>
        </Section>

        <Section id="your-rights" title="8. Your Privacy Rights">
          <p>Depending on where you live, you may have the right to access, correct, delete, or port your personal
          information; to object to or restrict certain processing; and to withdraw consent. If you are a California
          resident, you may exercise rights under the CCPA/CPRA, including the right to know and the right to delete,
          without discrimination.</p>
          <p>To exercise any of these rights, contact us at{' '}
            <a href="mailto:jmullen@mullenanalytics.com" style={{ color: '#1D4ED8' }}>jmullen@mullenanalytics.com</a>.
            We will respond as required by applicable law.</p>
        </Section>

        <Section id="security" title="9. Data Security">
          <p>We use administrative, technical, and physical safeguards designed to protect your information, including
          encrypted connections and access controls. No method of transmission or storage is completely secure, however,
          and we cannot guarantee absolute security.</p>
        </Section>

        <Section id="other" title="10. Children, International Transfers &amp; Changes">
          <p>The Site is not directed to children under 16, and we do not knowingly collect their information. If you
          access the Site from outside the United States, your information may be transferred to and processed in the
          United States. We may update this Policy from time to time; the &ldquo;Last updated&rdquo; date above reflects
          the latest version.</p>
        </Section>

        <Section id="contact" title="11. Contact Us">
          <p>Questions about this Policy or your information:</p>
          <p>
            <strong>Mullen Analytics &amp; Data Solutions LLC</strong><br />
            Email: <a href="mailto:jmullen@mullenanalytics.com" style={{ color: '#1D4ED8' }}>jmullen@mullenanalytics.com</a><br />
            Phone: <a href="tel:16092005818" style={{ color: '#1D4ED8' }}>609-200-5818</a>
          </p>
        </Section>

        {/* Template notice */}
        <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#FEF9F0', border: '1px solid #F5E0B8', color: '#7C5E2A' }}>
          <strong>Note:</strong> This policy is a starting template tailored to the Site&rsquo;s current tracking
          (Google Analytics 4, Google Ads, Vercel, and our own first-party self-hosted analytics). Please have it reviewed by qualified legal counsel before relying on
          it, and update it if your data practices change.
        </div>

        <div className="pt-4">
          <Link href="/" style={{ color: '#1D4ED8' }} className="text-sm font-semibold">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
