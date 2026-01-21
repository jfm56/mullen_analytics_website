'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDocumentManager({ clientId, onDocumentUpdated }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (clientId) {
      loadDocuments();
    }
  }, [clientId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`/api/admin/clients/${clientId}/documents`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load documents');
      
      setDocuments(data.documents || []);
    } catch (e) {
      setError(e.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (document) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting document:', document.id);
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Delete the document
      const res = await fetch(`/api/admin/clients/${clientId}/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document');

      console.log('Document deleted successfully');
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      setSuccess('Document deleted successfully');
      setTimeout(() => setSuccess(''), 3000);

      if (onDocumentUpdated) {
        onDocumentUpdated({ deleted: true, id: document.id });
      }

    } catch (e) {
      console.error('Failed to delete document:', e);
      setError('Failed to delete document: ' + e.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const downloadDocument = async (document) => {
    try {
      console.log('Downloading document:', document.id);
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get signed URL for the file
      const res = await fetch(`/api/admin/clients/${clientId}/documents/${document.id}/file`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get file URL');

      console.log('Got signed URL:', data.url);
      
      // Open the signed URL in a new tab
      window.open(data.url, '_blank');
    } catch (e) {
      console.error('Failed to open document:', e);
      setError('Failed to open document: ' + e.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'contract': return 'bg-purple-100 text-purple-800';
      case 'proposal': return 'bg-blue-100 text-blue-800';
      case 'report': return 'bg-green-100 text-green-800';
      case 'invoice': return 'bg-red-100 text-red-800';
      case 'receipt': return 'bg-orange-100 text-orange-800';
      case 'presentation': return 'bg-pink-100 text-pink-800';
      case 'template': return 'bg-indigo-100 text-indigo-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredDocuments = filter === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === filter);

  if (loading) {
    return (
      <div className="border rounded-lg bg-white p-6">
        <div className="text-center text-gray-600 text-sm">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border rounded-md px-2 py-1"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="contract">Contract</option>
            <option value="proposal">Proposal</option>
            <option value="report">Report</option>
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
            <option value="presentation">Presentation</option>
            <option value="template">Template</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={loadDocuments}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          {success}
        </div>
      )}

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">
            {filter === 'all' ? 'No documents found for this client.' : `No ${filter} documents found.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {document.title}
                      </div>
                      {document.description && (
                        <div className="text-sm text-gray-500">
                          {document.description}
                        </div>
                      )}
                      {document.tags && (
                        <div className="mt-1">
                          <div className="flex flex-wrap gap-1">
                            {document.tags.split(',').map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                      {document.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatFileSize(document.size_bytes)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatDate(document.uploaded_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadDocument(document)}
                        className="text-xs px-2 py-1 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                        title="View Document"
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteDocument(document)}
                        className="text-xs px-2 py-1 rounded-md border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        title="Delete Document"
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
  );
}
