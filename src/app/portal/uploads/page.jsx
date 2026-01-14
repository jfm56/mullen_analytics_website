'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';

export default function PortalUploadsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const unreadMessages = useUnreadMessagesCount();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
      } else {
        setUser(session.user);
      }
    };

    checkSession();
  }, [router]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setStatus('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch('/api/portal/upload', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setStatus('File uploaded successfully.');
    } catch (err) {
      setStatus(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Checking your session...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload data</h1>
          <p className="text-gray-600 text-sm mt-1">
            Upload CSVs, exports, or other files for analysis. Files are stored securely in our infrastructure.
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
            className="inline-flex items-center rounded-t-md bg-[var(--brand-primary)] text-white px-3 pb-2 border-b-2 border-[var(--brand-primary)]"
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
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
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
      <form onSubmit={handleUpload} className="space-y-4 border rounded-lg p-6 bg-white">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm"
        />
        <button
          type="submit"
          disabled={loading || !file}
          className="px-4 py-2 text-sm rounded-md bg-[var(--brand-primary)] text-white disabled:opacity-60"
        >
          {loading ? 'Uploading...' : 'Upload file'}
        </button>
        {status && <p className="text-xs text-gray-700 mt-2">{status}</p>}
      </form>
    </div>
  );
}
