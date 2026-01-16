'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', status: 'Not started', due_date: '', notes: '' });
  const [tableauUrl, setTableauUrl] = useState('');
  const [tableauType, setTableauType] = useState('dashboard');
  const [savingTableau, setSavingTableau] = useState(false);
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [allowedFileTypes, setAllowedFileTypes] = useState('csv,xlsx,json,pdf');
  const [maxUploadMb, setMaxUploadMb] = useState(50);
  const [savingUploadSettings, setSavingUploadSettings] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const saveProject = async () => {
    if (!clientId) return;
    setError('');
    setSavingProject(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
        setSavingProject(false);
        return;
      }

      const res = await fetch('/api/admin/clients/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId,
          project_name: projectName,
          project_status: projectStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save project');

      setClient(json.profile);
      setProjectName(json.profile.project_name || '');
      setProjectStatus(json.profile.project_status || '');
    } catch (e) {
      setError(e.message || 'Failed to save project');
    } finally {
      setSavingProject(false);
    }
  };

  const saveTableau = async () => {
    if (!clientId) return;
    setError('');
    setSavingTableau(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
        setSavingTableau(false);
        return;
      }

      const res = await fetch('/api/admin/clients/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId,
          tableau_url: tableauUrl,
          tableau_type: tableauType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save Tableau embed');

      setClient(json.profile);
      setTableauUrl(json.profile.tableau_url || '');
      setTableauType(json.profile.tableau_type || 'dashboard');
    } catch (e) {
      setError(e.message || 'Failed to save Tableau embed');
    } finally {
      setSavingTableau(false);
    }
  };

  const saveUploadSettings = async () => {
    if (!clientId) return;
    setError('');
    setSavingUploadSettings(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
        setSavingUploadSettings(false);
        return;
      }

      const res = await fetch('/api/admin/clients/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId,
          upload_enabled: uploadEnabled,
          allowed_file_types: allowedFileTypes,
          max_upload_mb: maxUploadMb,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save upload settings');

      setClient(json.profile);
      setUploadEnabled(json.profile.upload_enabled || false);
      setAllowedFileTypes(json.profile.allowed_file_types || 'csv,xlsx,json,pdf');
      setMaxUploadMb(json.profile.max_upload_mb || 50);
    } catch (e) {
      setError(e.message || 'Failed to save upload settings');
    } finally {
      setSavingUploadSettings(false);
    }
  };

  const loadUploads = async (accessToken, currentClientId) => {
    try {
      setLoadingUploads(true);
      const res = await fetch(`/api/clients/${encodeURIComponent(currentClientId)}/uploads`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load uploads');
      setUploads(json.uploads || []);
    } catch (e) {
      setError(e.message || 'Failed to load uploads');
    } finally {
      setLoadingUploads(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !clientId) return;
    setError('');
    setUploadingFile(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
        setUploadingFile(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientId', clientId);

      const res = await fetch('/api/clients/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Upload failed');
      }

      setSelectedFile(null);
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';
    } catch (e) {
      setError(e.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !clientId) return;
    setUploadingLogo(true);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
        setUploadingLogo(false);
        return;
      }

      const formData = new FormData();
      formData.append('logoFile', logoFile);
      formData.append('clientId', clientId);

      const res = await fetch('/api/admin/clients/logo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Logo upload failed');
      }

      const json = await res.json();
      setClient(prev => ({ ...prev, logo_url: json.logoUrl }));
      setLogoFile(null);
      const logoInput = document.getElementById('logo-upload-input');
      if (logoInput) logoInput.value = '';
    } catch (e) {
      setError(e.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDownload = async (uploadId, filename) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/uploads/${encodeURIComponent(uploadId)}/download`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to get download URL');

      // Open download URL in new tab
      window.open(json.url, '_blank');
    } catch (e) {
      setError(e.message || 'Failed to download file');
    }
  };

  const loadTasks = async (accessToken, currentClientId) => {
    try {
      setLoadingTasks(true);
      const res = await fetch(`/api/admin/clients/tasks?clientId=${encodeURIComponent(currentClientId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load tasks');
      setTasks(json.tasks || []);
    } catch (e) {
      setError(e.message || 'Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const createTask = async () => {
    if (!clientId || !newTask.title) {
      setError('Task title is required.');
      return;
    }
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
        return;
      }

      const res = await fetch('/api/admin/clients/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId,
          title: newTask.title,
          status: newTask.status,
          due_date: newTask.due_date || null,
          notes: newTask.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create task');

      setTasks((prev) => [...prev, json.task]);
      setNewTask({ title: '', status: 'Not started', due_date: '', notes: '' });
    } catch (e) {
      setError(e.message || 'Failed to create task');
    }
  };

  const updateTaskStatus = async (id, status) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const res = await fetch('/api/admin/clients/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update task');

      setTasks((prev) => prev.map((t) => (t.id === id ? json.task : t)));
    } catch (e) {
      setError(e.message || 'Failed to update task');
    }
  };

  const deleteTask = async (id) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const res = await fetch(`/api/admin/clients/tasks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete task');

      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message || 'Failed to delete task');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/portal/login');
        return;
      }

      // Verify current user is admin
      const { data: callerProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);

      const accessToken = session?.access_token;
      if (!accessToken || !clientId) {
        setError('Missing client information.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/admin/users/list', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Failed to load client.');
          setLoading(false);
          return;
        }

        const match = (json.profiles || []).find((p) => p.id === clientId);
        if (!match) {
          setError('Client not found.');
        } else {
          setClient(match);
          setProjectName(match.project_name || '');
          setProjectStatus(match.project_status || '');
          setTableauUrl(match.tableau_url || '');
          setTableauType(match.tableau_type || 'dashboard');
          setUploadEnabled(match.upload_enabled || false);
          setAllowedFileTypes(match.allowed_file_types || 'csv,xlsx,json,pdf');
          setMaxUploadMb(match.max_upload_mb || 50);
          await loadTasks(accessToken, clientId);
          await loadUploads(accessToken, clientId);
        }
      } catch (e) {
        setError(e.message || 'Failed to load client.');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      void init();
    }
  }, [clientId, router]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Loading client...</div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Not authorized.
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-red-600 text-sm">{error}</div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Client not found.</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <button
        type="button"
        onClick={() => router.push('/admin')}
        className="mb-4 text-xs text-[var(--brand-primary)] hover:underline"
      >
         Back to admin
      </button>
      <h1 className="text-2xl font-bold tracking-tight mb-2">
        {client.full_name || client.email}
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        Company: {client.company || 'N/A'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-xs">
        <div className="border rounded-lg bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Project</h2>
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Project name</label>
            <input
              type="text"
              className="w-full border rounded-md px-2 py-1.5 text-xs"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Status</label>
            <input
              type="text"
              className="w-full border rounded-md px-2 py-1.5 text-xs"
              placeholder="e.g. Discovery, In progress, On hold"
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={saveProject}
            disabled={savingProject}
            className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingProject ? 'Saving...' : 'Save project'}
          </button>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <h2 className="text-sm font-semibold mb-3">Contact</h2>
          <p className="text-[11px] text-gray-600 mb-1">Email</p>
          <p className="text-[13px] text-gray-800 font-medium">{client.email}</p>
          
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-xs font-semibold mb-3">Client Logo</h3>
            {client.logo_url && (
              <div className="mb-3">
                <img 
                  src={client.logo_url} 
                  alt="Client logo" 
                  className="h-16 w-auto max-w-[200px] object-contain border rounded p-2 bg-gray-50"
                />
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Upload logo</label>
                <input
                  id="logo-upload-input"
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.gif,.svg"
                  className="w-full border rounded-md px-2 py-1.5 text-xs"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <p className="text-[10px] text-gray-500 mt-1">PNG, JPG, GIF, SVG (max 2MB)</p>
              </div>
              <button
                type="button"
                onClick={handleLogoUpload}
                disabled={!logoFile || uploadingLogo}
                className="px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {uploadingLogo ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg bg-white p-4 mb-4 text-xs">
        <h2 className="text-sm font-semibold mb-3">Tasks</h2>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Task title</label>
            <input
              type="text"
              className="w-full border rounded-md px-2 py-1.5 text-xs"
              value={newTask.title}
              onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Kickoff call, Data pull, Dashboard build"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Status</label>
              <select
                className="w-full border rounded-md px-2 py-1.5 text-xs bg-white"
                value={newTask.status}
                onChange={(e) => setNewTask((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="Not started">Not started</option>
                <option value="In progress">In progress</option>
                <option value="On hold">On hold</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Due date</label>
              <input
                type="date"
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                value={newTask.due_date}
                onChange={(e) => setNewTask((prev) => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            className="w-full border rounded-md px-2 py-1.5 text-xs min-h-[60px]"
            value={newTask.notes}
            onChange={(e) => setNewTask((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional context: links, owners, sub-tasks, etc."
          />
        </div>

        <button
          type="button"
          onClick={createTask}
          className="mb-4 inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)]"
        >
          Add task
        </button>

        <div className="border-t pt-3 mt-1">
          {loadingTasks ? (
            <p className="text-[11px] text-gray-600">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-[11px] text-gray-600">No tasks yet. Add the first task for this client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-1 font-medium">Title</th>
                    <th className="px-2 py-1 font-medium">Status</th>
                    <th className="px-2 py-1 font-medium">Due</th>
                    <th className="px-2 py-1 font-medium">Notes</th>
                    <th className="px-2 py-1 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="px-2 py-1 text-gray-800">{t.title}</td>
                      <td className="px-2 py-1 text-gray-800">{t.status}</td>
                      <td className="px-2 py-1 text-gray-800">{t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</td>
                      <td className="px-2 py-1 text-gray-600 max-w-xs truncate" title={t.notes || ''}>
                        {t.notes || ''}
                      </td>
                      <td className="px-2 py-1 text-gray-800">
                        <div className="flex flex-wrap gap-2">
                          {t.status !== 'Done' && (
                            <button
                              type="button"
                              onClick={() => updateTaskStatus(t.id, 'Done')}
                              className="px-2 py-1 border rounded-md text-[10px] bg-white hover:bg-gray-50 text-[var(--brand-primary)] border-[var(--brand-primary)]"
                            >
                              Mark done
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteTask(t.id)}
                            className="px-2 py-1 border rounded-md text-[10px] bg-white hover:bg-red-50 text-red-600 border-red-300"
                          >
                            Delete
                          </button>
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

      <div className="border rounded-lg bg-white p-4 mb-4 text-xs">
        <h2 className="text-sm font-semibold mb-3">Client Data Uploads</h2>
        
        <div className="mb-4 pb-4 border-b">
          <h3 className="text-xs font-semibold mb-2">Upload Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="flex items-center text-[11px] font-medium text-gray-600 mb-1">
                <input
                  type="checkbox"
                  checked={uploadEnabled}
                  onChange={(e) => setUploadEnabled(e.target.checked)}
                  className="mr-2"
                />
                Enable uploads
              </label>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Allowed file types</label>
              <input
                type="text"
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                value={allowedFileTypes}
                onChange={(e) => setAllowedFileTypes(e.target.value)}
                placeholder="csv,xlsx,json,pdf"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Max upload (MB)</label>
              <input
                type="number"
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(parseInt(e.target.value) || 50)}
                min="1"
                max="500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={saveUploadSettings}
            disabled={savingUploadSettings}
            className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingUploadSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="mb-4 pb-4 border-b">
          <h3 className="text-xs font-semibold mb-2">Upload File</h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Select file</label>
              <input
                id="file-upload-input"
                type="file"
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={!uploadEnabled}
              />
            </div>
            <button
              type="button"
              onClick={handleFileUpload}
              disabled={!selectedFile || uploadingFile || !uploadEnabled}
              className="px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploadingFile ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {!uploadEnabled && (
            <p className="text-[10px] text-amber-600 mt-1">Enable uploads first to upload files</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold mb-2">Uploaded Files</h3>
          {loadingUploads ? (
            <p className="text-[11px] text-gray-600">Loading uploads...</p>
          ) : uploads.length === 0 ? (
            <p className="text-[11px] text-gray-600">No files uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-1 font-medium">Filename</th>
                    <th className="px-2 py-1 font-medium">Size</th>
                    <th className="px-2 py-1 font-medium">Uploaded</th>
                    <th className="px-2 py-1 font-medium">Status</th>
                    <th className="px-2 py-1 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {uploads.map((upload) => (
                    <tr key={upload.id}>
                      <td className="px-2 py-1 text-gray-800">{upload.original_filename}</td>
                      <td className="px-2 py-1 text-gray-600">
                        {(upload.size_bytes / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-2 py-1 text-gray-600">
                        {new Date(upload.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          upload.status === 'done' ? 'bg-green-50 text-green-700' :
                          upload.status === 'error' ? 'bg-red-50 text-red-700' :
                          upload.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {upload.status}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleDownload(upload.id, upload.original_filename)}
                          className="px-2 py-1 border rounded-md text-[10px] bg-white hover:bg-gray-50 text-[var(--brand-primary)] border-[var(--brand-primary)]"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-lg bg-white p-4 mb-4 text-xs">
        <h2 className="text-sm font-semibold mb-2">Invoices</h2>
        <p className="text-[11px] text-gray-600">Stripe invoices for this client will appear here.</p>
      </div>

      <div className="border rounded-lg bg-white p-4 text-xs">
        <h2 className="text-sm font-semibold mb-3">Tableau Dashboard / Story</h2>
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Embed Type</label>
          <select
            className="w-full border rounded-md px-2 py-1.5 text-xs bg-white"
            value={tableauType}
            onChange={(e) => setTableauType(e.target.value)}
          >
            <option value="dashboard">Dashboard</option>
            <option value="story">Story</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Tableau Embed URL</label>
          <input
            type="text"
            className="w-full border rounded-md px-2 py-1.5 text-xs"
            value={tableauUrl}
            onChange={(e) => setTableauUrl(e.target.value)}
            placeholder="https://public.tableau.com/views/..."
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Paste the full Tableau Public or Tableau Server embed URL
          </p>
        </div>
        <button
          type="button"
          onClick={saveTableau}
          disabled={savingTableau}
          className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed mb-4"
        >
          {savingTableau ? 'Saving...' : 'Save Tableau Embed'}
        </button>

        {client.tableau_url && (
          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold mb-2">Preview</h3>
            <div className="w-full" style={{ height: '600px' }}>
              <iframe
                src={client.tableau_url}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                title={`Tableau ${client.tableau_type || 'dashboard'}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
