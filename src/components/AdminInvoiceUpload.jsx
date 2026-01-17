'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminInvoiceUpload({ clientId, onInvoiceUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    amount_cents: '',
    currency: 'USD',
    description: ''
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Only allow PDF files for invoices
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed for invoices');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleInputChange = (field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadInvoice = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    if (!invoiceData.invoice_number || !invoiceData.invoice_date || !invoiceData.amount_cents) {
      setError('Please fill in all required invoice fields');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      console.log('AdminInvoiceUpload - Starting upload process');
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      console.log('AdminInvoiceUpload - Session obtained:', !!session);

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clientId', clientId);
      formData.append('upload_type', 'invoice');
      formData.append('invoice_number', invoiceData.invoice_number);
      formData.append('invoice_date', invoiceData.invoice_date);
      formData.append('due_date', invoiceData.due_date);
      formData.append('amount_cents', invoiceData.amount_cents);
      formData.append('currency', invoiceData.currency);
      formData.append('description', invoiceData.description);

      console.log('AdminInvoiceUpload - Form data created:', {
        file: selectedFile.name,
        clientId,
        invoice_number: invoiceData.invoice_number,
        invoice_date: invoiceData.invoice_date,
        amount_cents: invoiceData.amount_cents
      });

      // Upload file
      console.log('AdminInvoiceUpload - Sending API request');
      const uploadRes = await fetch('/api/admin/clients/upload-invoice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData
      });

      console.log('AdminInvoiceUpload - API response status:', uploadRes.status);
      
      const uploadResult = await uploadRes.json();
      console.log('AdminInvoiceUpload - API response data:', uploadResult);
      
      if (!uploadRes.ok) throw new Error(uploadResult.error || 'Upload failed');

      setSuccess('Invoice uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setInvoiceData({
        invoice_number: '',
        invoice_date: '',
        due_date: '',
        amount_cents: '',
        currency: 'USD',
        description: ''
      });

      // Reset file input
      const fileInput = document.getElementById('invoice-file-input');
      if (fileInput) fileInput.value = '';

      // Notify parent component
      if (onInvoiceUploaded) {
        onInvoiceUploaded(uploadResult.invoice);
      }

      setTimeout(() => setSuccess(''), 3000);

    } catch (e) {
      setError(e.message || 'Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-lg bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Invoice</h3>
      
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
            Invoice PDF *
          </label>
          <input
            id="invoice-file-input"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="w-full border rounded-md px-3 py-2 text-sm"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Only PDF files are accepted (max 10MB)
          </p>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number *
            </label>
            <input
              type="text"
              value={invoiceData.invoice_number}
              onChange={(e) => handleInputChange('invoice_number', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="INV-2024-001"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <input
              type="number"
              value={invoiceData.amount_cents}
              onChange={(e) => handleInputChange('amount_cents', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="10000"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter amount in cents (e.g., 10000 for $100.00)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Date *
            </label>
            <input
              type="date"
              value={invoiceData.invoice_date}
              onChange={(e) => handleInputChange('invoice_date', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={invoiceData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={invoiceData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              disabled={uploading}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={invoiceData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
            placeholder="Invoice description or notes"
            disabled={uploading}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={uploadInvoice}
            disabled={uploading || !selectedFile}
            className="inline-flex items-center px-4 py-2 border rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
