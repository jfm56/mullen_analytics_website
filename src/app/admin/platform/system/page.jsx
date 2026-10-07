'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, CircleSlash } from 'lucide-react';
import { platformAdmin } from '@/lib/api';

const STATUS = {
  enabled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disabled: 'bg-slate-50 text-slate-500 border-slate-200',
  unwired: 'bg-amber-50 text-amber-700 border-amber-200',
  unimplemented: 'bg-amber-50 text-amber-700 border-amber-200',
  disconnected: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function SystemPage() {
  const [h, setH] = useState(null);
  const [f, setF] = useState(null);
  useEffect(() => {
    platformAdmin.health().then(setH).catch(() => {});
    platformAdmin.features().then(setF).catch(() => {});
  }, []);
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-gray-900 mb-1">System & Feature Status</h1>
      <p className="text-sm text-gray-500 mb-5">Health and feature flags. Status only — modules are never auto-enabled here; no secrets exposed.</p>

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">System health</div>
          {!h ? <div className="text-gray-400 text-sm">Loading…</div> : (
            <ul className="text-sm space-y-1">
              {[['Application', h.application], ['Database', h.database], ['Environment', h.environment], ['Auth mode', h.auth_mode], ['EMSCS QA flag', String(h.emscs_qa_v1_enabled)], ['Backup verification', h.backup_verification]].map(([k, v]) => (
                <li key={k} className="flex justify-between border-b py-1">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-900 inline-flex items-center gap-1">
                    {v === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {v === 'error' && <XCircle className="w-4 h-4 text-rose-600" />}
                    {v}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">Feature status</div>
          {!f ? <div className="text-gray-400 text-sm">Loading…</div> : (
            <ul className="space-y-2">
              {f.features.map((x) => (
                <li key={x.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-800">{x.key}<span className="block text-[11px] text-gray-400">{x.note}</span></span>
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${STATUS[x.status] || 'bg-gray-50'}`}>{x.status}</span>
                </li>
              ))}
            </ul>
          )}
          {f && <div className="text-[11px] text-gray-400 mt-2 inline-flex items-center gap-1"><CircleSlash className="w-3 h-3" /> {f.note}</div>}
        </div>
      </div>
    </div>
  );
}
