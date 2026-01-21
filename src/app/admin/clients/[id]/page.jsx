'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AdminProjectStatus from '@/components/AdminProjectStatus';
import TableauEmbed from '@/components/TableauEmbed';
import AdminClientHeader from '@/components/AdminClientHeader';
import EnhancedProjectPulse from '@/components/EnhancedProjectPulse';
import EnhancedTaskManager from '@/components/EnhancedTaskManager';
import RevenuePipelineDashboard from '@/components/RevenuePipelineDashboard';
import OnboardingAutomation from '@/components/OnboardingAutomation';
import ClientDataFiles from '@/components/ClientDataFiles';
import AdvancedSettings from '@/components/AdvancedSettings';
import RoleManager from '@/components/RoleManager';

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
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [allowedFileTypes, setAllowedFileTypes] = useState('csv,xlsx,json,pdf');
  const [maxUploadMb, setMaxUploadMb] = useState(50);
  const [removingClient, setRemovingClient] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [showRevenuePipeline, setShowRevenuePipeline] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Calculate active and completed tasks
  const activeTasks = tasks?.filter(task => task.status !== 'done') || [];
  const completedTasks = tasks?.filter(task => task.status === 'done') || [];

  // Load client data
  const loadClient = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/users/list', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load client');

      const match = (json.profiles || []).find((p) => p.id === clientId);
      if (!match) throw new Error('Client not found');

      setClient(match);
      setProjectName(match.project_name || '');
      setProjectStatus(match.project_status || 'Not Started');
      setFullName(match.full_name || '');
      setCompany(match.company || '');
      setUploadEnabled(match.upload_enabled || false);
      setAllowedFileTypes(match.allowed_file_types || 'csv,xlsx,json,pdf');
      setMaxUploadMb(match.max_upload_mb || 50);
      
      // Load enhanced client data
      setClient(prev => ({
        ...prev,
        client_status: match.client_status || 'prospect',
        tags: match.tags || [],
        contract_value: match.contract_value || 0,
        start_date: match.start_date,
        renewal_date: match.renewal_date,
        notes: match.notes,
        health_score: match.health_score || 0,
        project_phase: match.project_phase || 'discovery',
        project_deadline: match.project_deadline,
        last_login: match.last_login
      }));
      
      // Store all clients for dashboard
      setAllClients(json.profiles || []);
      setAllowed(true);
    } catch (e) {
      setError(e.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  // Handler functions
  const handleSendPasswordReset = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!res.ok) throw new Error('Failed to send password reset');
      alert('Password reset email sent successfully!');
    } catch (e) {
      alert('Failed to send password reset: ' + e.message);
    }
  };

  const handleScheduleCheckIn = () => {
    const checkInSection = document.getElementById('check-in-section');
    if (checkInSection) {
      checkInSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleArchiveClient = async () => {
    if (!confirm('Are you sure you want to archive this client?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!res.ok) throw new Error('Failed to archive client');
      alert('Client archived successfully!');
      loadClient();
    } catch (e) {
      alert('Failed to archive client: ' + e.message);
    }
  };

  const handleUploadSettingsChange = (key, value) => {
    switch (key) {
      case 'uploadEnabled':
        setUploadEnabled(value);
        break;
      case 'allowedFileTypes':
        setAllowedFileTypes(value);
        break;
      case 'maxUploadMb':
        setMaxUploadMb(value);
        break;
    }
  };

  const handleRemoveClient = async () => {
    try {
      setRemovingClient(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`/api/admin/clients/delete?id=${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to remove client');
      setSaveMessage('Client removed successfully');
      setTimeout(() => router.push('/admin'), 2000);
    } catch (e) {
      setSaveError(e.message || 'Failed to remove client');
      setTimeout(() => setSaveError(''), 5000);
    } finally {
      setRemovingClient(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Loading client...
      </div>
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
      <div className="max-w-md mx-auto py-16 px-4 text-center text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Client not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notifications */}
      {saveMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {saveMessage}
          </div>
        </div>
      )}

      {saveError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md shadow-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {saveError}
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <AdminClientHeader
        client={client}
        onSendPasswordReset={handleSendPasswordReset}
        onScheduleCheckIn={handleScheduleCheckIn}
        onArchiveClient={handleArchiveClient}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        
        {/* Project Pulse - At-a-Glance Summary */}
        <EnhancedProjectPulse
          client={client}
          projectStatus={projectStatus}
          tasks={tasks}
          nextCheckIn={client}
          dataStatus="Waiting"
          allClients={allClients}
        />

        {/* Primary Workflow Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Project Timeline */}
          <div className="lg:col-span-2">
            <div data-section="project-timeline" className="bg-white border rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Client Project Timeline</h2>
                <p className="text-sm text-gray-600 mt-1">This appears in the client portal - don't mess this up</p>
              </div>
              <div className="p-6">
                <AdminProjectStatus clientId={clientId} />
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div data-section="tasks" className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Enhanced Task Manager</h2>
          </div>
          <div className="p-6">
            <EnhancedTaskManager 
              clientId={clientId} 
              onTaskUpdate={(task) => {
                setTasks(prev => [...prev, task]);
              }}
            />
          </div>
        </div>

        {/* Revenue Pipeline Section */}
        <div data-section="revenue" className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Revenue Pipeline</h2>
              <button
                onClick={() => setShowRevenuePipeline(!showRevenuePipeline)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showRevenuePipeline ? 'Hide' : 'Show'} Pipeline
              </button>
            </div>
          </div>
          {showRevenuePipeline && (
            <div className="p-6">
              <RevenuePipelineDashboard onDealUpdate={(deal) => {
                // Handle deal updates if needed
              }} />
            </div>
          )}
        </div>

        {/* Onboarding Automation Section */}
        <div data-section="onboarding" className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Client Onboarding</h2>
              <button
                onClick={() => setShowOnboarding(!showOnboarding)}
                className="text-sm text-green-600 hover:text-green-800"
              >
                {showOnboarding ? 'Hide' : 'Show'} Onboarding
              </button>
            </div>
          </div>
          {showOnboarding && (
            <div className="p-6">
              <OnboardingAutomation 
                clientId={clientId}
                clientType={client?.tags?.[0] || 'general'}
                onOnboardingComplete={(data) => {
                  // Refresh client data after onboarding
                  loadClient();
                }}
              />
            </div>
          )}
        </div>

        {/* Client Interaction & Scheduling */}
        <div id="check-in-section" data-section="client-interaction" className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Client Interaction & Scheduling</h2>
            <p className="text-sm text-gray-600 mt-1">When am I talking to them next and about what?</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Check-in Date
                </label>
                <input
                  type="date"
                  value={client?.next_check_in || ''}
                  onChange={(e) => setClient(prev => ({ ...prev, next_check_in: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Notes / Agenda
                </label>
                <textarea
                  value={client?.check_in_notes || ''}
                  onChange={(e) => setClient(prev => ({ ...prev, check_in_notes: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Topics to discuss, questions to ask, etc."
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const res = await fetch(`/api/admin/clients/project-status`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        clientId,
                        next_check_in: client?.next_check_in,
                        check_in_notes: client?.check_in_notes,
                      }),
                    });

                    if (!res.ok) throw new Error('Failed to save check-in');
                    setSaveMessage('Check-in saved successfully');
                    setTimeout(() => setSaveMessage(''), 3000);
                  } catch (e) {
                    setSaveError(e.message || 'Failed to save check-in');
                    setTimeout(() => setSaveError(''), 5000);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Save Check-in
              </button>
            </div>
          </div>
        </div>

        {/* Data & Documents - Grouped Together */}
        <div data-section="data-documents">
          <ClientDataFiles clientId={clientId} />
        </div>

        {/* Analytics & Dashboard */}
        <div data-section="analytics" className="bg-white border rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Client Analytics Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">This is the output of everything above</p>
          </div>
          <div className="p-6">
            <TableauEmbed 
              embedHtml={client?.tableau_embed_html || ''}
              embedType={client?.tableau_embed_type || 'dashboard'}
            />
          </div>
        </div>

        {/* Advanced Settings - Collapsed by Default */}
        <AdvancedSettings
          client={client}
          uploadEnabled={uploadEnabled}
          allowedFileTypes={allowedFileTypes}
          maxUploadMb={maxUploadMb}
          onUploadSettingsChange={handleUploadSettingsChange}
          onRemoveClient={handleRemoveClient}
        />
      </div>
    </div>
  );
}
