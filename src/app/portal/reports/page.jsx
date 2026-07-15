'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, dataUploads } from '@/lib/api';
import { fmtDate } from '@/lib/datetime';
import TableauEmbed from '@/components/TableauEmbed';
import EMSDashboard from '@/components/EMSDashboard';
import PortalSectionTabs from '@/components/portal/PortalSectionTabs';

const API_URL = '/api/proxy';

export default function PortalReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [tableauEmbedHtml, setTableauEmbedHtml] = useState('');
  const [tableauEmbedType, setTableauEmbedType] = useState('dashboard');
  const [tableauOpenUrl, setTableauOpenUrl] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [cleanedUploads, setCleanedUploads] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const handleViewDashboard = async (upload) => {
    setDashboardError('');
    setDashboardLoading(true);
    try {
      const data = await dataUploads.getDashboard(upload.id);
      setDashboard({ upload, metrics: data.metrics, generatedAt: data.generated_at });
      setTimeout(() => document.getElementById('ems-dashboard-panel')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setDashboardError(e.message || 'Failed to load dashboard');
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const session = await auth.getSession();
        
        if (!session.authenticated) {
          router.replace('/portal/login');
          return;
        }
        
        setUser(session.user);
        
        // Get Tableau data from profile
        const profile = session.profile;
        if (profile) {
          setTableauEmbedHtml(profile.tableau_embed_html || '');
          setTableauEmbedType(profile.tableau_embed_type || 'dashboard');
          setTableauOpenUrl(profile.tableau_open_url || '');
        }
        
        // Load cleaned uploads for EMS dashboards
        try {
          const res = await fetch(`${API_URL}/data/uploads`, { credentials: 'include' });
          if (res.ok) {
            const all = await res.json();
            setCleanedUploads(all.filter(u => u.upload_status === 'CLEANED'));
          }
        } catch (e) {}

        // Load unread count
        try {
          const { count } = await fetch(`${API_URL}/messages/unread-count`, {
            credentials: 'include',
          }).then(r => r.json());
          setUnreadMessages(count || 0);
        } catch (e) {}
      } catch (err) {
        router.replace('/portal/login');
      }
    };

    init();
  }, [router]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Loading your reports...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboards &amp; deliverables</h1>
          <p className="text-gray-600 text-sm mt-1">
            Access dashboards, reports, and other project deliverables shared with you.
          </p>
        </div>
      </div>

      <PortalSectionTabs active="reports" unread={unreadMessages} />

      {/* EMS Analytics Dashboards */}
      {cleanedUploads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">📊 EMS Analytics Dashboards</h2>
          {dashboardError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{dashboardError}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            {cleanedUploads.map(u => (
              <div key={u.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{u.original_filename}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {u.row_count_cleaned != null ? `${u.row_count_cleaned.toLocaleString()} rows` : ''}
                      {u.created_at ? ` · ${fmtDate(u.created_at)}` : ''}
                    </p>
                  </div>
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ready</span>
                </div>
                <div className="flex gap-2 flex-wrap mt-1">
                  <button
                    onClick={() => handleViewDashboard(u)}
                    disabled={dashboardLoading}
                    className={`text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50 ${
                      dashboard?.upload?.id === u.id
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                  >
                    {dashboardLoading && dashboard?.upload?.id === u.id ? 'Loading…' : '📊 Open Dashboard'}
                  </button>
                  <a
                    href={`/portal/data-explorer/${u.id}`}
                    className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded font-medium"
                  >
                    🔍 Explore Data
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline Dashboard Panel */}
      {dashboard && (
        <div id="ems-dashboard-panel" className="mb-8 bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">📊 EMS Analytics Dashboard</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{dashboard.upload.original_filename}</p>
            </div>
            <button onClick={() => setDashboard(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <EMSDashboard
            metrics={dashboard.metrics}
            generatedAt={dashboard.generatedAt}
            uploadId={dashboard.upload?.id}
            onRefresh={() => handleViewDashboard(dashboard.upload)}
          />
        </div>
      )}

      {/* Tableau Embed */}
      <TableauEmbed 
        embedHtml={tableauEmbedHtml}
        embedType={tableauEmbedType}
        openUrl={tableauOpenUrl}
      />

      {cleanedUploads.length === 0 && reports.length === 0 && !tableauEmbedHtml && (
        <div className="bg-white border rounded-lg p-10 text-center text-gray-400 text-sm">
          No dashboards available yet. Upload and process a CSV from the <a href="/portal/uploads" className="text-[var(--brand-primary)] hover:underline">Upload data</a> page.
        </div>
      )}

      {reports.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-4">Additional Reports</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded-lg p-4 bg-white hover:shadow-sm text-sm"
              >
                <div className="font-semibold mb-1">{r.title}</div>
                {r.description && <div className="text-xs text-gray-600">{r.description}</div>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
