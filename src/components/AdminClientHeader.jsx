'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminClientHeader({ client, onSendPasswordReset, onScheduleCheckIn, onArchiveClient }) {
  const router = useRouter();
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'In Progress';
      case 'on_hold': return 'On Hold';
      case 'completed': return 'Complete';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  const updateRole = async (newRole) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to change roles');
        return;
      }

      const response = await fetch(`/api/admin/users/${client.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ newRole })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error updating role:', data);
        alert(data.error || 'Failed to update role. Please try again.');
        return;
      }

      alert(data.message || `Role successfully changed to ${newRole}`);
      setShowRoleManager(false);
      // Update the client object to reflect the change
      client.role = newRole;
      // Force a re-render by updating the component
      if (onSendPasswordReset && typeof onSendPasswordReset === 'function') {
        onSendPasswordReset({...client, role: newRole});
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while updating the role.');
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </button>
          <span className="text-gray-400">/</span>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            All Clients
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-900 font-medium">{client.full_name || client.email}</span>
        </div>

        <div className="flex items-center justify-between">
          {/* Client Info */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client.full_name || client.email}
              </h1>
              {client.company && (
                <p className="text-sm text-gray-600">{client.company}</p>
              )}
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(client.status)}`}>
              {getStatusLabel(client.status)}
            </span>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('/portal/home', '_blank')}
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 bg-white hover:bg-blue-50 rounded-md text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Client Portal
            </button>
            
            <button
              onClick={onSendPasswordReset}
              className="inline-flex items-center px-4 py-2 border border-gray-600 text-gray-600 bg-white hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Password Reset
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowRoleManager(!showRoleManager)}
                className="inline-flex items-center px-4 py-2 border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Change Role
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  client.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {client.role?.toUpperCase() || 'CLIENT'}
                </span>
              </button>
              
              {/* Role Dropdown */}
              {showRoleManager && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Change Role</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => updateRole('admin')}
                        disabled={loading || client.role === 'admin'}
                        className="w-full text-left px-3 py-2 text-sm rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        👑 Admin
                        <div className="text-xs text-purple-600">Full access to all features</div>
                      </button>
                      <button
                        onClick={() => updateRole('client')}
                        disabled={loading || client.role === 'client'}
                        className="w-full text-left px-3 py-2 text-sm rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        👤 Client
                        <div className="text-xs text-blue-600">Limited to own data</div>
                      </button>
                    </div>
                    <button
                      onClick={() => setShowRoleManager(false)}
                      className="w-full mt-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border-t"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={onScheduleCheckIn}
              className="inline-flex items-center px-4 py-2 border border-purple-600 text-purple-600 bg-white hover:bg-purple-50 rounded-md text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Check-in
            </button>
            
            <button
              onClick={onArchiveClient}
              className="inline-flex items-center px-4 py-2 border border-red-600 text-red-600 bg-white hover:bg-red-50 rounded-md text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Archive Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
