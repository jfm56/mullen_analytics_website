'use client';

import { useState } from 'react';
import { documents } from '@/lib/api';

const DOCUMENT_TYPES = ['proposal', 'contract', 'invoice', 'report', 'deliverable', 'data', 'other'];
const VISIBILITY_OPTIONS = [
  { value: 'client_visible', label: 'Client Visible' },
  { value: 'internal', label: 'Internal Only' },
  { value: 'admin_only', label: 'Admin Only' },
];

export default function ClientDocumentsTab({ clientId, projects, documents: documentList, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    document_type: 'deliverable',
    visibility: 'client_visible',
    original_filename: '',
    storage_path: '',
    content_type: '',
    size_bytes: 0,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      document_type: 'deliverable',
      visibility: 'client_visible',
      original_filename: '',
      storage_path: '',
      content_type: '',
      size_bytes: 0,
    });
    setEditingDoc(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (doc) => {
    setFormData({
      title: doc.title || '',
      description: doc.description || '',
      project_id: doc.project_id || '',
      document_type: doc.document_type || 'deliverable',
      visibility: doc.visibility || 'client_visible',
      original_filename: doc.original_filename || '',
      storage_path: doc.storage_path || '',
      content_type: doc.content_type || '',
      size_bytes: doc.size_bytes || 0,
    });
    setEditingDoc(doc);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Document title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        client_id: clientId,
        project_id: formData.project_id || null,
      };

      if (editingDoc) {
        await documents.update(editingDoc.id, payload);
      } else {
        // For now, we'll create a placeholder storage path
        // In production, this would be handled by file upload
        payload.storage_path = payload.storage_path || `/documents/${clientId}/${Date.now()}_${payload.original_filename || 'document'}`;
        payload.original_filename = payload.original_filename || payload.title;
        await documents.create(payload);
      }

      resetForm();
      onRefresh?.();
    } catch (e) {
      setError(e.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (docId) => {
    if (!confirm('Are you sure you want to archive this document?')) return;
    
    try {
      await documents.archive(docId);
      onRefresh?.();
    } catch (e) {
      setError(e.message || 'Failed to archive document');
    }
  };

  const handleRestore = async (docId) => {
    try {
      await documents.restore(docId);
      onRefresh?.();
    } catch (e) {
      setError(e.message || 'Failed to restore document');
    }
  };

  // Filter documents
  const filteredDocs = documentList.filter((doc) => {
    if (filterType !== 'all' && doc.document_type !== filterType) return false;
    if (filterProject !== 'all' && doc.project_id !== filterProject) return false;
    return true;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Documents ({documentList.length})</h2>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="all">All Projects</option>
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-md hover:opacity-90"
            >
              + Add Document
            </button>
          )}
        </div>
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
            {editingDoc ? 'Edit Document' : 'Add Document'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Document title"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Document description"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Project</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">No Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Document Type</label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {VISIBILITY_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Original Filename</label>
                <input
                  type="text"
                  value={formData.original_filename}
                  onChange={(e) => setFormData({ ...formData, original_filename: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="filename.pdf"
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
                {saving ? 'Saving...' : editingDoc ? 'Update Document' : 'Add Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="border rounded-lg bg-white p-8 text-center text-gray-500 text-sm">
          {documentList.length === 0 ? 'No documents yet.' : 'No documents match the current filters.'}
        </div>
      ) : (
        <div className="border rounded-lg bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Project</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Visibility</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Size</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDocs.map((doc) => {
                const project = projects.find((p) => p.id === doc.project_id);
                return (
                  <tr key={doc.id} className={doc.archived_at ? 'opacity-50 bg-gray-50' : ''}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        {doc.original_filename && (
                          <p className="text-gray-500">{doc.original_filename}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {doc.document_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {project?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full ${
                        doc.visibility === 'client_visible' ? 'bg-green-100 text-green-700' :
                        doc.visibility === 'internal' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {doc.visibility.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatFileSize(doc.size_bytes)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Edit
                        </button>
                        {doc.archived_at ? (
                          <button
                            onClick={() => handleRestore(doc.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(doc.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
