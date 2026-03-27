'use client';

import { useState } from 'react';

export default function ClientActivityTab({
  clientId,
  uploads,
  activityLogs,
  onRefreshUploads,
  onRefreshActivity,
}) {
  const [activeSection, setActiveSection] = useState('uploads');

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getRefreshStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUploadStatusColor = (status) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveSection('uploads')}
          className={`pb-2 px-1 text-xs border-b-2 ${
            activeSection === 'uploads'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Client Uploads ({uploads.length})
        </button>
        <button
          onClick={() => setActiveSection('impersonation')}
          className={`pb-2 px-1 text-xs border-b-2 ${
            activeSection === 'impersonation'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Admin Activity ({activityLogs.length})
        </button>
      </div>

      {/* Uploads Section */}
      {activeSection === 'uploads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Client Uploads</h3>
            <button
              onClick={onRefreshUploads}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Refresh
            </button>
          </div>

          {uploads.length === 0 ? (
            <div className="border rounded-lg bg-white p-8 text-center text-gray-500 text-sm">
              No uploads yet.
            </div>
          ) : (
            <div className="border rounded-lg bg-white overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Filename</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Refresh Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Uploaded</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {uploads.map((upload) => (
                    <tr key={upload.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{upload.original_filename}</p>
                        {upload.notes && (
                          <p className="text-gray-500 mt-0.5">{upload.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full ${getUploadStatusColor(upload.status)}`}>
                          {upload.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full ${getRefreshStatusColor(upload.refresh_status)}`}>
                          {upload.refresh_status || 'none'}
                        </span>
                        {upload.refresh_error && (
                          <p className="text-red-600 text-[10px] mt-1">{upload.refresh_error}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(upload.uploaded_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(upload.processed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Impersonation Logs Section */}
      {activeSection === 'impersonation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Admin Activity (Impersonation Logs)</h3>
            <button
              onClick={onRefreshActivity}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Refresh
            </button>
          </div>

          <p className="text-xs text-gray-500">
            This log tracks when admins view this client's portal using the "View as Client" feature.
          </p>

          {activityLogs.length === 0 ? (
            <div className="border rounded-lg bg-white p-8 text-center text-gray-500 text-sm">
              No admin activity logged yet.
            </div>
          ) : (
            <div className="border rounded-lg bg-white overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Page</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">IP Address</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full ${
                          log.action === 'start_session' ? 'bg-green-100 text-green-800' :
                          log.action === 'end_session' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.page_path || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.ip_address || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
