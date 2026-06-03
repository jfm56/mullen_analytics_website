'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, RefreshCw, AlertTriangle, BarChart2, ArrowRight } from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';

export default function PortalDatasetsPage() {
  const router = useRouter();
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/datasets/portal', { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proxy/auth/session', { credentials: 'include' });
        const s   = await res.json();
        if (!s.authenticated) { router.replace('/portal/login'); return; }
        load();
      } catch { router.replace('/portal/login'); }
    })();
  }, [router, load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      <RefreshCw size={16} className="animate-spin mr-2" /> Loading datasets…
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Database size={20} /> My Datasets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Multi-year EMSCharts uploads grouped for year-over-year comparison.
          </p>
        </div>
        <button onClick={load} className="p-2 border rounded-lg bg-white hover:bg-gray-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {groups.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center text-gray-400 text-sm space-y-2">
          <Database size={28} className="mx-auto opacity-30" />
          <p>No dataset groups yet.</p>
          <p className="text-xs">Your Mullen Analytics team will create a dataset group when your first EMSCharts export is uploaded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(g => {
            const canCompare = (g.cleaned_years?.length || 0) >= 2;
            return (
              <div key={g.id} className="bg-white border rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{g.name}</h2>
                    {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {canCompare && (
                      <Link
                        href={`/portal/dashboards/year-over-year/${g.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <BarChart2 size={15} /> Compare Years <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Year coverage */}
                {(g.uploaded_years?.length > 0 || g.missing_years?.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const start = g.start_year || g.uploaded_years?.[0];
                      const end   = g.end_year   || g.uploaded_years?.[g.uploaded_years.length - 1];
                      if (!start || !end) return null;
                      return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(y => {
                        const status = g.cleaned_years?.includes(y) ? 'cleaned'
                                     : g.uploaded_years?.includes(y) ? 'uploaded'
                                     : 'missing';
                        return (
                          <div key={y} className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium ${
                            status === 'cleaned'  ? 'bg-green-50 text-green-700 border-green-200' :
                            status === 'uploaded' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-gray-50 text-gray-400 border-gray-200 border-dashed'
                          }`}>
                            <span>{y}</span>
                            <span className="text-[9px] mt-0.5 capitalize">{status}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {g.missing_years?.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle size={13} />
                    Missing {g.missing_years.join(', ')} — contact your Mullen Analytics representative to upload the missing year{g.missing_years.length > 1 ? 's' : ''}.
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400 pt-1 border-t">
                  <span>{g.upload_count} upload{g.upload_count !== 1 ? 's' : ''}</span>
                  <span>{g.cleaned_years?.length || 0} year{(g.cleaned_years?.length || 0) !== 1 ? 's' : ''} ready</span>
                  <span className={`capitalize ${g.status === 'active' ? 'text-green-600' : ''}`}>{g.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
