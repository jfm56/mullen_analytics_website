'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDocumentUpload({ clientId, onDocumentUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentData, setDocumentData] = useState({
    title: '',
    category: 'general',
    description: '',
    tags: ''
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Accept common document types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF, Word, Excel, PowerPoint, text, and image files are allowed');
        return;
      }
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        setError('File size must be less than 25MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleInputChange = (field, value) => {
    setDocumentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadDocument = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (!documentData.title || !documentData.category) {
      setError('Please fill in title and category');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientId', clientId);
      formData.append('upload_type', 'document');
      formData.append('title', documentData.title);
      formData.append('category', documentData.category);
      formData.append('description', documentData.description);
      formData.append('tags', documentData.tags);

      // Upload file
      const uploadRes = await fetch('/api/admin/clients/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData
      });

      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error || 'Upload failed');

      setSuccess('Document uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setDocumentData({
        title: '',
        category: 'general',
        description: '',
        tags: ''
      });

      // Reset file input
      const fileInput = document.getElementById('document-file-input');
      if (fileInput) fileInput.value = '';

      // Notify parent component
      if (onDocumentUploaded) {
        onDocumentUploaded(uploadResult.document);
      }

      setTimeout(() => setSuccess(''), 3000);

    } catch (e) {
      setError(e.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-lg bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
      
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

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document File *
          </label>
          <input
            id="document-file-input"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            PDF, Word, Excel, PowerPoint, text, and image files (max 25MB)
          </p>
        </div>

        {/* Document Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={documentData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Contract, Proposal, Report, etc."
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={documentData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              disabled={uploading}
            >
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
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={documentData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
            placeholder="Document description or notes"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <input
            type="text"
            value={documentData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="tag1, tag2, tag3"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate tags with commas
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={uploadDocument}
            disabled={uploading || !selectedFile}
            className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
