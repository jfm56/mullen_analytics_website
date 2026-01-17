'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminInvoiceManager({ clientId, onInvoiceUpdated }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (clientId) {
      loadInvoices();
    }
  }, [clientId]);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`/api/admin/clients/${clientId}/invoices`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load invoices');
      
      setInvoices(data.invoices || []);
    } catch (e) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (invoice) => {
    if (!confirm(`Are you sure you want to delete invoice "${invoice.invoice_number}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting invoice:', invoice.id);
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Delete the invoice
      const res = await fetch(`/api/admin/clients/${clientId}/invoices/${invoice.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete invoice');

      console.log('Invoice deleted successfully');
      
      // Remove from local state
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      
      setSuccess('Invoice deleted successfully');
      setTimeout(() => setSuccess(''), 3000);

      if (onInvoiceUpdated) {
        onInvoiceUpdated({ deleted: true, id: invoice.id });
      }

    } catch (e) {
      console.error('Failed to delete invoice:', e);
      setError('Failed to delete invoice: ' + e.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const downloadInvoice = async (invoice) => {
    try {
      console.log('Downloading invoice:', invoice.id);
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get signed URL for the file
      const res = await fetch(`/api/admin/clients/${clientId}/invoices/${invoice.id}/file`, {
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
      console.error('Failed to open invoice:', e);
      setError('Failed to open invoice: ' + e.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`/api/admin/clients/${clientId}/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Update local state
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ));

      setSuccess('Invoice status updated successfully');
      setTimeout(() => setSuccess(''), 3000);

      if (onInvoiceUpdated) {
        onInvoiceUpdated(data.invoice);
      }

    } catch (e) {
      setError(e.message || 'Failed to update invoice status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'waiting_for_payment': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'not_due': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'due_upon_completion': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'waiting_for_payment': return 'Waiting for Payment';
      case 'not_due': return 'Not Due';
      case 'due_upon_completion': return 'Due Upon Completion';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      case 'draft': return 'Draft';
      default: return status;
    }
  };

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toLowerCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="border rounded-lg bg-white p-6">
        <div className="text-center text-gray-600 text-sm">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Invoice Management</h3>
        <button
          onClick={loadInvoices}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
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

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No invoices found for this client.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                      {invoice.description && (
                        <div className="text-sm text-gray-500">
                          {invoice.description}
                        </div>
                      )}
                      {invoice.type && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            invoice.type === 'uploaded' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {invoice.type === 'uploaded' ? 'PDF' : 'Stripe'}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatDate(invoice.invoice_date || invoice.created_at)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatAmount(invoice.amount_cents, invoice.currency)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={invoice.status}
                        onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                        className="text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="not_due">Not Due</option>
                        <option value="pending">Pending</option>
                        <option value="waiting_for_payment">Waiting for Payment</option>
                        <option value="due_upon_completion">Due Upon Completion</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      
                      {invoice.type === 'uploaded' && (
                        <button
                          onClick={() => downloadInvoice(invoice)}
                          className="text-xs px-2 py-1 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                          title="View PDF"
                        >
                          View PDF
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteInvoice(invoice)}
                        className="text-xs px-2 py-1 rounded-md border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        title="Delete Invoice"
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
