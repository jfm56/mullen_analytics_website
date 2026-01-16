'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ClientProjectStatus({ company }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token');

      const res = await fetch('/api/portal/project-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load items');
      
      setItems(json.items || []);
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center text-gray-600 text-sm">Loading project status...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Project Status</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track the progress of your project milestones
          </p>
          {company && (
            <p className="text-sm text-gray-500 mt-2">
              {company}
            </p>
          )}
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
    </div>
  );
}
