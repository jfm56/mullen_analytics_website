'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, dataUploads } from '@/lib/api';
import DataExplorer from '@/components/DataExplorer';

export default function PortalDataExplorerPage() {
  const { uploadId } = useParams();
  const router = useRouter();
  const [upload, setUpload] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await auth.getSession();
        if (!s.authenticated) {
          router.replace('/portal/login');
          return;
        }
        const u = await dataUploads.get(uploadId);
        setUpload(u);
      } catch {
        router.replace('/portal/uploads');
      } finally {
        setAuthLoading(false);
      }
    };
    init();
  }, [uploadId, router]);

  if (authLoading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Loading…</div>
  );

  return (
    <div className="app-page-height flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b flex-shrink-0">
        <Link href="/portal/uploads" className="text-sm text-blue-600 hover:underline">← My Uploads</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700 truncate max-w-sm">
          {upload?.original_filename || uploadId}
        </span>
        {upload?.upload_status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            upload.upload_status === 'CLEANED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {upload.upload_status}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <DataExplorer
          uploadId={uploadId}
          uploadName={upload?.original_filename}
          isAdmin={false}
        />
      </div>
    </div>
  );
}
