import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

const bucketName = process.env.GCS_BUCKET_NAME || 'mullen-analytics-data';

let storage;

function getStorage() {
  if (!storage) {
    storage = new Storage();
  }
  return storage;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // NOTE: For MVP we trust that the frontend only calls this when authenticated via Supabase.
    // In a production version you would verify the JWT with Supabase.

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = file.name || `upload-${Date.now()}`;
    const objectName = `unassigned/${Date.now()}-${fileName}`;

    const storageClient = getStorage();
    const bucket = storageClient.bucket(bucketName);
    const gcsFile = bucket.file(objectName);

    await gcsFile.save(buffer, {
      resumable: false,
      contentType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({ ok: true, path: objectName });
  } catch (e) {
    console.error('Upload error', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
