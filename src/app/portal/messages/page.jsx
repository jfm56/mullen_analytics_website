'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function PortalMessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const allSelected = selectedIds.length > 0 && selectedIds.length === messages.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
  };

  const handleReadAll = () => {
    if (selectedIds.length === 0) return;
    const markRead = async () => {
      try {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('messages')
          .update({ read_at: now })
          .in('id', selectedIds);

        if (updateError) {
          // eslint-disable-next-line no-console
          console.error('Error marking messages read', updateError);
          setError('Failed to mark messages as read.');
          return;
        }

        setMessages((prev) =>
          prev.map((m) =>
            selectedIds.includes(m.id) ? { ...m, read_at: now } : m
          )
        );
        setSelectedIds([]);
      } catch (e) {
        setError(e.message || 'Failed to mark messages as read.');
      }
    };

    void markRead();
  };

  const handleDeleteAll = () => {
    if (selectedIds.length === 0) return;
    const deleteSelected = async () => {
      try {
        const { error: deleteError } = await supabase
          .from('messages')
          .delete()
          .in('id', selectedIds);

        if (deleteError) {
          // eslint-disable-next-line no-console
          console.error('Error deleting messages', deleteError);
          setError('Failed to delete messages.');
          return;
        }

        setMessages((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
        setSelectedIds([]);
      } catch (e) {
        setError(e.message || 'Failed to delete messages.');
      }
    };

    void deleteSelected();
  };

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

      const { data, error: messagesError } = await supabase
        .from('messages')
        .select('id, from_name, subject, body, created_at, read_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (messagesError) {
        // eslint-disable-next-line no-console
        console.error('Error loading messages', messagesError);
        setError('Failed to load messages.');
      } else {
        setMessages(data || []);
      }

      setLoading(false);
    };

    init();
  }, [router]);

  if (!user || loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Loading your messages...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-gray-600 text-sm mt-1">
            This is where updates from Mullen Analytics &amp; AI Consulting LLC will appear about your project.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50"
          >
            {allSelected ? 'Clear selection' : 'Select all'}
          </button>
          <button
            type="button"
            onClick={handleReadAll}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark selected read
          </button>
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 text-red-600 border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete selected
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
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
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Dashboards &amp; deliverables
          </a>
          <a
            href="/portal/messages"
            className="ml-auto inline-flex items-center rounded-t-md bg-[var(--brand-primary)] text-white px-3 pb-2 border-b-2 border-[var(--brand-primary)]"
          >
            Messages
          </a>
        </nav>
      </div>
      <div className="border rounded-lg bg-white divide-y">
        {messages.map((m) => (
          <div key={m.id} className="px-4 py-3 flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-gray-300"
                  checked={selectedIds.includes(m.id)}
                  onChange={() => toggleSelect(m.id)}
                />
                <span className="font-medium">{m.subject}</span>
                {!m.read_at && (
                  <span className="inline-flex items-center rounded-full bg-red-500/10 text-red-600 text-[10px] px-2 py-0.5 font-semibold">
                    New
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-500">
                {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
              </span>
            </div>
            <div className="text-[11px] text-gray-500">From: {m.from_name || 'Mullen Analytics'}</div>
            <p className="text-xs text-gray-700 mt-1">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
