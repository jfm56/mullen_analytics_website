'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';

export default function PortalUploadsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploadSettings, setUploadSettings] = useState(null);
  const unreadMessages = useUnreadMessagesCount();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
        return;
      }
      
      setUser(session.user);
      
      // Load upload settings and uploads
      const { data: profile } = await supabase
        .from('profiles')
        .select('upload_enabled, allowed_file_types, max_upload_mb')
        .eq('id', session.user.id)
        .single();
      
      setUploadSettings(profile);
      
      if (profile?.upload_enabled) {
        await loadUploads(session.access_token, session.user.id);
      }
    };

    init();
  }, [router]);

  const loadUploads = async (accessToken, clientId) => {
    try {
      setLoadingUploads(true);
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/uploads`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load uploads');
      setUploads(json.uploads || []);
    } catch (e) {
      setStatus(e.message || 'Failed to load uploads');
    } finally {
      setLoadingUploads(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !user) return;
    setStatus('');
    setUploadingFile(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setStatus('Missing session. Please sign in again.');
        setUploadingFile(false);
        return;
      }

      // Step 1: Get presigned URL
      const presignRes = await fetch(`/api/clients/${encodeURIComponent(user.id)}/uploads/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          sizeBytes: selectedFile.size,
        }),
      });

      const presignJson = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignJson.error || 'Failed to get upload URL');

      // Step 2: Upload to S3
      const formData = new FormData();
      Object.entries(presignJson.upload.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', selectedFile);

      const uploadRes = await fetch(presignJson.upload.url, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to S3');
      }

      // Step 3: Refresh uploads list
      await loadUploads(accessToken, user.id);
      setSelectedFile(null);
      setStatus('File uploaded successfully!');
      
      // Reset file input
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';
    } catch (e) {
      setStatus(e.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownload = async (uploadId, filename) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const res = await fetch(`/api/clients/${encodeURIComponent(user.id)}/uploads/${encodeURIComponent(uploadId)}/download`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to get download URL');

      // Open download URL in new tab
      window.open(json.url, '_blank');
    } catch (e) {
      setStatus(e.message || 'Failed to download file');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center text-gray-600 text-sm">Checking your session...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload data</h1>
          <p className="text-gray-600 text-sm mt-1">
            Upload CSVs, exports, or other files for analysis. Files are stored securely in AWS S3.
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
            className="inline-flex items-center rounded-t-md bg-[var(--brand-primary)] text-white px-3 pb-2 border-b-2 border-[var(--brand-primary)]"
          >
            Upload data
          </a>
          <a
            href="/portal/invoices"
            className="inline-flex items-center border-b-2 border-transparent pb-2 text-gray-600 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] px-3"
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

      {!uploadSettings?.upload_enabled ? (
        <div className="border rounded-lg p-6 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            File uploads are not currently enabled for your account. Please contact us if you need to upload data.
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={handleFileUpload} className="space-y-4 border rounded-lg p-6 bg-white mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select file to upload
              </label>
              <input
                id="file-upload-input"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-sm border rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Allowed types: {uploadSettings?.allowed_file_types || 'csv,xlsx,json,pdf'} • 
                Max size: {uploadSettings?.max_upload_mb || 50}MB
              </p>
            </div>
            <button
              type="submit"
              disabled={uploadingFile || !selectedFile}
              className="px-4 py-2 text-sm rounded-md bg-[var(--brand-primary)] text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[var(--brand-primary-dark,#1d3d73)]"
            >
              {uploadingFile ? 'Uploading...' : 'Upload file'}
            </button>
            {status && (
              <p className={`text-sm mt-2 ${status.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {status}
              </p>
            )}
          </form>

          <div className="border rounded-lg bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Your Uploaded Files</h2>
            {loadingUploads ? (
              <p className="text-sm text-gray-600">Loading uploads...</p>
            ) : uploads.length === 0 ? (
              <p className="text-sm text-gray-600">No files uploaded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2 font-medium">Filename</th>
                      <th className="px-4 py-2 font-medium">Size</th>
                      <th className="px-4 py-2 font-medium">Uploaded</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {uploads.map((upload) => (
                      <tr key={upload.id}>
                        <td className="px-4 py-3 text-gray-800">{upload.original_filename}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {(upload.size_bytes / 1024 / 1024).toFixed(2)} MB
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(upload.uploaded_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            upload.status === 'done' ? 'bg-green-50 text-green-700' :
                            upload.status === 'error' ? 'bg-red-50 text-red-700' :
                            upload.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                            'bg-gray-50 text-gray-700'
                          }`}>
                            {upload.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDownload(upload.id, upload.original_filename)}
                            className="px-3 py-1 border rounded-md text-xs bg-white hover:bg-gray-50 text-[var(--brand-primary)] border-[var(--brand-primary)]"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
