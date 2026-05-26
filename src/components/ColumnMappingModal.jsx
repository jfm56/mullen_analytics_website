'use client';
import { useState, useEffect, useCallback } from 'react';
import { columnMapping as api } from '../lib/api';

const NOT_AVAILABLE = '__none__';

export default function ColumnMappingModal({ uploadId, onClose, onSaved }) {
  const [fields, setFields]     = useState([]);
  const [columns, setColumns]   = useState([]);
  const [draft, setDraft]       = useState({});
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError]       = useState(null);

  // Load current mapping + available columns
  useEffect(() => {
    if (!uploadId) return;
    setLoading(true);
    api.get(uploadId)
      .then(data => {
        setFields(data.analytics_fields || []);
        setColumns(data.available_columns || []);
        const d = {};
        (data.analytics_fields || []).forEach(f => {
          d[f.field] = f.mapped || NOT_AVAILABLE;
        });
        setDraft(d);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [uploadId]);

  const handleAutoDetect = useCallback(async () => {
    try {
      const data = await api.autoDetect(uploadId);
      const d = { ...draft };
      Object.entries(data.mapping || {}).forEach(([field, col]) => {
        d[field] = col || NOT_AVAILABLE;
      });
      setDraft(d);
    } catch (e) {
      setError(String(e));
    }
  }, [uploadId, draft]);

  const handlePreview = useCallback(async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const mappingToSend = {};
      Object.entries(draft).forEach(([f, v]) => {
        mappingToSend[f] = v === NOT_AVAILABLE ? null : v;
      });
      const data = await api.preview(uploadId, mappingToSend);
      setPreview(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setPreviewing(false);
    }
  }, [uploadId, draft]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const mappingToSend = {};
      Object.entries(draft).forEach(([f, v]) => {
        mappingToSend[f] = v === NOT_AVAILABLE ? null : v;
      });
      await api.save(uploadId, mappingToSend);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, [uploadId, draft, onSaved, onClose]);

  const handleReset = useCallback(async () => {
    if (!confirm('Reset all column mappings? Dashboard will use auto-detection only.')) return;
    try {
      await api.reset(uploadId);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(String(e));
    }
  }, [uploadId, onSaved, onClose]);

  // ── Keyboard close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl text-sm text-gray-500">Loading columns…</div>
      </div>
    );
  }

  const rt = preview?.response_times;
  const cv = preview?.call_volume;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Set Analytics Fields</h2>
            <p className="text-xs text-gray-500 mt-0.5">Map your CSV columns to analytics fields for accurate calculations.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">×</button>
        </div>

        {error && (
          <div className="mx-6 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Field dropdowns */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-3">
            {fields.map(({ field, label }) => (
              <div key={field} className="flex items-center gap-3">
                <label className="w-44 shrink-0 text-xs font-medium text-gray-700">{label}</label>
                <select
                  value={draft[field] ?? NOT_AVAILABLE}
                  onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={NOT_AVAILABLE}>— Not Available —</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                {draft[field] && draft[field] !== NOT_AVAILABLE && (
                  <span className="text-[10px] text-green-600 font-medium">✓</span>
                )}
              </div>
            ))}
          </div>

          {/* Preview results */}
          {preview && (
            <div className="mt-5 border rounded-lg p-4 bg-blue-50 text-xs space-y-2">
              <p className="font-semibold text-blue-800 text-sm">Preview Results</p>
              {cv && (
                <div className="flex gap-4">
                  <span className="text-blue-700">
                    <b>Total Calls:</b> {cv.total?.toLocaleString() ?? cv.total_calls?.toLocaleString() ?? '—'}
                    {cv.method && <span className="text-blue-500 ml-1">({cv.method.replace(/_/g, ' ')})</span>}
                  </span>
                </div>
              )}
              {rt?.available ? (
                <div className="flex flex-wrap gap-4 text-blue-700">
                  <span><b>Metric:</b> {rt.metric?.replace(/_/g, ' ')}</span>
                  <span><b>Median:</b> {rt.median_minutes} min</span>
                  <span><b>Mean:</b> {rt.mean_minutes} min</span>
                  <span><b>P90:</b> {rt.p90_minutes} min</span>
                  {rt.dispatch_to_enroute_median != null && <span><b>Dispatch→Enroute:</b> {rt.dispatch_to_enroute_median} min</span>}
                  {rt.enroute_to_arrival_median  != null && <span><b>Enroute→Arrival:</b> {rt.enroute_to_arrival_median} min</span>}
                  {rt.total_call_time_median     != null && <span><b>Total Call Time:</b> {rt.total_call_time_median} min</span>}
                </div>
              ) : (
                rt && <span className="text-orange-600">Response times: {rt.reason}</span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t flex flex-wrap items-center gap-2 shrink-0 bg-gray-50">
          <button
            onClick={handleAutoDetect}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
          >
            Auto-Detect
          </button>
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="px-3 py-1.5 text-xs border border-blue-300 rounded hover:bg-blue-50 text-blue-700 disabled:opacity-50"
          >
            {previewing ? 'Calculating…' : 'Preview Calculations'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 ml-auto"
          >
            Reset Mapping
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving…' : 'Save Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
}
