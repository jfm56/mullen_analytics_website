'use client';

import { useState } from 'react';
import { projects } from '@/lib/api';

const PROJECT_STATUSES = ['active', 'completed', 'on_hold', 'archived'];
const PROJECT_PHASES = ['discovery', 'planning', 'execution', 'review', 'completed'];

export default function ClientProjectsTab({ clientId, projects: projectList, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    phase: 'discovery',
    start_date: '',
    deadline: '',
    contract_value: '',
    tableau_embed_html: '',
    tableau_open_url: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      phase: 'discovery',
      start_date: '',
      deadline: '',
      contract_value: '',
      tableau_embed_html: '',
      tableau_open_url: '',
    });
    setEditingProject(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (project) => {
    setFormData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'active',
      phase: project.phase || 'discovery',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      deadline: project.deadline ? project.deadline.split('T')[0] : '',
      contract_value: project.contract_value || '',
      tableau_embed_html: project.tableau_embed_html || '',
      tableau_open_url: project.tableau_open_url || '',
    });
    setEditingProject(project);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        client_id: clientId,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : 0,
        start_date: formData.start_date || null,
        deadline: formData.deadline || null,
      };

      if (editingProject) {
        await projects.update(editingProject.id, payload);
      } else {
        await projects.create(payload);
      }

      resetForm();
      onRefresh?.();
    } catch (e) {
      setError(e.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (projectId) => {
    if (!confirm('Are you sure you want to archive this project?')) return;
    
    try {
      await projects.archive(projectId);
      onRefresh?.();
    } catch (e) {
      setError(e.message || 'Failed to archive project');
    }
  };

  const handleRestore = async (projectId) => {
    try {
      await projects.restore(projectId);
      onRefresh?.();
    } catch (e) {
      setError(e.message || 'Failed to restore project');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Projects ({projectList.length})</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-md hover:opacity-90"
          >
            + New Project
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="border rounded-lg bg-white p-4">
          <h3 className="text-sm font-semibold mb-4">
            {editingProject ? 'Edit Project' : 'New Project'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Enter project name"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Project description"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Phase</label>
                <select
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {PROJECT_PHASES.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Contract Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Dashboard URL</label>
                <input
                  type="url"
                  value={formData.tableau_open_url}
                  onChange={(e) => setFormData({ ...formData, tableau_open_url: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Dashboard Embed HTML</label>
                <textarea
                  value={formData.tableau_embed_html}
                  onChange={(e) => setFormData({ ...formData, tableau_embed_html: e.target.value })}
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm font-mono text-xs"
                  placeholder="<iframe>...</iframe>"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project List */}
      {projectList.length === 0 ? (
        <div className="border rounded-lg bg-white p-8 text-center text-gray-500 text-sm">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {projectList.map((project) => (
            <div
              key={project.id}
              className={`border rounded-lg bg-white p-4 ${project.archived_at ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{project.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {project.phase}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-gray-600 mb-2">{project.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500">
                    {project.contract_value > 0 && (
                      <span>${parseFloat(project.contract_value).toLocaleString()}</span>
                    )}
                    {project.start_date && (
                      <span>Started: {new Date(project.start_date).toLocaleDateString()}</span>
                    )}
                    {project.deadline && (
                      <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span>{project.document_count || 0} docs</span>
                    <span>{project.upload_count || 0} uploads</span>
                    <span>{project.task_count || 0} tasks</span>
                    <span>{project.invoice_count || 0} invoices</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(project)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Edit
                  </button>
                  {project.archived_at ? (
                    <button
                      onClick={() => handleRestore(project.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(project.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
