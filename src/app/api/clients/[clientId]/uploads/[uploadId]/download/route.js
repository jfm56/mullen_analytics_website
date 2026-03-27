import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createPresignedDownloadUrl } from '@/lib/aws/s3';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getUserClient(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function GET(request, { params }) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { clientId, uploadId } = await params;

    // Authenticate user
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    const userClient = getUserClient(token || '');
    if (!userClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: userProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role, id')
      .eq('id', user.id)
      .single();

    if (profileErr || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization: Admin can download any client's files, regular users only their own
    const isAdmin = userProfile.role === 'admin';
    const isOwnClient = userProfile.id === clientId;

    if (!isAdmin && !isOwnClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch upload record
    const { data: upload, error: uploadErr } = await supabaseAdmin
      .from('uploads')
      .select('id, client_id, s3_key, original_filename')
      .eq('id', uploadId)
      .single();

    if (uploadErr || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Verify client_id matches
    if (upload.client_id !== clientId) {
      return NextResponse.json({ error: 'Upload does not belong to this client' }, { status: 403 });
    }

    // Generate presigned download URL
    const url = await createPresignedDownloadUrl(upload.s3_key);

    // Log the download event
    // eslint-disable-next-line no-console
    console.log('Download presigned:', {
      clientId,
      userId: user.id,
      uploadId,
      filename: upload.original_filename,
    });

    return NextResponse.json({ url, filename: upload.original_filename });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Presign download API error:', e);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
