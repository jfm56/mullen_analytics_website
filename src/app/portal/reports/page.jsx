'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';

export default function PortalReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const unreadMessages = useUnreadMessagesCount();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
        return;
      }
      setUser(session.user);
      try {
        const res = await fetch('/api/portal/reports');
        const data = await res.json();
        setReports(data.reports || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    init();
  }, [router]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Loading your reports...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboards &amp; deliverables</h1>
          <p className="text-gray-600 text-sm mt-1">
            Access dashboards, reports, and other project deliverables shared with you.
          </p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 bg-[var(--brand-primary)]/5 rounded-t-md">
        <nav className="flex flex-wrap gap-4 text-xs px-4 pt-3 items-center">
          <a
            href="/portal"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Home
          </a>
          <a
            href="/portal/uploads"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Upload data
          </a>
          <a
            href="/portal/invoices"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            View &amp; pay invoices
          </a>
          <a
            href="/portal/reports"
            className="inline-flex items-center rounded-t-md bg-[var(--brand-primary)] text-white px-3 pb-2 border-b-2 border-[var(--brand-primary)]"
          >
            Dashboards &amp; deliverables
          </a>
          <a
            href="/portal/messages"
            className="ml-auto inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            <span>Messages</span>
            {unreadMessages > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] w-4 h-4">
                {unreadMessages}
              </span>
            )}
          </a>
        </nav>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-gray-600">No reports available yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border rounded-lg p-4 bg-white hover:shadow-sm text-sm"
            >
              <div className="font-semibold mb-1">{r.title}</div>
              {r.description && <div className="text-xs text-gray-600">{r.description}</div>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
