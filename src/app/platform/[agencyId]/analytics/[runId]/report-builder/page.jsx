'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API = (path) => `/api/proxy${path}`;

async function apiFetch(path, opts = {}) {
  const r = await fetch(API(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail || r.statusText);
  }
  return r.json();
}

const CATEGORY_LABELS = { dispatch: 'Dispatch / CAD', staffing: 'Staffing', financial: 'Financial' };
const CATEGORY_ORDER  = ['dispatch', 'staffing', 'financial'];

function SectionCard({ sec, onRemove, onDraft, onTextChange, onHeadingChange, draftingId }) {
  const [text, setText]       = useState(sec.text || '');
  const [heading, setHeading] = useState(sec.heading);
  const isDrafting = draftingId === sec.uid;

  const handleDraft = useCallback(async () => {
    const draft = await onDraft(sec.id, sec.uid);
    if (draft) {
      setText(draft);
      onTextChange(sec.uid, draft);
    }
  }, [onDraft, onTextChange, sec.id, sec.uid]);

  const handleHeadingChange = useCallback((e) => {
    setHeading(e.target.value);
    onHeadingChange(sec.uid, e.target.value);
  }, [onHeadingChange, sec.uid]);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    onTextChange(sec.uid, e.target.value);
  }, [onTextChange, sec.uid]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <input
            className="text-base font-semibold text-gray-900 bg-transparent border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-400 w-full"
            value={heading}
            onChange={handleHeadingChange}
          />
          <p className="text-xs text-gray-400 mt-0.5">{CATEGORY_LABELS[sec.category] || sec.category}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {sec.draftingAvailable && (
            <button
              onClick={handleDraft}
              disabled={isDrafting}
              className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-wait font-medium"
            >
              {isDrafting ? 'Drafting…' : '✦ Draft with AI'}
            </button>
          )}
          <button
            onClick={() => onRemove(sec.uid)}
            className="text-gray-300 hover:text-red-400 text-lg leading-none"
            title="Remove section"
          >×</button>
        </div>
      </div>

      {sec.summary && <SectionSummaryChip summary={sec.summary} sectionId={sec.id} />}

      <textarea
        className="mt-3 w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-y min-h-[80px]"
        placeholder="Write or edit descriptive text here. Click '✦ Draft with AI' to generate a starting draft."
        value={text}
        onChange={handleTextChange}
      />
    </div>
  );
}

function SectionSummaryChip({ summary, sectionId }) {
  const chips = [];

  if (sectionId === 'nfpa_compliance') {
    chips.push(`P90 ${summary.p90_fmt ?? '—'}`);
    chips.push(`Target ${summary.target_fmt ?? '—'}`);
    chips.push(summary.compliant ? '✓ Pass' : '✗ Fail');
    if (summary.pct_within != null) chips.push(`${summary.pct_within}% within target`);
  } else if (sectionId === 'response_time_intervals') {
    chips.push(`Travel P90 ${summary.travel?.p90_fmt ?? '—'}`);
    chips.push(`Total P90 ${summary.total_response?.p90_fmt ?? '—'}`);
  } else if (sectionId === 'call_volume_by_type') {
    chips.push(`${summary.total_calls?.toLocaleString() ?? '—'} calls`);
    chips.push(`${summary.distinct_types} types`);
    if (summary.top_types?.[0]) chips.push(`Top: ${summary.top_types[0].label} (${summary.top_types[0].value})`);
  } else if (sectionId === 'hour_of_day') {
    chips.push(`Peak hour ${summary.peak_hour}:00`);
    chips.push(`Business hrs ${summary.business_pct}%`);
  } else if (sectionId === 'day_of_week') {
    chips.push(`Peak day ${summary.peak_day}`);
    chips.push(`Weekends ${summary.weekend_pct}%`);
  } else if (sectionId === 'monthly_seasonality') {
    chips.push(`Peak ${summary.peak_month}`);
    chips.push(`${summary.peak_above_avg > 0 ? '+' : ''}${summary.peak_above_avg}% vs avg`);
  } else if (sectionId === 'top_units') {
    chips.push(`${summary.total_units} units`);
    if (summary.top_units?.[0]) chips.push(`Top: ${summary.top_units[0].label} (${summary.top_units[0].value})`);
  } else if (sectionId === 'per_unit_compliance') {
    chips.push(`${summary.passing} pass`);
    chips.push(`${summary.failing} fail`);
    chips.push(`Target ${summary.target_fmt}`);
  }

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{c}</span>
      ))}
    </div>
  );
}

let _uidCounter = 0;
function makeUid() { return `sec_${++_uidCounter}_${Date.now()}`; }

export default function ReportBuilderPage() {
  const { agencyId, runId } = useParams();
  const [loading, setLoading]   = useState(true);
  const [meta, setMeta]         = useState(null);
  const [sections, setSections] = useState([]);
  const [title, setTitle]       = useState('EMS Analytics Report');
  const [draftingId, setDraftingId]   = useState(null);
  const [exporting, setExporting]     = useState(false);
  const [error, setError]             = useState(null);

  const updateSectionText = useCallback((uid, newText) => {
    setSections(prev => prev.map(s => s.uid === uid ? { ...s, text: newText } : s));
  }, []);

  const updateSectionHeading = useCallback((uid, newHeading) => {
    setSections(prev => prev.map(s => s.uid === uid ? { ...s, heading: newHeading } : s));
  }, []);

  useEffect(() => {
    apiFetch(`/agencies/${agencyId}/pipeline/runs/${runId}/report-builder/sections`)
      .then(data => {
        setMeta(data);
        if (data.agency_name) setTitle(`${data.agency_name} — EMS Analytics Report`);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [agencyId, runId]);

  const addSection = useCallback((sectionMeta) => {
    if (!sectionMeta.enabled) return;
    setSections(prev => [
      ...prev,
      {
        uid:              makeUid(),
        id:               sectionMeta.id,
        heading:          sectionMeta.label,
        category:         sectionMeta.category,
        summary:          sectionMeta.summary || null,
        text:             '',
        draftingAvailable: meta?.drafting_available && !!sectionMeta.summary,
      },
    ]);
  }, [meta]);

  const removeSection = useCallback((uid) => {
    setSections(prev => prev.filter(s => s.uid !== uid));
  }, []);

  const moveSection = useCallback((uid, dir) => {
    setSections(prev => {
      const idx  = prev.findIndex(s => s.uid === uid);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }, []);

  const handleDraft = useCallback(async (sectionId, uid) => {
    setDraftingId(uid);
    try {
      const data = await apiFetch(
        `/agencies/${agencyId}/pipeline/runs/${runId}/report-builder/draft`,
        { method: 'POST', body: JSON.stringify({ section_id: sectionId }) }
      );
      return data.draft || '';
    } catch (err) {
      alert(`Draft failed: ${err.message}`);
      return null;
    } finally {
      setDraftingId(null);
    }
  }, [agencyId, runId]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    const dateRange = meta
      ? `${meta.date_range_start ?? ''} – ${meta.date_range_end ?? ''}`
      : '';
    const payload = {
      title,
      date_range: dateRange,
      sections: sections.map(s => ({ heading: s.heading || s.id, text: s.text || '' })),
    };
    try {
      const resp = await fetch(
        API(`/agencies/${agencyId}/pipeline/runs/${runId}/report-builder/export-pdf`),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || resp.statusText);
      }
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }, [agencyId, runId, title, sections, meta]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-500">Loading report builder…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
        <p className="text-sm font-semibold text-red-700 mb-2">Failed to load</p>
        <p className="text-xs text-red-600">{error}</p>
        <Link href={`/platform/${agencyId}/analytics/${runId}`} className="mt-4 inline-block text-xs text-blue-600 underline">← Back to report</Link>
      </div>
    </div>
  );

  const byCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: (meta?.sections || []).filter(s => s.category === cat),
  }));

  const inReport = new Set(sections.map(s => s.id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link
            href={`/platform/${agencyId}/analytics/${runId}`}
            className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
          >← Report</Link>
          <input
            className="flex-1 text-base font-semibold text-gray-900 bg-transparent border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-400"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <div className="flex items-center gap-2 shrink-0">
            {!meta?.pdf_available && (
              <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                pip install fpdf2 for PDF
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={exporting || sections.length === 0 || !meta?.pdf_available}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {exporting ? 'Exporting…' : '↓ Export PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">

        {/* Left: Section picker */}
        <div className="w-64 shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-16">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Sections</p>
            {byCategory.map(({ cat, label, items }) => (
              <div key={cat} className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
                <div className="space-y-1">
                  {items.map(sec => {
                    const added    = inReport.has(sec.id);
                    const disabled = !sec.enabled;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => addSection(sec)}
                        disabled={disabled}
                        title={disabled ? (sec.disabled_reason || 'Not available') : (added ? 'Already added — click to add again' : 'Add to report')}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                          disabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : added
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="mr-1">{disabled ? '○' : added ? '●' : '+'}</span>
                        {sec.label}
                        {disabled && (
                          <span className="block text-[9px] text-gray-300 mt-0.5 leading-tight">{sec.disabled_reason}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!meta?.drafting_available && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-[10px] text-yellow-700 font-semibold">AI drafting disabled</p>
                <p className="text-[10px] text-yellow-600 mt-0.5">Set ANTHROPIC_API_KEY in backend/.env</p>
              </div>
            )}
          </div>
        </div>

        {/* Center: Assembled report */}
        <div className="flex-1 min-w-0">
          {sections.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-sm font-medium">Your report is empty</p>
              <p className="text-gray-400 text-xs mt-1">Click sections on the left to add them</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((sec, idx) => (
                <div key={sec.uid} className="relative group">
                  {/* Reorder controls */}
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveSection(sec.uid, -1)}
                      disabled={idx === 0}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-sm leading-none"
                    >↑</button>
                    <button
                      onClick={() => moveSection(sec.uid, 1)}
                      disabled={idx === sections.length - 1}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-sm leading-none"
                    >↓</button>
                  </div>
                  <SectionCard
                    sec={sec}
                    onRemove={removeSection}
                    onDraft={handleDraft}
                    onTextChange={updateSectionText}
                    onHeadingChange={updateSectionHeading}
                    draftingId={draftingId}
                  />
                </div>
              ))}

              <div className="pt-2 pb-8">
                <button
                  onClick={handleExport}
                  disabled={exporting || !meta?.pdf_available}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  {exporting ? 'Exporting…' : `↓ Export ${sections.length}-section report as PDF`}
                </button>
                {!meta?.pdf_available && (
                  <p className="text-center text-xs text-orange-600 mt-2">
                    Run <code className="bg-orange-50 px-1 rounded">pip install fpdf2</code> in the backend to enable PDF export
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
