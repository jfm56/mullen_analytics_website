'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ClientProjectStatusPreview({ clientId, refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState('');
  const [nextCheckIn, setNextCheckIn] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');

  useEffect(() => {
    if (clientId) {
      loadItems();
    }
  }, [clientId]);

  useEffect(() => {
    if (refreshKey > 0 && clientId) {
      loadItems();
    }
  }, [refreshKey, clientId]);

  const loadItems = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token');

      const res = await fetch(`/api/admin/clients/project-status?clientId=${clientId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const json = await res.json();
      console.log('ClientProjectStatusPreview - response status:', res.status);
      console.log('ClientProjectStatusPreview - response ok:', res.ok);
      console.log('ClientProjectStatusPreview - response:', json);
      
      if (!res.ok) {
        console.error('ClientProjectStatusPreview - API error:', json.error);
        throw new Error(json.error || 'Failed to load items');
      }
      
      console.log('ClientProjectStatusPreview - setting items:', json.items || []);
      setItems(json.items || []);
      setCompany(json.company || '');
      setNextCheckIn(json.next_check_in || '');
      setCheckInNotes(json.check_in_notes || '');
    } catch (e) {
      console.error('Failed to load project status:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'In progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressBarColor = (percent) => {
    if (percent === 100) return 'bg-green-500';
    if (percent > 0) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const formatCheckInDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Not scheduled';
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg bg-white p-6">
        <div className="text-center text-gray-600 text-sm">Loading client view...</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Project Status View</h2>
            <p className="text-sm text-gray-600 mt-1">
              This is what the client sees in their portal
            </p>
            {company && (
              <p className="text-sm text-gray-500 mt-2">
                {company}
              </p>
            )}
          </div>
          <div className="text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Client Preview
            </div>
          </div>
        </div>
      </div>

      {/* Project Status Section */}
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">PROJECT STATUS</h3>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="text-gray-500">
            <h3 className="text-lg font-medium mb-2">No project steps yet</h3>
            <p className="text-sm">Project steps will appear here once work begins.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.owner}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.target_date_text || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressBarColor(item.progress_percent)}`}
                            style={{ width: `${item.progress_percent}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 min-w-[3rem] text-right">
                        {item.progress_percent}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
