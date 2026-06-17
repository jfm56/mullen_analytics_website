'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, RefreshCw, AlertTriangle, Lightbulb, CheckCircle2, Info, ChevronDown, ChevronUp,
} from 'lucide-react';

async function apiFetch(path) {
  const res = await fetch(`/api/proxy${path}`, { credentials: 'include' });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
  return res.json();
}

const PRIORITY = {
  high:   { label: 'High',   cls: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  low:    { label: 'Low',    cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function Shell({ children }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/40 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" /> AI Insights
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Executive interpretation of your data — what matters, what it means, what to do</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AiInsights({ uploadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showData, setShowData] = useState(false);

  const load = useCallback((refresh = false) => {
    if (!uploadId) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    apiFetch(`/data/uploads/${uploadId}/ai-insights${refresh ? '?refresh=true' : ''}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [uploadId]);

  useEffect(() => { setData(null); load(false); }, [uploadId, load]);

  if (loading) return (
    <Shell>
      <div className="p-5 animate-pulse space-y-3">
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-50 rounded" />
        <div className="h-3 w-5/6 bg-gray-50 rounded" />
        <div className="h-20 bg-gray-50 rounded" />
      </div>
    </Shell>
  );

  if (error) return (
    <Shell>
      <div className="p-5 flex items-start gap-2 text-sm text-red-600">
        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" /> {error}
      </div>
    </Shell>
  );

  // Gracefully off (no API key) or not enough data.
  if (!data?.available) {
    return (
      <Shell>
        <div className="p-5">
          <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 px-4 py-3 text-sm text-gray-600 flex items-start gap-2">
            <Info size={15} className="mt-0.5 flex-shrink-0 text-violet-500" />
            <span>
              {data?.reason || 'AI interpretation is unavailable.'}
              {data?.key_missing && (
                <span className="block text-xs text-gray-400 mt-1">
                  Once enabled, this card auto-summarizes your call volume, response times, staffing, and transfer outlook into a leadership-ready read.
                </span>
              )}
            </span>
          </div>
        </div>
      </Shell>
    );
  }

  const p = data.generated_for || {};
  const recs = data.recommendations || [];

  return (
    <Shell>
      <div className="px-5 pt-3 -mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-gray-400">
          {p.start && p.end ? `${p.start} → ${p.end}` : 'Current data'}
          {p.days_of_history ? ` · ${p.days_of_history} days` : ''}
          {data.cached ? ' · cached' : ''}
        </p>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Headline */}
        {data.headline && (
          <p className="text-[15px] font-semibold text-gray-900 leading-snug">{data.headline}</p>
        )}

        {/* Key findings */}
        {data.key_findings?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">What's important</p>
            <ul className="space-y-1.5">
              {data.key_findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-violet-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What it means */}
        {data.what_it_means && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">What it means</p>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/70 border rounded-lg px-3 py-2.5">
              {data.what_it_means}
            </p>
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
              <Lightbulb size={13} className="text-amber-500" /> Recommendations
            </p>
            <div className="space-y-2">
              {recs.map((r, i) => {
                const pr = PRIORITY[(r.priority || 'medium').toLowerCase()] || PRIORITY.medium;
                return (
                  <div key={i} className="border rounded-lg px-3 py-2.5 flex items-start gap-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 flex-shrink-0 ${pr.cls}`}>
                      {pr.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.action}</p>
                      {r.rationale && <p className="text-xs text-gray-500 mt-0.5">{r.rationale}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transparency / reproducibility */}
        {data.grounded_summary && (
          <div className="pt-1">
            <button
              onClick={() => setShowData((s) => !s)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
            >
              {showData ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showData ? 'Hide' : 'Show'} the figures the AI read (same numbers as this dashboard)
            </button>
            {showData && (
              <pre className="mt-2 text-[10px] leading-relaxed text-gray-500 bg-gray-50 border rounded-lg p-3 overflow-x-auto max-h-72">
                {JSON.stringify(data.grounded_summary, null, 2)}
              </pre>
            )}
          </div>
        )}

        <p className="text-[11px] text-gray-400 border-t pt-3 flex items-center gap-1.5">
          <Sparkles size={11} className="text-violet-400" />
          AI-generated decision support from your own data ({data.model}). Verify against agency context before acting.
        </p>
      </div>
    </Shell>
  );
}
