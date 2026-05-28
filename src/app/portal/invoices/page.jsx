'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

const API_URL = '/api/proxy';

export default function PortalInvoicesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadInvoices = async () => {
    try {
      const session = await auth.getSession();
      
      if (!session.authenticated) {
        router.replace('/portal/login');
        return;
      }

      setUser(session.user);

      // TODO: Replace with FastAPI endpoint when ready
      const res = await fetch(`${API_URL}/invoices/`, {
        credentials: 'include',
      });
      const data = await res.json();
      setInvoices(data || []);

      // Load unread count
      try {
        const { count } = await fetch(`${API_URL}/messages/unread-count`, {
          credentials: 'include',
        }).then(r => r.json());
        setUnreadMessages(count || 0);
      } catch (e) {}
    } catch (e) {
      console.error(e);
      router.replace('/portal/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [router]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'waiting_for_payment': return 'bg-orange-100 text-orange-800';
      case 'not_due': return 'bg-blue-100 text-blue-800';
      case 'due_upon_completion': return 'bg-indigo-100 text-indigo-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user || loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Loading invoices...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-gray-600 text-sm mt-1">
            View your billing history and download invoices.
          </p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 bg-[var(--brand-primary)]/5 rounded-t-md">
        <nav className="flex flex-wrap gap-4 text-xs px-4 pt-3 items-center">
          <a
            href="/portal"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Home
          </a>
          <a
            href="/portal/uploads"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Upload data
          </a>
          <a
            href="/portal/invoices"
            className="inline-flex items-center rounded-t-md bg-[var(--brand-primary)] text-white px-3 pb-2 border-b-2 border-[var(--brand-primary)]"
          >
            View &amp; pay invoices
          </a>
          <a
            href="/portal/reports"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            Dashboards &amp; deliverables
          </a>
          <a
            href="/portal/messages"
            className="ml-auto inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
          >
            <span>Messages</span>
            {unreadMessages > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] w-4 h-4">
                {unreadMessages}
              </span>
            )}
          </a>
        </nav>
      </div>
      {invoices.length === 0 ? (
        <p className="text-sm text-gray-600">No invoices found yet.</p>
      ) : (
        <div className="border rounded-lg bg-white divide-y">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Invoice {inv.number || inv.id}</span>
                  {inv.type === 'uploaded' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      PDF
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {inv.description && <span>{inv.description}</span>}
                  {inv.invoice_date && <span> · Date: {new Date(inv.invoice_date).toLocaleDateString()}</span>}
                  {inv.due_date && <span> · Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium">{formatAmount(inv.amount_due, inv.currency)}</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(inv.status)}`}>
                    {getStatusLabel(inv.status)}
                  </span>
                </div>
                {inv.file_url && (
                  <a
                    href={inv.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 rounded-md border text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
