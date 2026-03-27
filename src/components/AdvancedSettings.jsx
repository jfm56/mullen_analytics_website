'use client';

import { useState } from 'react';

export default function AdvancedSettings({ 
  client, 
  uploadEnabled, 
  allowedFileTypes, 
  maxUploadMb,
  onUploadSettingsChange,
  onRemoveClient,
  onDashboardSettingsChange
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState(client?.tableau_embed_html || '');
  const [dashboardType, setDashboardType] = useState(client?.tableau_embed_type || 'tableau');

  const handleSaveDashboard = () => {
    if (onDashboardSettingsChange) {
      onDashboardSettingsChange({
        tableau_embed_html: dashboardUrl,
        tableau_embed_type: dashboardType
      });
    }
  };

  return (
    <div className="bg-white border rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium text-gray-900">Advanced Settings</span>
          <span className="text-sm text-gray-500">Admin controls and configuration</span>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-6 space-y-6">
            {/* Dashboard/Analytics API Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard & Analytics</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dashboard Type
                  </label>
                  <select
                    value={dashboardType}
                    onChange={(e) => setDashboardType(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="tableau">Tableau</option>
                    <option value="powerbi">Power BI</option>
                    <option value="looker">Looker</option>
                    <option value="metabase">Metabase</option>
                    <option value="custom">Custom Embed</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Select the analytics platform for this client</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dashboard Embed URL / API
                  </label>
                  <textarea
                    value={dashboardUrl}
                    onChange={(e) => setDashboardUrl(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm font-mono"
                    rows={4}
                    placeholder="Paste your dashboard embed URL or embed code here..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Paste the embed URL, iframe code, or API endpoint for the client's interactive dashboard
                  </p>
                </div>

                <button
                  onClick={handleSaveDashboard}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Dashboard Settings
                </button>
              </div>
            </div>

            {/* Upload Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={uploadEnabled}
                      onChange={(e) => onUploadSettingsChange('uploadEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Enable file uploads for this client</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">When enabled, client can upload files through their portal</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed File Types
                  </label>
                  <input
                    type="text"
                    value={allowedFileTypes}
                    onChange={(e) => onUploadSettingsChange('allowedFileTypes', e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="csv,xlsx,json,pdf"
                  />
                  <p className="mt-1 text-xs text-gray-500">Comma-separated file extensions (e.g., csv,xlsx,json,pdf)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum File Size (MB)
                  </label>
                  <input
                    type="number"
                    value={maxUploadMb}
                    onChange={(e) => onUploadSettingsChange('maxUploadMb', parseInt(e.target.value) || 50)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    min="1"
                    max="100"
                  />
                  <p className="mt-1 text-xs text-gray-500">Maximum file size client can upload (1-100 MB)</p>
                </div>
              </div>
            </div>

            {/* Client Management */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Management</h3>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Danger Zone</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Once you remove a client, there is no going back. Please be certain.</p>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={onRemoveClient}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Remove Client
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Information</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Client ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{client.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(client.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(client.updated_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
