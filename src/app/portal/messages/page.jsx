'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, messages as messagesApi } from '@/lib/api';
import { fmtDateTime } from '@/lib/datetime';
import PortalSectionTabs from '@/components/portal/PortalSectionTabs';

const API_URL = '/api/proxy';

export default function PortalMessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

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
        await messagesApi.markRead(selectedIds);
        
        const now = new Date().toISOString();
        setMessages((prev) =>
          prev.map((m) =>
            selectedIds.includes(m.id) ? { ...m, read_at: now } : m
          )
        );
        setSelectedIds([]);
      } catch (e) {
        console.error('Error marking messages read', e);
        setError('Failed to mark messages as read.');
      }
    };

    void markRead();
  };

  const handleDeleteAll = () => {
    if (selectedIds.length === 0) return;
    const deleteSelected = async () => {
      try {
        await messagesApi.deleteBulk(selectedIds);
        
        setMessages((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
        setSelectedIds([]);
      } catch (e) {
        console.error('Error deleting messages', e);
        setError('Failed to delete messages.');
      }
    };

    void deleteSelected();
  };

  const handleSend = async () => {
    if (!composeBody.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const msg = await messagesApi.contact({ subject: composeSubject.trim() || undefined, body: composeBody.trim() });
      setMessages((prev) => [msg, ...prev]);
      setComposeBody('');
      setComposeSubject('');
    } catch (e) {
      setSendError(e.message || 'Failed to send your message.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const session = await auth.getSession();
        
        if (!session.authenticated) {
          router.replace('/portal/login');
          return;
        }
        
        setUser(session.user);

        // Load messages
        try {
          const data = await messagesApi.list();
          setMessages(data || []);
        } catch (e) {
          console.error('Error loading messages', e);
          setError('Failed to load messages.');
        }

        setLoading(false);
      } catch (err) {
        router.replace('/portal/login');
      }
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
      <PortalSectionTabs active="messages" />

      {/* Compose — message the Mullen Analytics team */}
      <div className="border rounded-lg bg-white p-4 my-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">Send a message to Mullen Analytics</p>
        <input
          type="text"
          value={composeSubject}
          onChange={(e) => setComposeSubject(e.target.value)}
          placeholder="Subject (optional)"
          className="w-full border rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          value={composeBody}
          onChange={(e) => setComposeBody(e.target.value)}
          placeholder="Type your message to the Mullen Analytics team…"
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {sendError && <p className="text-xs text-red-600 mt-1">{sendError}</p>}
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !composeBody.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </div>

      <div className="border rounded-lg bg-white divide-y">
        {messages.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No messages yet — send one above to start the conversation.</p>
        )}
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
                {m.created_at ? fmtDateTime(m.created_at) : ''}
              </span>
            </div>
            <div className="text-[11px] text-gray-500">
              {m.direction === 'inbound' ? 'You → Mullen Analytics' : `From: ${m.from_name || 'Mullen Analytics'}`}
            </div>
            <p className="text-xs text-gray-700 mt-1">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
