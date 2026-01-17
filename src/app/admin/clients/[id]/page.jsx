'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import TableauEmbed from '@/components/TableauEmbed';
import AdminProjectStatus from '@/components/AdminProjectStatus';
import ClientProjectStatusPreview from '@/components/ClientProjectStatusPreview';

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
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assigned_to: 'Mullen Analytics', status: 'Not started', due_date: '', notes: '' });
  const [tableauEmbedHtml, setTableauEmbedHtml] = useState('');
  const [tableauEmbedType, setTableauEmbedType] = useState('dashboard');
  const [tableauOpenUrl, setTableauOpenUrl] = useState('');
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
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [removingClient, setRemovingClient] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [nextCheckIn, setNextCheckIn] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');

  const saveProject = async () => {
    if (!clientId) return;
    setError('');
    setSaveMessage('');
    setSaveError('');
    setSavingProject(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token');

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

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save project');
      }

      const json = await res.json();
      setClient(json.profile);
      setSaveMessage('Project saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveError(e.message || 'Failed to save project');
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setSavingProject(false);
    }
  };

  const saveContact = async () => {
    if (!clientId) return;
    setError('');
    setSaveMessage('');
    setSaveError('');
    setSavingContact(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token');

      const res = await fetch('/api/admin/clients/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId,
          full_name: fullName,
          company: company,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save contact information');
      }

      const json = await res.json();
      setClient(prev => ({ ...prev, full_name: fullName, company: company }));
      setSaveMessage('Contact information saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveError(e.message || 'Failed to save contact information');
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setSavingContact(false);
    }
  };

  const removeClient = async () => {
    if (!clientId) return;
    setRemovingClient(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('No access token');

      const res = await fetch(`/api/admin/clients/delete?id=${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to remove client');
      }

      setSaveMessage('Client removed successfully');
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (e) {
      setSaveError(e.message || 'Failed to remove client');
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setRemovingClient(false);
      setShowRemoveConfirm(false);
    }
  };

  const saveCheckIn = async () => {
    if (!clientId) return;
    setError('');
    setSaveMessage('');
    setSaveError('');
    
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
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
          next_check_in: nextCheckIn,
          check_in_notes: checkInNotes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save check-in');
      }

      const json = await res.json();
      setClient(json.profile);
      setSaveMessage('Check-in saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveError(e.message || 'Failed to save check-in');
      setTimeout(() => setSaveError(''), 5000);
    }
  };

  const saveAllChanges = async () => {
    if (!clientId) return;
    setError('');
    setSaveMessage('');
    setSaveError('');
    
    try {
      // Save contact info
      await saveContact();
      // Save upload settings
      await saveUploadSettings();
      // Save check-in info
      await saveCheckIn();
      setSaveMessage('All changes saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveError(e.message || 'Failed to save some changes');
      setTimeout(() => setSaveError(''), 5000);
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
      if (!accessToken) throw new Error('No access token');

      // Parse open URL from embed HTML
      let openUrl = '';
      if (tableauEmbedHtml) {
        // Try to extract URL from various Tableau embed patterns
        const urlMatch = tableauEmbedHtml.match(/src='([^']+)'/) || 
                        tableauEmbedHtml.match(/src="([^"]+)"/) ||
                        tableauEmbedHtml.match(/https:\/\/[^'\s\)]+/);
        if (urlMatch) {
          openUrl = urlMatch[1];
        }
      }

      const res = await fetch('/api/admin/clients/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId,
          tableau_embed_html: tableauEmbedHtml,
          tableau_embed_type: tableauEmbedType,
          tableau_open_url: openUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save Tableau embed');

      setClient(json.profile);
      setTableauEmbedHtml(json.profile.tableau_embed_html || '');
      setTableauEmbedType(json.profile.tableau_embed_type || 'dashboard');
      setTableauOpenUrl(json.profile.tableau_open_url || '');
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
          max_upload_mb: maxUploadMb === 'unlimited' ? null : maxUploadMb,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save upload settings');

      setClient(json.profile);
      setUploadEnabled(json.profile.upload_enabled || false);
      setAllowedFileTypes(json.profile.allowed_file_types || 'csv,xlsx,json,pdf');
      setMaxUploadMb(json.profile.max_upload_mb === null ? 'unlimited' : json.profile.max_upload_mb || 50);
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
    setAddingTask(true);
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
          assigned_to: newTask.assigned_to,
          status: newTask.status,
          due_date: newTask.due_date || null,
          notes: newTask.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create task');

      setTasks((prev) => [...prev, json.task]);
      setNewTask({ title: '', assigned_to: 'Mullen Analytics', status: 'Not started', due_date: '', notes: '' });
      setSaveMessage('Task added successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveError(e.message || 'Failed to create task');
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setAddingTask(false);
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

  // Sort tasks: incomplete first, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    // Done tasks go to the end
    if (a.status === 'Done' && b.status !== 'Done') return 1;
    if (a.status !== 'Done' && b.status === 'Done') return -1;
    
    // Sort by due date (null dates go to end)
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && !b.due_date) return -1;
    if (a.due_date && b.due_date) {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    
    return 0;
  });

  const activeTasks = sortedTasks.filter(t => t.status !== 'Done');
  const completedTasks = sortedTasks.filter(t => t.status === 'Done');

  useEffect(() => {
    // Add global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError('An unexpected error occurred. Please refresh the page.');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const init = async () => {
      setLoading(true);
      setError('');

      try {
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
          setFullName(match.full_name || '');
          setCompany(match.company || '');
          setTableauEmbedHtml(match.tableau_embed_html || '');
          setTableauEmbedType(match.tableau_embed_type || 'dashboard');
          setTableauOpenUrl(match.tableau_open_url || '');
          setUploadEnabled(match.upload_enabled || false);
          setAllowedFileTypes(match.allowed_file_types || 'csv,xlsx,json,pdf');
          setMaxUploadMb(match.max_upload_mb === null ? 'unlimited' : match.max_upload_mb || 50);
          setNextCheckIn(match.next_check_in || '');
          setCheckInNotes(match.check_in_notes || '');
          await loadTasks(accessToken, clientId);
          await loadUploads(accessToken, clientId);
        }
      } catch (e) {
        console.error('Init error:', e);
        setError(e.message || 'Failed to load client.');
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      void init();
    }

    // Cleanup event listener
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
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
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Toast Notifications */}
      {saveMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-sm">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {saveMessage}
        </div>
      </div>
      )}
      
      {saveError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md shadow-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {saveError}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Client:</span>
              <span className="ml-2 font-medium">{client.full_name || client.email}</span>
            </div>
            <div>
              <span className="text-gray-500">Company:</span>
              <span className="ml-2 font-medium">{client.company || 'Company not set'}</span>
            </div>
            <div>
              <span className="text-gray-500">Active project:</span>
              <span className="ml-2 font-medium text-green-600">Yes</span>
            </div>
            <div>
              <span className="text-gray-500">Uploads enabled:</span>
              <span className="ml-2 font-medium text-green-600">Yes</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveAllChanges}
              className="text-xs bg-[var(--brand-primary)] text-white px-4 py-1.5 rounded-md hover:bg-[var(--brand-primary-dark,#1d3d73)]"
            >
              Save All Changes
            </button>
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              className="text-xs text-red-600 hover:text-red-800 border border-red-300 px-3 py-1.5 rounded-md hover:bg-red-50"
            >
              Remove Client
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="text-xs text-[var(--brand-primary)] hover:underline"
            >
              ← Back to admin
            </button>
          </div>
        </div>
      </div>

      {/* Client Overview Section */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-blue-500 rounded"></div>
          Client Overview
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold mb-4">Project Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project name</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="EMS Staffing Forecast – Phase 1"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value)}
                >
                  <option value="">Select status...</option>
                  <option value="Planned">Planned</option>
                  <option value="In progress">In progress</option>
                  <option value="On hold">On hold</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
              <button
                type="button"
                onClick={saveProject}
                disabled={savingProject}
                className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingProject ? 'Saving...' : 'Save project'}
              </button>
            </div>
          </div>
          <div className="border rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50"
                  value={client?.email || ''}
                  disabled
                  title="Email cannot be changed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Enter company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={saveContact}
                disabled={savingContact}
                className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingContact ? 'Saving...' : 'Save contact info'}
              </button>
            </div>
            
            {/* Logo Upload Section */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-base font-semibold mb-4">Client Logo</h4>
              {client?.logo_url && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Current logo:</p>
                  <img 
                    src={client.logo_url} 
                    alt="Client logo" 
                    className="h-20 w-auto max-w-[200px] object-contain border rounded p-2 bg-gray-50"
                  />
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload new logo</label>
                  <input
                    id="logo-upload-input"
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.gif,.svg"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, SVG (max 2MB)</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogoUpload}
                  disabled={!logoFile || uploadingLogo}
                  className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Check-in Section */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-purple-500 rounded"></div>
          Next Check-in
        </h2>
        <div className="border rounded-lg bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Next Check-in Date</label>
              <input
                type="datetime-local"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={nextCheckIn}
                onChange={(e) => setNextCheckIn(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Schedule the next client check-in meeting</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Notes</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]"
                placeholder="Add notes for the next check-in (topics to discuss, progress updates, etc.)"
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Include agenda items, progress updates, or discussion points</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveCheckIn}
                className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)]"
              >
                Save Check-in
              </button>
              {nextCheckIn && (
                <div className="text-sm text-gray-600">
                  Scheduled: {new Date(nextCheckIn).toLocaleDateString()} at {new Date(nextCheckIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tasks Section */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-green-500 rounded"></div>
          Tasks
        </h2>
        <div className="border rounded-lg bg-white shadow-sm">
          {/* Helper Text */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">
              Tasks are simple action items for either our team or the client.
            </p>
          </div>

          {/* Active Tasks */}
          <div className="p-6">
            <h3 className="text-base font-semibold mb-4">Active Tasks</h3>
            {activeTasks.length > 0 ? (
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            task.status === 'Not started' ? 'bg-gray-100 text-gray-800' :
                            task.status === 'In progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'Waiting on client' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.status}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            task.assigned_to === 'Client' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.assigned_to}
                          </span>
                          {task.due_date && (
                            <span className="text-xs text-gray-500">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {task.notes && (
                          <p className="text-sm text-gray-600 mb-2">{task.notes}</p>
                        )}
                        {task.assigned_to === 'Client' && task.status !== 'Done' && (
                          <p className="text-xs text-purple-600 mt-2">
                            ✓ Visible to client in portal
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="text-xs border rounded px-2 py-1"
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        >
                          <option value="Not started">Not started</option>
                          <option value="In progress">In progress</option>
                          <option value="Waiting on client">Waiting on client</option>
                          <option value="Done">Done</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No active tasks</p>
            )}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="px-6 py-4 border-t">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Completed Tasks ({completedTasks.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="border rounded p-3 bg-gray-50 opacity-75">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm line-through text-gray-600">{task.title}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">{task.assigned_to}</span>
                            {task.due_date && (
                              <span className="text-xs text-gray-500">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Add Task Form */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <h3 className="text-base font-semibold mb-4">Add New Task</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task title</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned to</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                >
                  <option value="Mullen Analytics">Mullen Analytics</option>
                  <option value="Client">Client</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={newTask.status}
                  onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Not started">Not started</option>
                  <option value="In progress">In progress</option>
                  <option value="Waiting on client">Waiting on client</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due date (optional)</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={2}
                placeholder="Additional notes..."
                value={newTask.notes}
                onChange={(e) => setNewTask(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <button
              type="button"
              onClick={createTask}
              disabled={!newTask.title.trim() || addingTask}
              className="mt-4 inline-flex items-center px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {addingTask ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </div>
      </section>

      <div className="border rounded-lg bg-white p-4 mb-4 text-xs">
        <h2 className="text-sm font-semibold mb-3">Client Data Uploads</h2>
        
        <div className="mb-4 pb-4 border-b">
          <h3 className="text-xs font-semibold mb-2">Upload Settings</h3>
          <p className="text-xs text-gray-500 mb-3">
            These settings control what the client can upload. &quot;No limit&quot; allows files of any size.
          </p>
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
              <select
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value))}
              >
                <option value="unlimited">No limit</option>
                <option value="10">10 MB</option>
                <option value="25">25 MB</option>
                <option value="50">50 MB</option>
                <option value="100">100 MB</option>
                <option value="250">250 MB</option>
                <option value="500">500 MB</option>
              </select>
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
            value={tableauEmbedType}
            onChange={(e) => setTableauEmbedType(e.target.value)}
          >
            <option value="dashboard">Dashboard</option>
            <option value="story">Story</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Tableau Embed Code</label>
          <textarea
            className="w-full border rounded-md px-2 py-1.5 text-xs font-mono"
            rows={6}
            placeholder="Paste the full Tableau embed code here..."
            value={tableauEmbedHtml}
            onChange={(e) => {
              setTableauEmbedHtml(e.target.value);
              // Auto-parse open URL as user types
              if (e.target.value) {
                const urlMatch = e.target.value.match(/src='([^']+)'/) || 
                                e.target.value.match(/src="([^"]+)"/) ||
                                e.target.value.match(/https:\/\/[^'\s\)]+/);
                if (urlMatch) {
                  setTableauOpenUrl(urlMatch[1]);
                }
              }
            }}
          />
          <p className="text-xs text-gray-500 mt-1">
            Get this from Tableau: Share → Embed Code → Copy HTML
          </p>
          {tableauEmbedHtml && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-xs text-green-800">
                ✅ <strong>Live preview active</strong> - See below for how it will appear to clients
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={saveTableau}
          disabled={savingTableau}
          className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed mb-4"
        >
          {savingTableau ? 'Saving...' : 'Save Tableau Embed'}
        </button>

        {tableauEmbedHtml && (
          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold mb-2">Dashboard Preview</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>Live Preview:</strong> This is how your dashboard will appear to the client.
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Make sure it loads correctly before saving.
              </p>
            </div>
            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b bg-gray-50">
                <h4 className="text-xs font-medium text-gray-700">Client View Preview</h4>
              </div>
              <div className="p-2" style={{ height: '600px' }}>
                <TableauEmbed 
                  embedHtml={tableauEmbedHtml}
                  embedType={tableauEmbedType}
                  openUrl={tableauOpenUrl}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Status Section */}
      <AdminProjectStatus clientId={clientId} />

      {/* Client Project Status Preview */}
      <div className="mt-8">
        <ClientProjectStatusPreview clientId={clientId} />
      </div>

      {/* Remove Client Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Client</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to remove <strong>{client.full_name || client.email}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800 font-medium mb-2">This will permanently delete:</p>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• Client profile and contact information</li>
                  <li>• All uploaded files and data</li>
                  <li>• Tasks and project history</li>
                  <li>• Dashboard configurations</li>
                  <li>• Client portal access</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={removingClient}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeClient}
                disabled={removingClient}
                className="flex-1 px-4 py-2 border border-red-300 rounded-md text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removingClient ? 'Removing...' : 'Remove Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
