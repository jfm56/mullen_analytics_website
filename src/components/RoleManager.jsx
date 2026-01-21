'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RoleManager({ userId, currentRole, onRoleChange }) {
  const [loading, setLoading] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);

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

      const response = await fetch(`/api/admin/users/${userId}/role`, {
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
      if (onRoleChange) {
        onRoleChange(newRole);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while updating the role.');
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    client: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="relative">
      {/* Current Role Badge */}
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[currentRole]}`}>
          {currentRole?.toUpperCase() || 'CLIENT'}
        </span>
        <button
          onClick={() => setShowRoleManager(!showRoleManager)}
          className="text-gray-500 hover:text-gray-700 text-sm underline"
        >
          Change Role
        </button>
      </div>

      {/* Role Manager Dropdown */}
      {showRoleManager && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Change Role</h4>
            <div className="space-y-2">
              <button
                onClick={() => updateRole('admin')}
                disabled={loading || currentRole === 'admin'}
                className="w-full text-left px-3 py-2 text-sm rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                👑 Admin
                <div className="text-xs text-purple-600">Full access to all features</div>
              </button>
              <button
                onClick={() => updateRole('client')}
                disabled={loading || currentRole === 'client'}
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
  );
}
