'use client';
import { useState, useEffect } from 'react';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/proxy/invoices', { credentials: 'include' })
      .then(r => r.json()).then(d => setInvoices(d || [])).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
        <p className="text-sm text-gray-500 mt-0.5">All client invoices</p>
      </div>
      <ErrorAlert message={error} onDismiss={() => setError('')} />
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? <div className="p-4"><SkeletonTable /></div> : invoices.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No invoices yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Invoice #','Client','Amount','Status','Due Date','Actions'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number || String(inv.id).slice(0,8)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{inv.client_id ? String(inv.client_id).slice(0,8)+'…' : '—'}</td>
                  <td className="px-4 py-3 text-xs font-medium">${((inv.amount_cents || 0)/100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    <a href={`/api/proxy/invoices/${inv.id}/pdf`} className="text-blue-600 hover:text-blue-800">Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
