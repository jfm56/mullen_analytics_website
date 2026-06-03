'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, Flag, Send } from 'lucide-react';
import { auth, feedback as feedbackApi } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

const TYPE_META = {
  recommendation: { label: 'Recommendation', Icon: Lightbulb, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  issue:          { label: 'Issue',          Icon: Flag,      cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function PortalFeedbackPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [type, setType] = useState('recommendation');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await feedbackApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e.message || 'Failed to load your submissions.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await auth.getSession();
        if (!s.authenticated) { router.replace('/portal/login'); return; }
        await load();
      } catch {
        router.replace('/portal/login');
      } finally {
        setReady(true);
      }
    })();
  }, [router, load]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(''); setSuccess('');
    if (!title.trim() || !body.trim()) { setFormError('Please add a title and some details.'); return; }
    setSubmitting(true);
    try {
      await feedbackApi.create({ type, title: title.trim(), body: body.trim() });
      setTitle(''); setBody(''); setType('recommendation');
      setSuccess('Thanks! Your submission was sent to the Mullen Analytics team.');
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setFormError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this submission?')) return;
    try {
      await feedbackApi.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setLoadError(e.message || 'Failed to delete.');
    }
  };

  if (!ready) {
    return <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-500 text-sm">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Recommendations &amp; Issues</h1>
        <p className="text-gray-600 text-sm mt-1">
          Share an idea to improve your dashboards, or report a problem. We review every submission.
        </p>
      </div>

      {/* Submit form */}
      <form onSubmit={submit} className="bg-white border rounded-xl shadow-sm p-5 mb-8">
        <div className="flex gap-2 mb-4">
          {Object.entries(TYPE_META).map(([key, m]) => {
            const active = type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                aria-pressed={active}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? m.cls : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                <m.Icon size={16} /> {m.label}
              </button>
            );
          })}
        </div>

        <label htmlFor="fb-title" className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
        <input
          id="fb-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          placeholder={type === 'issue' ? 'e.g. Response-time chart shows wrong totals' : 'e.g. Add a monthly call-volume comparison'}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors mb-4"
        />

        <label htmlFor="fb-body" className="block text-sm font-medium text-gray-700 mb-1.5">Details</label>
        <textarea
          id="fb-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder={type === 'issue' ? 'What happened, what did you expect, and where in the app?' : 'Describe your idea and how it would help your team.'}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors mb-4"
        />

        {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
        {success && (
          <p className="text-sm rounded-md px-3 py-2 mb-3" style={{ color: '#15803D', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
          style={{ backgroundColor: '#1D4ED8' }}
          onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#2563EB'; }}
          onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
        >
          <Send size={15} /> {submitting ? 'Sending…' : 'Submit'}
        </button>
      </form>

      {/* Submissions list */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Your submissions ({items.length})</h2>
      {loadError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{loadError}</div>}
      {items.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <Lightbulb size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No submissions yet. Share your first recommendation or report an issue above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const m = TYPE_META[item.type] || TYPE_META.recommendation;
            return (
              <div key={item.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${m.cls}`}>
                        <m.Icon size={11} /> {m.label}
                      </span>
                      <StatusBadge status={item.status} type="feedback" />
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{item.body}</p>
                  </div>
                  <button onClick={() => remove(item.id)} className="text-xs text-gray-400 hover:text-red-600 flex-shrink-0">Delete</button>
                </div>
                {item.admin_response && (
                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Response from Mullen Analytics</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.admin_response}</p>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
