'use client';

import { useState } from 'react';
import AdminDocumentUpload from './AdminDocumentUpload';
import AdminDocumentManager from './AdminDocumentManager';
import AdminInvoiceUpload from './AdminInvoiceUpload';
import AdminInvoiceManager from './AdminInvoiceManager';

export default function ClientDataFiles({ clientId }) {
  const [activeTab, setActiveTab] = useState('uploads');

  const tabs = [
    { id: 'uploads', label: 'Data Uploads', icon: '📊' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'invoices', label: 'Invoices', icon: '💰' }
  ];

  return (
    <div className="bg-white border rounded-lg">
      {/* Tab Header */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'uploads' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Client Data Uploads</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload raw data files for analysis. These appear in the client portal as data uploads.
              </p>
              {/* Add existing uploads component here */}
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Uploads component will be added here</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Management</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload and manage contracts, proposals, reports, and other business documents.
              </p>
              <AdminDocumentUpload 
                clientId={clientId}
                onDocumentUploaded={(document) => {
                  console.log('Document uploaded:', document);
                }}
              />
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Document Library</h4>
              <AdminDocumentManager 
                clientId={clientId}
                onDocumentUpdated={(document) => {
                  console.log('Document updated:', document);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice Management</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload and manage client invoices. Track payment status and due dates.
              </p>
              <AdminInvoiceUpload 
                clientId={clientId}
                onInvoiceUploaded={(invoice) => {
                  console.log('Invoice uploaded:', invoice);
                }}
              />
            </div>
            
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Invoice Library</h4>
              <AdminInvoiceManager 
                clientId={clientId}
                onInvoiceUpdated={(invoice) => {
                  console.log('Invoice updated:', invoice);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
