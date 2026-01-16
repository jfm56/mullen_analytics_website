'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState('');
  const [myProfile, setMyProfile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'users' | 'messages'
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitingUser, setInvitingUser] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user',
    full_name: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [confirmRoleChange, setConfirmRoleChange] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [adminMessages, setAdminMessages] = useState([]);
  const [loadingAdminMessages, setLoadingAdminMessages] = useState(false);
  const [compose, setCompose] = useState({ userId: '', subject: '', body: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [dashboard, setDashboard] = useState({
    metrics: { totalClients: 0, activeProjects: 0, unreadMessages: 0, openTasks: 0 },
    tasksDueSoon: [],
    clientsNeedingOutreach: [],
  });
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAllowed(false);
        setLoading(false);
        router.replace('/portal/login');
        return;
      }

      const { data: callerProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, company, project_name')
        .eq('id', session.user.id)
        .single();

      // TEMP: debug admin access
      // eslint-disable-next-line no-console
      console.log('admin session user id:', session.user.id);
      // eslint-disable-next-line no-console
      console.log('admin callerProfile:', callerProfile, 'error:', profileErr);

      if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);

      setMyProfile(callerProfile);

      const accessToken = session?.access_token;

      if (!accessToken) {
        setError('Failed to load users.');
        setProfiles([]);
      } else {
        const res = await fetch('/api/admin/users/list', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Failed to load users.');
          setProfiles([]);
        } else {
          const others = (json.profiles || []).filter((p) => p.id !== callerProfile.id);
          setProfiles(others);
        }

        try {
          setLoadingAdminMessages(true);
          const resMessages = await fetch('/api/admin/messages', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const jsonMessages = await resMessages.json();
          if (!resMessages.ok) {
            // eslint-disable-next-line no-console
            console.error('Failed to load admin messages', jsonMessages.error);
          } else {
            setAdminMessages(jsonMessages.messages || []);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Admin messages load error', e);
        } finally {
          setLoadingAdminMessages(false);
        }

        try {
          setLoadingDashboard(true);
          const resDashboard = await fetch('/api/admin/dashboard', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const jsonDashboard = await resDashboard.json();
          if (!resDashboard.ok) {
            // eslint-disable-next-line no-console
            console.error('Failed to load admin dashboard', jsonDashboard.error);
          } else {
            setDashboard({
              metrics: jsonDashboard.metrics || {
                totalClients: 0,
                activeProjects: 0,
                unreadMessages: 0,
                openTasks: 0,
              },
              tasksDueSoon: jsonDashboard.tasksDueSoon || [],
              clientsNeedingOutreach: jsonDashboard.clientsNeedingOutreach || [],
            });
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Admin dashboard load error', e);
        } finally {
          setLoadingDashboard(false);
        }
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const refreshAdminMessages = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      setLoadingAdminMessages(true);
      const res = await fetch('/api/admin/messages', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error('Failed to refresh admin messages', json.error);
        return;
      }
      setAdminMessages(json.messages || []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('refreshAdminMessages error', e);
    } finally {
      setLoadingAdminMessages(false);
    }
  };

  const sendAdminMessage = async () => {
    if (!compose.userId || !compose.subject || !compose.body) {
      setError('Client, subject, and body are required to send a message.');
      return;
    }
    setError('');
    setSendingMessage(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setError('Missing session. Please sign in again.');
        setSendingMessage(false);
        return;
      }

      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: compose.userId,
          subject: compose.subject,
          body: compose.body,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send message');

      setCompose({ userId: '', subject: '', body: '' });
      await refreshAdminMessages();
    } catch (e) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const updateAdminMessagesRead = async (ids, read) => {
    if (!ids || ids.length === 0) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ids, read }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update messages');

      setAdminMessages((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: read ? new Date().toISOString() : null } : m))
      );
    } catch (e) {
      setError(e.message || 'Failed to update messages');
    }
  };

  const deleteAdminMessages = async (ids) => {
    if (!ids || ids.length === 0) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch('/api/admin/messages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete messages');

      setAdminMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    } catch (e) {
      setError(e.message || 'Failed to delete messages');
    }
  };

  const updateRole = async (userId, role) => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ userId, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update role');

      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: json.profile.role } : p))
      );
    } catch (e) {
      setError(e.message || 'Failed to update role');
    }
  };

  const saveMyProfile = async () => {
    if (!myProfile) return;
    setError('');
    setSavingProfile(true);
    try {
      const { error: updateErr, data: updated } = await supabase
        .from('profiles')
        .update({
          full_name: myProfile.full_name || null,
          company: myProfile.company || null,
          project_name: myProfile.project_name || null,
        })
        .eq('id', myProfile.id)
        .select('id, email, role, full_name, company, project_name')
        .single();

      if (updateErr) {
        throw updateErr;
      }

      setMyProfile(updated);
      setProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    } catch (e) {
      setError(e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const inviteUser = async () => {
    if (!inviteForm.email) {
      setError('Email is required to invite a user.');
      return;
    }
    setError('');
    setInvitingUser(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          email: inviteForm.email,
          full_name: inviteForm.full_name || null,
          role: inviteForm.role,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to invite user');

      setProfiles((prev) => [...prev, json.profile]);
      setInviteForm({ email: '', role: 'user', full_name: '' });
      setShowInviteModal(false);
    } catch (e) {
      setError(e.message || 'Failed to invite user');
    } finally {
      setInvitingUser(false);
    }
  };

  const confirmAndUpdateRole = async (userId, newRole) => {
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update role');

      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: json.profile.role } : p))
      );
      setConfirmRoleChange(null);
    } catch (e) {
      setError(e.message || 'Failed to update role');
    }
  };

  const handleResetPassword = async (userEmail) => {
    setError('');
    setResettingPassword(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/portal/reset-password`,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email');
      } else {
        setError('');
        alert(`Password reset email sent to ${userEmail}`);
      }
      setResetPasswordUser(null);
    } catch (e) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Checking access...</div>
    );
  }

  if (!allowed) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">
        Not authorized.
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/portal/login');
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Admin Panel</h1>
          <p className="text-gray-600 text-sm">
            Home dashboard for your client work plus tools to manage accounts and roles.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-600 border px-3 py-1.5 rounded-md hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex gap-4 text-xs">
          <button
            type="button"
            onClick={() => router.push('/portal')}
            className="pb-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-1 border-b-2 ${
              activeTab === 'profile'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-1 border-b-2 ${
              activeTab === 'users'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Users & Roles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`pb-2 px-1 border-b-2 ${
              activeTab === 'messages'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Messages
          </button>
        </nav>
      </div>
      {activeTab === 'profile' && myProfile && (
        <>
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="border rounded-lg bg-white p-4">
            <p className="text-[11px] text-gray-500 mb-1">Total clients</p>
            <p className="text-xl font-semibold text-gray-900">
              {loadingDashboard ? '—' : dashboard.metrics.totalClients}
            </p>
          </div>
          <div className="border rounded-lg bg-white p-4">
            <p className="text-[11px] text-gray-500 mb-1">Active projects</p>
            <p className="text-xl font-semibold text-gray-900">
              {loadingDashboard ? '—' : dashboard.metrics.activeProjects}
            </p>
          </div>
          <div className="border rounded-lg bg-white p-4">
            <p className="text-[11px] text-gray-500 mb-1">Open tasks</p>
            <p className="text-xl font-semibold text-gray-900">
              {loadingDashboard ? '—' : dashboard.metrics.openTasks}
            </p>
          </div>
          <div className="border rounded-lg bg-white p-4">
            <p className="text-[11px] text-gray-500 mb-1">Unread messages</p>
            <p className="text-xl font-semibold text-gray-900">
              {loadingDashboard ? '—' : dashboard.metrics.unreadMessages}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="border rounded-lg bg-white p-4">
            <h2 className="text-sm font-semibold mb-2">Tasks due soon</h2>
            {loadingDashboard ? (
              <p className="text-[11px] text-gray-600">Loading tasks...</p>
            ) : dashboard.tasksDueSoon.length === 0 ? (
              <p className="text-[11px] text-gray-600">No tasks due in the next 7 days.</p>
            ) : (
              <ul className="space-y-2">
                {dashboard.tasksDueSoon.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-gray-800 truncate">{t.title}</p>
                      <p className="text-[11px] text-gray-500">{t.status}</p>
                    </div>
                    <p className="text-[11px] text-gray-600 whitespace-nowrap">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border rounded-lg bg-white p-4">
            <h2 className="text-sm font-semibold mb-2">Clients needing outreach</h2>
            {loadingDashboard ? (
              <p className="text-[11px] text-gray-600">Loading clients...</p>
            ) : dashboard.clientsNeedingOutreach.length === 0 ? (
              <p className="text-[11px] text-gray-600">All clients have recent messages.</p>
            ) : (
              <ul className="space-y-2">
                {dashboard.clientsNeedingOutreach.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-gray-800 truncate">{c.full_name || c.email}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {c.company || 'No company'}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-600 whitespace-nowrap">
                      {c.last_message_at
                        ? new Date(c.last_message_at).toLocaleDateString()
                        : 'No messages yet'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mb-8 border rounded-lg bg_WHITE p-4">
          <h2 className="text-sm font-semibold mb-3">My profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                value={myProfile.full_name || ''}
                onChange={(e) =>
                  setMyProfile((prev) => ({ ...prev, full_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Company</label>
              <input
                type="text"
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                value={myProfile.company || ''}
                onChange={(e) =>
                  setMyProfile((prev) => ({ ...prev, company: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Project</label>
              <input
                type="text"
                className="w-full border rounded-md px-2 py-1.5 text-xs"
                value={myProfile.project_name || ''}
                onChange={(e) =>
                  setMyProfile((prev) => ({ ...prev, project_name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-md px-2 py-1.5 text-xs bg-gray-50 text-gray-500 cursor-not-allowed"
                value={myProfile.email || ''}
                disabled
              />
            </div>
          </div>
          <button
            type="button"
            onClick={saveMyProfile}
            disabled={savingProfile}
            className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </div>
        </>
      )}
      {activeTab === 'messages' && (
        <div className="mb-8 border rounded-lg bg-white p-4 text-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold mb-1">Client messages</h2>
              <p className="text-[11px] text-gray-600">
                View, send, and manage messages for your clients.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshAdminMessages}
              className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="mb-4 border rounded-lg bg-gray-50 p-3">
            <h3 className="text-[12px] font-semibold mb-2">Send message</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Client</label>
                <select
                  className="w-full border rounded-md px-2 py-1.5 text-xs bg-white"
                  value={compose.userId}
                  onChange={(e) => setCompose((prev) => ({ ...prev, userId: e.target.value }))}
                >
                  <option value="">Select client...</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email} ({p.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-2 py-1.5 text-xs"
                  value={compose.subject}
                  onChange={(e) => setCompose((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Next steps, New dashboard ready, Data request"
                />
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Body</label>
              <textarea
                className="w-full border rounded-md px-2 py-1.5 text-xs min-h-[80px]"
                value={compose.body}
                onChange={(e) => setCompose((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Write your message to the client here."
              />
            </div>
            <button
              type="button"
              onClick={sendAdminMessage}
              disabled={sendingMessage}
              className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingMessage ? 'Sending...' : 'Send message'}
            </button>
          </div>
          {loadingAdminMessages ? (
            <p className="text-[11px] text-gray-600">Loading messages...</p>
          ) : adminMessages.length === 0 ? (
            <p className="text-[11px] text-gray-600">No messages found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-1 font-medium">Client</th>
                    <th className="px-2 py-1 font-medium">Email</th>
                    <th className="px-2 py-1 font-medium">Subject</th>
                    <th className="px-2 py-1 font-medium">Status</th>
                    <th className="px-2 py-1 font-medium">Sent</th>
                    <th className="px-2 py-1 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {adminMessages.map((m) => (
                    <tr key={m.id}>
                      <td className="px-2 py-1 text-gray-800">{m.profile?.full_name || m.profile?.email || '—'}</td>
                      <td className="px-2 py-1 text-gray-800">{m.profile?.email || '—'}</td>
                      <td className="px-2 py-1 text-gray-800">{m.subject}</td>
                      <td className="px-2 py-1 text-gray-800">
                        {m.read_at ? (
                          <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px]">
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-500/10 text-red-600 px-2 py-0.5 text-[10px]">
                            New
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-gray-600">
                        {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                      </td>
                      <td className="px-2 py-1 text-gray-800">
                        <div className="flex flex-wrap gap-2">
                          {!m.read_at && (
                            <button
                              type="button"
                              onClick={() => updateAdminMessagesRead([m.id], true)}
                              className="px-2 py-1 border rounded-md text-[10px] bg-white hover:bg-gray-50 text-[var(--brand-primary)] border-[var(--brand-primary)]"
                            >
                              Mark read
                            </button>
                          )}
                          {m.read_at && (
                            <button
                              type="button"
                              onClick={() => updateAdminMessagesRead([m.id], false)}
                              className="px-2 py-1 border rounded-md text-[10px] bg-white hover:bg-gray-50"
                            >
                              Mark unread
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteAdminMessages([m.id])}
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
      )}
      {activeTab === 'users' && (
        <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Users & Roles</h2>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)]"
        >
          Invite user
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full border rounded-md px-3 py-2 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="w-full border rounded-md px-3 py-2 text-xs bg-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">Client</option>
          </select>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {profiles
              .filter((p) => {
                const matchesSearch = searchQuery === '' || 
                  (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchesRole = roleFilter === 'all' || p.role === roleFilter;
                return matchesSearch && matchesRole;
              })
              .map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 text-[12px] text-gray-800">
                  {p.full_name || '—'}
                  {!p.full_name && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-200">
                      Incomplete profile
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-800">{p.email}</td>
                <td className="px-4 py-2 text-[12px]">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    p.role === 'admin' 
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {p.role === 'admin' ? 'Admin' : 'Client'}
                  </span>
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-600">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-2 text-[12px] text-gray-700">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/clients/${p.id}`)}
                      className="px-2 py-1 border rounded-md text-xs bg-white hover:bg-gray-50"
                    >
                      Manage
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetPasswordUser({ email: p.email, name: p.full_name || p.email })}
                      className="px-2 py-1 border rounded-md text-xs bg-white hover:bg-gray-50"
                    >
                      Reset password
                    </button>
                    {p.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => setConfirmRoleChange({ userId: p.id, newRole: 'admin', userName: p.full_name || p.email })}
                        className="px-2 py-1 border rounded-md text-xs bg-white hover:bg-gray-50 text-[var(--brand-primary)] border-[var(--brand-primary)]"
                      >
                        Set role: Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Invite user</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="user@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name (optional)</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="John Doe"
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="user">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteForm({ email: '', role: 'user', full_name: '' });
                }}
                className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={inviteUser}
                disabled={invitingUser}
                className="px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {invitingUser ? 'Inviting...' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRoleChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm role change</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to change <strong>{confirmRoleChange.userName}</strong> to <strong>{confirmRoleChange.newRole === 'admin' ? 'Admin' : 'Client'}</strong>?
              {confirmRoleChange.newRole === 'admin' && (
                <span className="block mt-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
                  ⚠️ Admin users have full access to all system features.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRoleChange(null)}
                className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmAndUpdateRole(confirmRoleChange.userId, confirmRoleChange.newRole)}
                className="px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)]"
              >
                Confirm change
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Reset password</h3>
            <p className="text-sm text-gray-600 mb-6">
              Send a password reset email to <strong>{resetPasswordUser.name}</strong> at <strong>{resetPasswordUser.email}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
                disabled={resettingPassword}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResetPassword(resetPasswordUser.email)}
                disabled={resettingPassword}
                className="px-4 py-2 border rounded-md text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resettingPassword ? 'Sending...' : 'Send reset email'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
