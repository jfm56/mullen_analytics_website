'use client';

import { useState } from 'react';
import { fmtDate } from '@/lib/datetime';

const INVOICE_STATUSES = ['pending', 'paid', 'overdue', 'cancelled', 'draft'];

export default function ClientBillingTab({ clientId, projects, invoices, onRefresh }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    if (filterProject !== 'all' && inv.project_id !== filterProject) return false;
    return true;
  });

  // Calculate totals
  const totalPending = invoices
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + (i.amount_due || 0), 0) / 100;
  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + (i.amount_due || 0), 0) / 100;
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + (i.amount_due || 0), 0) / 100;

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg bg-white p-4">
          <p className="text-[11px] text-gray-500 mb-1">Pending</p>
          <p className="text-xl font-semibold text-yellow-600">${totalPending.toLocaleString()}</p>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <p className="text-[11px] text-gray-500 mb-1">Overdue</p>
          <p className="text-xl font-semibold text-red-600">${totalOverdue.toLocaleString()}</p>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <p className="text-[11px] text-gray-500 mb-1">Paid (Total)</p>
          <p className="text-xl font-semibold text-green-600">${totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Invoices ({invoices.length})</h2>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="all">All Statuses</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
        </div>
      </div>

      {/* QuickBooks Integration Notice */}
      <div className="border rounded-lg bg-blue-50 p-4 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-blue-600">ℹ️</span>
          <div>
            <p className="font-medium text-blue-800">QuickBooks Integration</p>
            <p className="text-blue-700 mt-1">
              Invoice sync with QuickBooks is available. Synced invoices will show payment links 
              that clients can use to pay directly through QuickBooks.
            </p>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="border rounded-lg bg-white p-8 text-center text-gray-500 text-sm">
          {invoices.length === 0 ? 'No invoices yet.' : 'No invoices match the current filters.'}
        </div>
      ) : (
        <div className="border rounded-lg bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Project</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Due Date</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Source</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvoices.map((invoice) => {
                const project = projects.find((p) => p.id === invoice.project_id);
                const isQuickBooks = invoice.type === 'quickbooks' || invoice.quickbooks_invoice_id;
                return (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-medium">
                      {invoice.number || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {invoice.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {project?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(invoice.amount_due || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {invoice.due_date ? fmtDate(invoice.due_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isQuickBooks ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          QuickBooks
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {invoice.type || 'uploaded'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {(invoice.quickbooks_payment_url || invoice.hosted_invoice_url) && (
                          <a
                            href={invoice.quickbooks_payment_url || invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Pay Link
                          </a>
                        )}
                        {invoice.file_url && (
                          <a
                            href={invoice.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700"
                          >
                            View
                          </a>
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
