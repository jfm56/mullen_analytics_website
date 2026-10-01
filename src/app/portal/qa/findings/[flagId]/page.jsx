'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useQaAgency, qaGet, qaSend, Badge, SEVERITY_TONE, STATUS_TONE, QaUnavailable, canDecide,
} from '@/lib/qa';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { fmtDateTime } from '@/lib/datetime';

const SEVERITIES = ['Critical', 'High', 'Moderate', 'Low'];
const DECISIONS = ['approve', 'edit', 'reject', 'dismiss'];

function splitPolicyReference(s) {
  const idx = s.indexOf(' — ');
  if (idx === -1) return { title: s, excerpt: null };
  return { title: s.slice(0, idx), excerpt: s.slice(idx + 3).trim() || null };
}

function Section({ title, hint, children }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export default function QaFlagDetailPage() {
  const { flagId } = useParams();
  const { agency, loading: agencyLoading, error: agencyError } = useQaAgency();
  const [flag, setFlag] = useState(null);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState('approve');
  const [reason, setReason] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSeverity, setEditedSeverity] = useState('Moderate');
  const [editedComment, setEditedComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const refresh = useCallback(async () => {
    if (!agency) return;
    try {
      const f = await qaGet(`/agencies/${agency.id}/flags/${flagId}`);
      setFlag(f);
      setEditedTitle(f.title);
      setEditedSeverity(f.severity);
      setEditedComment(f.suggested_crew_comment || '');
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [agency, flagId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function submitDecision() {
    setSubmitting(true);
    setSubmitError('');
    try {
      await qaSend(`/agencies/${agency.id}/flags/${flagId}/decisions`, {
        body: {
          decision,
          reason: reason || undefined,
          edited_title: decision === 'edit' ? editedTitle : undefined,
          edited_severity: decision === 'edit' ? editedSeverity : undefined,
          edited_crew_comment: decision === 'edit' ? editedComment : undefined,
        },
      });
      setReason('');
      await refresh();
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (agencyLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  if (agencyError || !agency) return <QaUnavailable error={agencyError} />;

  return (
    <div className="max-w-4xl">
      <Link href="/portal/qa/findings" className="text-sm text-blue-600 hover:underline">← Back to findings</Link>
      <div className="mt-3" />
      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {!flag ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">{flag.title}</h2>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge tone={SEVERITY_TONE[flag.severity]}>{flag.severity}</Badge>
              <Badge tone={STATUS_TONE[flag.status]}>{flag.status}</Badge>
              <Badge>{flag.category}</Badge>
              <Badge>confidence {Math.round(parseFloat(flag.confidence) * 100)}%</Badge>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mt-4">
              <div><dt className="text-gray-400">Source</dt><dd className="text-gray-900">{flag.source}</dd></div>
              <div><dt className="text-gray-400">Rule</dt><dd className="text-gray-900 font-mono text-xs">{flag.rule_id}</dd></div>
              <div><dt className="text-gray-400">Chart external ID</dt><dd className="text-gray-900 font-mono text-xs">{flag.chart_external_id ?? '—'}</dd></div>
              <div><dt className="text-gray-400">Unit / call type</dt><dd className="text-gray-900">{flag.chart_unit ?? '—'}{flag.chart_call_type && ` · ${flag.chart_call_type}`}</dd></div>
            </dl>
          </div>

          <Section title="What the rule saw">{flag.chart_evidence}</Section>
          <Section title="Why it matters">{flag.why_it_matters}</Section>

          {flag.policy_reference && (() => {
            const { title, excerpt } = splitPolicyReference(flag.policy_reference);
            return (
              <div className="bg-white border rounded-xl shadow-sm p-6 border-l-4 border-l-violet-400">
                <h3 className="text-sm font-semibold text-gray-900">Cited agency policy</h3>
                <p className="text-sm font-medium text-gray-900 mt-2">{title}</p>
                {excerpt && <blockquote className="border-l-2 border-gray-200 pl-3 text-sm text-gray-600 italic whitespace-pre-wrap mt-2">{excerpt}</blockquote>}
              </div>
            );
          })()}

          <Section title="Suggested reviewer action">{flag.suggested_reviewer_action}</Section>
          <Section title="Suggested crew comment" hint="Sent to the crew only after approval. Editable when you choose edit below.">
            {flag.suggested_crew_comment}
          </Section>

          {flag.status === 'pending' && canDecide(agency.role) && (
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Reviewer decision</h3>
              <div className="flex gap-2 flex-wrap">
                {DECISIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDecision(d)}
                    className={`px-3 py-1.5 text-sm rounded-lg border capitalize ${
                      decision === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {decision === 'edit' && (
                <div className="space-y-3 border-t mt-4 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                    <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                    <select value={editedSeverity} onChange={(e) => setEditedSeverity(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Crew comment</label>
                    <textarea value={editedComment} onChange={(e) => setEditedComment(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason (optional, audit-only)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why you made this decision" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>

              {submitError && <p className="text-sm text-red-600 mt-2">{submitError}</p>}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={submitDecision}
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-[var(--brand-primary)] hover:opacity-90 disabled:opacity-50 capitalize"
                >
                  {submitting ? 'Submitting…' : `Submit ${decision}`}
                </button>
              </div>
            </div>
          )}

          {flag.status === 'pending' && !canDecide(agency.role) && (
            <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-500">
              Your role can view findings but not decide them. Only admins and QA reviewers can approve, edit, reject, or dismiss.
            </div>
          )}

          <div className="bg-white border rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Decision history</h3>
            {(flag.decisions || []).length === 0 ? (
              <p className="text-sm text-gray-400">No decisions yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {flag.decisions.map((d) => (
                  <li key={d.id} className="border-l-2 border-gray-200 pl-3">
                    <p>
                      <span className="font-medium text-gray-900">{d.decision}</span>
                      <span className="text-gray-400 ml-2">{fmtDateTime(d.decided_at)}</span>
                    </p>
                    {d.reason && <p className="text-gray-600 mt-1">{d.reason}</p>}
                    {(d.edited_title || d.edited_severity || d.edited_crew_comment) && (
                      <p className="text-gray-400 mt-1 text-xs">
                        Edited: {d.edited_title && 'title '}
                        {d.edited_severity && `severity→${d.edited_severity} `}
                        {d.edited_crew_comment && 'comment '}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
