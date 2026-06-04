'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, Search, RefreshCw, UserCog, Trash2, KeyRound, Eye } from 'lucide-react';
import ErrorAlert from '@/components/ui/ErrorAlert';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // modals
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', full_name: '', company: '', role: 'client' });
  const [creating, setCreating] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const [editUser, setEditUser] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmRole, setConfirmRole] = useState(null);
  const [savingRole, setSavingRole] = useState(false);

  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [resetUser, setResetUser] = useState(null);
  const [resetting, setResetting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/users/', { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/proxy/auth/session', { credentials: 'include' });
        const s = await res.json();
        if (!s.authenticated || s.profile?.role !== 'admin') {
          router.replace('/portal/login');
          return;
        }
        setAuthOk(true);
        loadUsers();
        // Auto-open the invite form when arriving from "+ Invite client" (role
        // defaults to client). Read the query directly to avoid a useSearchParams
        // Suspense boundary at build time.
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('invite')) {
          setCreatedUser(null);
          setCreateModal(true);
        }
      } catch {
        router.replace('/portal/login');
      }
    })();
  }, [router, loadUsers]);

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.company?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  async function handleCreate() {
    if (!createForm.email) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/users/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Status ${res.status}`);
      }
      const data = await res.json();
      setCreatedUser(data);
      setCreateForm({ email: '', full_name: '', company: '', role: 'client' });
      loadUsers();
    } catch (e) {
      setError(e.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSavingEdit(true);
    setError('');
    try {
      const res = await fetch(`/api/proxy/users/${editUser.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editUser.full_name,
          company: editUser.company,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setEditUser(null);
      loadUsers();
    } catch (e) {
      setError(e.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirmRole() {
    if (!confirmRole) return;
    setSavingRole(true);
    setError('');
    try {
      const res = await fetch(`/api/proxy/users/${confirmRole.id}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: confirmRole.newRole }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setConfirmRole(null);
      loadUsers();
    } catch (e) {
      setError(e.message || 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/proxy/users/${deleteUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) throw new Error(`Status ${res.status}`);
      setDeleteUser(null);
      loadUsers();
    } catch (e) {
      setError(e.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetPassword() {
    if (!resetUser) return;
    setResetting(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/auth/request-password-reset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetUser.email }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setResetUser(null);
    } catch (e) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setResetting(false);
    }
  }

  if (!authOk) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        <RefreshCw size={16} className="animate-spin mr-2" /> Checking access…
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog size={20} /> Users &amp; Roles
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system users, roles, and access.</p>
        </div>
        <button
          onClick={() => { setCreateModal(true); setCreatedUser(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} /> New User
        </button>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError('')} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="client">Client</option>
        </select>
        <button onClick={loadUsers} disabled={loading} className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            <RefreshCw size={14} className="animate-spin mr-2" /> Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <Users size={24} />
            {search || roleFilter !== 'all' ? 'No users match your filters.' : 'No users yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {u.full_name || <span className="text-gray-400 italic">No name</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.company || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        u.role === 'admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Client'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        u.client_status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {u.client_status || 'prospect'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Link
                          href={`/admin/clients/${u.id}`}
                          title="View client profile"
                          className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={13} />
                        </Link>
                        <button
                          onClick={() => setEditUser({ ...u })}
                          title="Edit user"
                          className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <UserCog size={13} />
                        </button>
                        <button
                          onClick={() => setResetUser({ id: u.id, email: u.email, name: u.full_name || u.email })}
                          title="Reset password"
                          className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <KeyRound size={13} />
                        </button>
                        {u.role !== 'admin' ? (
                          <button
                            onClick={() => setConfirmRole({ id: u.id, name: u.full_name || u.email, newRole: 'admin' })}
                            title="Promote to admin"
                            className="text-[10px] px-2 py-1 border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 transition-colors"
                          >
                            → Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmRole({ id: u.id, name: u.full_name || u.email, newRole: 'client' })}
                            title="Demote to client"
                            className="text-[10px] px-2 py-1 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            → Client
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteUser({ id: u.id, name: u.full_name || u.email })}
                          title="Delete user"
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="px-4 py-2 border-t text-[11px] text-gray-400 bg-gray-50">
            {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {/* ── Create User Modal ── */}
      {createModal && !createdUser && (
        <Modal title="Create New User" onClose={() => setCreateModal(false)}>
          <div className="space-y-3 mb-5">
            {[
              { label: 'Email *', key: 'email', type: 'email', placeholder: 'user@example.com' },
              { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Jane Smith' },
              { label: 'Company', key: 'company', type: 'text', placeholder: 'City Fire Dept' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={createForm[key]}
                  onChange={e => setCreateForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={creating || !createForm.email} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Create Success — show temp password ── */}
      {createModal && createdUser && (
        <Modal title="User Created" onClose={() => { setCreateModal(false); setCreatedUser(null); }}>
          <div className="mb-4 text-sm text-gray-700 space-y-2">
            <p>Account created for <strong>{createdUser.email}</strong>.</p>
            <p>Share this temporary password with the user — it will not be shown again:</p>
            <div className="mt-2 bg-gray-900 text-green-400 font-mono text-sm px-4 py-3 rounded-lg tracking-wide select-all">
              {createdUser.temporary_password}
            </div>
            <p className="text-xs text-gray-400">An invite email was also sent if email is configured.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => { setCreateModal(false); setCreatedUser(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Done</button>
          </div>
        </Modal>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div className="space-y-3 mb-5">
            {[
              { label: 'Full Name', key: 'full_name', type: 'text' },
              { label: 'Company', key: 'company', type: 'text' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={editUser[key] || ''}
                  onChange={e => setEditUser(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={editUser.email} disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setEditUser(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveEdit} disabled={savingEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Confirm Role Change ── */}
      {confirmRole && (
        <Modal title="Confirm Role Change" onClose={() => setConfirmRole(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Change <strong>{confirmRole.name}</strong> to <strong>{confirmRole.newRole === 'admin' ? 'Admin' : 'Client'}</strong>?
          </p>
          {confirmRole.newRole === 'admin' && (
            <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ Admin users have full access to all system data and settings.
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmRole(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleConfirmRole} disabled={savingRole} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {savingRole ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteUser && (
        <Modal title="Delete User" onClose={() => setDeleteUser(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete <strong>{deleteUser.name}</strong> and all their data? This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteUser(null)} disabled={deleting} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Delete User'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Reset Password ── */}
      {resetUser && (
        <Modal title="Reset Password" onClose={() => setResetUser(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Send a password reset email to <strong>{resetUser.email}</strong>?
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setResetUser(null)} disabled={resetting} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleResetPassword} disabled={resetting} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
              {resetting ? 'Sending…' : 'Send Reset Email'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
