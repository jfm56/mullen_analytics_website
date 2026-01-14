'use client';

import { useState } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = () => setOpen((v) => !v);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const newMessages = [...messages, { role: 'user', content: input.trim() }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      });

      const data = await res.json();
      if (data?.assistantMessage) {
        setMessages((prev) => [...prev, data.assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I was not able to respond. Please try again or contact us directly.' },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'There was a problem reaching the assistant. Please call 609-200-5818 or email jmullen@mullenanalytics.com.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-3 w-80 max-h-[70vh] rounded-lg shadow-xl bg-white flex flex-col border border-gray-200">
          <div className="px-3 py-2 border-b bg-[var(--brand-primary)] text-white flex items-center justify-between text-sm">
            <span>Mullen Analytics Assistant</span>
            <button onClick={toggle} className="text-white/80 hover:text-white text-xs" aria-label="Close chat">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
            {messages.length === 0 && (
              <p className="text-gray-500 text-sm">
                Hi! I&apos;m the assistant for Mullen Analytics &amp; AI Consulting LLC. I can answer questions about our
                services, industries we support, and how to get in touch or schedule a call.
              </p>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-lg bg-[var(--brand-primary)] text-white px-3 py-2'
                    : 'mr-auto max-w-[85%] rounded-lg bg-gray-100 text-gray-900 px-3 py-2'
                }
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto max-w-[85%] rounded-lg bg-gray-100 text-gray-500 px-3 py-2 text-xs">
                Thinking...
              </div>
            )}
          </div>
          <div className="border-t p-2 flex items-center gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 resize-none border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              rows={1}
              placeholder="Ask a question..."
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="px-3 py-1 text-sm rounded-md bg-[var(--brand-primary)] text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        className="w-12 h-12 rounded-full bg-[var(--brand-primary)] text-white shadow-lg flex items-center justify-center text-xl"
        aria-label="Open chat assistant"
      >
        💬
      </button>
    </div>
  );
}
