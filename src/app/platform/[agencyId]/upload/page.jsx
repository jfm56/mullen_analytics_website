'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ColumnPicker from '@/components/ColumnPicker';

const DATA_TYPES = [
  { value: 'dispatch',    label: 'Dispatch / Call Data',         desc: 'CAD exports, incident records, call logs' },
  { value: 'staffing',    label: 'Staffing Data',                desc: 'Shift schedules, roster, unit assignments' },
  { value: 'termination', label: 'Termination / Separation Data',desc: 'Employee separations, attrition records' },
  { value: 'payroll',     label: 'Payroll Data',                 desc: 'Compensation, hours, cost per unit' },
  { value: 'mutual_aid',  label: 'Mutual Aid Data',              desc: 'Mutual aid given/received logs' },
  { value: 'population',  label: 'Population / Municipality',    desc: 'Service area data, census, jurisdictions' },
  { value: 'other',       label: 'Other',                        desc: 'Any other supporting data file' },
];

const ALLOWED = ['.csv', '.xlsx', '.xls', '.pdf', '.json', '.parquet', '.txt'];
const INSPECTABLE_TYPES = ['dispatch', 'staffing'];
const INSPECTABLE_EXTS  = ['.csv', '.xlsx', '.xls'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router        = useRouter();
  const { agencyId }  = useParams();
  const inputRef      = useRef(null);

  const [agency, setAgency]         = useState(null);
  const [files, setFiles]           = useState([]);
  const [queue, setQueue]           = useState([]);
  const [dragging, setDragging]     = useState(false);
  const [fileType, setFileType]     = useState('dispatch');
  const [error, setError]           = useState('');
  const [uploading, setUploading]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [inspecting, setInspecting] = useState(null);   // file id being inspected
  const [inspectMeta, setInspectMeta] = useState(null); // metadata response
  const [inspectLoading, setInspectLoading] = useState(false);
  const [savedMap, setSavedMap]     = useState(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(`column_map:${agencyId}`) || '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    if (!agencyId) return;
    (async () => {
      try {
        const [agRes, filesRes] = await Promise.all([
          fetch(`/api/proxy/agencies/${agencyId}`, { credentials: 'include' }),
          fetch(`/api/proxy/agencies/${agencyId}/files`, { credentials: 'include' }),
        ]);
        if (agRes.status === 401) { router.replace('/portal/login'); return; }
        if (!agRes.ok) { setError('Agency not found.'); setLoading(false); return; }
        setAgency(await agRes.json());
        setFiles(filesRes.ok ? await filesRes.json() : []);
      } catch {
        setError('Failed to load.');
      } finally {
        setLoading(false);
      }
    })();
  }, [agencyId, router]);

  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED.includes(ext)) return `${file.name}: extension not allowed (${ALLOWED.join(', ')})`;
    if (file.size > 500 * 1024 * 1024) return `${file.name}: exceeds 500 MB limit`;
    return null;
  };

  const addToQueue = (fileList) => {
    setError('');
    const incoming = Array.from(fileList);
    const errors   = incoming.map(validateFile).filter(Boolean);
    if (errors.length) { setError(errors.join('\n')); return; }
    setQueue(prev => [
      ...prev,
      ...incoming.map(f => ({ file: f, id: crypto.randomUUID(), status: 'pending', progress: 0 })),
    ]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addToQueue(e.dataTransfer.files);
  };

  const uploadAll = async () => {
    if (queue.length === 0) { setError('No files queued.'); return; }
    setUploading(true);
    setError('');

    for (const item of queue) {
      if (item.status === 'done') continue;

      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q));

      try {
        const body = new FormData();
        body.append('file', item.file);
        body.append('file_type', fileType);

        const res = await fetch(`/api/proxy/agencies/${agencyId}/files`, {
          method: 'POST',
          credentials: 'include',
          body,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Upload failed');
        }

        const record = await res.json();
        setFiles(prev => [record, ...prev]);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done' } : q));
      } catch (err) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: err.message } : q));
      }
    }

    setUploading(false);
  };

  const removeFromQueue = (id) => setQueue(prev => prev.filter(q => q.id !== id));

  const canInspect = (f) => {
    const ext = '.' + (f.original_filename || '').split('.').pop().toLowerCase();
    return INSPECTABLE_TYPES.includes(f.file_type) && INSPECTABLE_EXTS.includes(ext);
  };

  const openInspect = async (f) => {
    if (inspecting === f.id) { setInspecting(null); setInspectMeta(null); return; }
    setInspecting(f.id);
    setInspectMeta(null);
    setInspectLoading(true);
    try {
      const res = await fetch(`/api/proxy/agencies/${agencyId}/files/${f.id}/inspect`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Inspect failed');
      setInspectMeta(await res.json());
    } catch (err) {
      setError(`Column inspection failed: ${err.message}`);
      setInspecting(null);
    } finally {
      setInspectLoading(false);
    }
  };

  const saveColumnMap = (columnMap) => {
    const next = { ...savedMap, ...columnMap };
    setSavedMap(next);
    localStorage.setItem(`column_map:${agencyId}`, JSON.stringify(next));
    setInspecting(null);
    setInspectMeta(null);
  };

  const deleteFile = async (fileId, filename) => {
    if (!confirm(`Delete "${filename}"?`)) return;
    try {
      const res = await fetch(`/api/proxy/agencies/${agencyId}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) setFiles(prev => prev.filter(f => f.id !== fileId));
      else setError('Failed to delete file.');
    } catch {
      setError('Failed to delete file.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href={`/platform/${agencyId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {agency?.agency_name || 'Dashboard'}
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-800">Upload Data</span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">1. Select Data Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DATA_TYPES.map(dt => (
                  <button
                    key={dt.value}
                    onClick={() => setFileType(dt.value)}
                    className={`text-left p-3 rounded-lg border transition-all text-xs ${
                      fileType === dt.value
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-semibold text-gray-800 block mb-0.5">{dt.label}</span>
                    <span className="text-gray-500">{dt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">2. Add Files</h2>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ALLOWED.join(',')}
                  className="hidden"
                  onChange={e => addToQueue(e.target.files)}
                />
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">CSV, XLSX, PDF, JSON, Parquet · Max 500 MB each</p>
              </div>

              {queue.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-700">{queue.length} file{queue.length > 1 ? 's' : ''} queued</p>
                  {queue.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.file.name}</p>
                        <p className="text-gray-400">{formatBytes(item.file.size)}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.status === 'pending'   ? 'bg-gray-100 text-gray-600' :
                        item.status === 'uploading' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'done'      ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status === 'error' ? `Error: ${item.error}` : item.status}
                      </span>
                      {item.status !== 'uploading' && (
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={uploadAll}
                  disabled={uploading || queue.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading…' : `Upload ${queue.length > 0 ? queue.length + ' ' : ''}file${queue.length !== 1 ? 's' : ''}`}
                </button>
                {queue.length > 0 && (
                  <button
                    onClick={() => setQueue([])}
                    disabled={uploading}
                    className="px-4 py-2.5 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Uploaded Files</h2>
                {Object.keys(savedMap).length > 0 && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {Object.keys(savedMap).length} columns mapped
                  </span>
                )}
              </div>
              {files.length === 0 ? (
                <p className="text-xs text-gray-400">No files yet.</p>
              ) : (
                <div className="space-y-2">
                  {files.map(f => (
                    <div key={f.id}>
                      <div className="p-2.5 border border-gray-100 rounded-lg">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-xs font-medium text-gray-800 break-all leading-snug">{f.original_filename}</p>
                          <button
                            onClick={() => deleteFile(f.id, f.original_filename)}
                            className="text-gray-300 hover:text-red-500 shrink-0 ml-1"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                          <span className="capitalize">{f.file_type.replace('_', ' ')}</span>
                          <span>·</span>
                          <span>{f.file_size_bytes ? formatBytes(f.file_size_bytes) : '—'}</span>
                          <span>·</span>
                          <span className={`font-medium ${
                            f.status === 'uploaded' ? 'text-blue-600' :
                            f.status === 'processed' ? 'text-green-600' : 'text-gray-500'
                          }`}>{f.status}</span>
                        </div>
                        {canInspect(f) && (
                          <button
                            onClick={() => openInspect(f)}
                            disabled={inspectLoading && inspecting === f.id}
                            className="mt-1.5 text-[10px] text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            {inspecting === f.id
                              ? (inspectLoading ? 'Loading…' : 'Close picker ↑')
                              : '⚙ Configure columns →'}
                          </button>
                        )}
                      </div>

                      {/* Inline column picker drawer */}
                      {inspecting === f.id && inspectMeta && (
                        <div className="mt-2">
                          <ColumnPicker
                            metadata={inspectMeta}
                            onSave={saveColumnMap}
                            onClose={() => { setInspecting(null); setInspectMeta(null); }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">Security Notice</p>
              <p>Files are stored in an isolated, agency-only folder. No other agency can access your data.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
