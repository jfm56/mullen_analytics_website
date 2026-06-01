'use client';
import { useState, useEffect } from 'react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/proxy/messages/admin', { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        const d = await r.json();
        setMessages(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Messages</h2>
        <p className="text-sm text-gray-500 mt-0.5">Client communication inbox</p>
      </div>
      <ErrorAlert message={error} onDismiss={() => setError('')} />
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? <div className="p-4"><SkeletonTable /></div> : messages.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No messages yet.</div>
        ) : (
          <div className="divide-y">
            {messages.map(m => (
              <div key={m.id} className={`p-4 hover:bg-gray-50 ${!m.read_at ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.sender_name || m.sender_id}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{m.content}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
