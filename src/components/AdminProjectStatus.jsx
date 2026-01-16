'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminProjectStatus({ clientId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const loadItems = async () => {
    if (!clientId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token');

      const res = await fetch(`/api/admin/clients/project-status?clientId=${encodeURIComponent(clientId)}`, {
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
      setError(e.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [clientId]);

  const addItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      title: '',
      description: '',
      status: 'Planned',
      owner: 'Mullen Analytics',
      target_date_text: '',
      progress_percent: 0,
      sort_order: items.length,
      isNew: true
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-set progress based on status
    if (field === 'status') {
      if (value === 'Complete') {
        updatedItems[index].progress_percent = 100;
      } else if (value === 'Planned' && updatedItems[index].progress_percent === 100) {
        updatedItems[index].progress_percent = 0;
      }
    }
    
    setItems(updatedItems);
  };

  const deleteItem = async (index) => {
    const item = items[index];
    
    if (!item.isNew) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error('No access token');

        const res = await fetch(`/api/admin/clients/project-status?id=${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to delete item');
        }
      } catch (e) {
        setError(e.message || 'Failed to delete item');
        return;
      }
    }
    
    setItems(items.filter((_, i) => i !== index));
  };

  const saveItem = async (index) => {
    const item = items[index];
    
    if (!item.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token');

      const body = {
        clientId,
        title: item.title,
        description: item.description,
        status: item.status,
        owner: item.owner,
        target_date_text: item.target_date_text,
        progress_percent: item.progress_percent,
        sort_order: item.sort_order
      };

      let res;
      if (item.isNew) {
        // Create new item
        res = await fetch('/api/admin/clients/project-status', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        // Update existing item
        res = await fetch('/api/admin/clients/project-status', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ ...body, id: item.id }),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save item');

      // Update the item in state with the response data
      const updatedItems = [...items];
      updatedItems[index] = { ...json.item, isNew: false };
      setItems(updatedItems);
      
      setSaveMessage('Item saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'In progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600 text-sm">Loading project status...</div>;
  }

  return (
    <div className="border rounded-lg bg-white p-4 text-xs">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold">Project Status (Client View)</h2>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700"
        >
          Add Project Step
        </button>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> These steps appear in the client portal. Clients cannot edit them.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-xs">
          {saveMessage}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No project steps added yet. Click "Add Project Step" to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-2 py-1.5 text-xs"
                    value={item.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    placeholder="e.g., Data review and preparation"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Status</label>
                  <select
                    className="w-full border rounded-md px-2 py-1.5 text-xs"
                    value={item.status}
                    onChange={(e) => updateItem(index, 'status', e.target.value)}
                  >
                    <option value="Planned">Planned</option>
                    <option value="In progress">In progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  className="w-full border rounded-md px-2 py-1.5 text-xs"
                  rows={2}
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Detailed description of this step..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Owner</label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-2 py-1.5 text-xs bg-gray-100"
                    value={item.owner}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Target Date</label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-2 py-1.5 text-xs"
                    value={item.target_date_text}
                    onChange={(e) => updateItem(index, 'target_date_text', e.target.value)}
                    placeholder="e.g., Week of Jan 27, 2026"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Progress: {item.progress_percent}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full"
                    value={item.progress_percent}
                    onChange={(e) => updateItem(index, 'progress_percent', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  {item.isNew && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      New
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => saveItem(index)}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(index)}
                    className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
