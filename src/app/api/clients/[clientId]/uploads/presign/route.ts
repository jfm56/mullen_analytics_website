import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  makeClientUploadKey,
  parseAllowedTypes,
  isFileTypeAllowed,
  createPresignedUploadPost,
  getContentTypeFromFilename,
} from '@/lib/aws/s3';
import { sendEmail } from '@/lib/emailService';
import { getFileUploadedNotificationTemplate } from '@/lib/emailTemplates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getUserClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { clientId } = await params;

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

    // Authorization: Admin can upload for any client, regular users only for themselves
    const isAdmin = userProfile.role === 'admin';
    const isOwnClient = userProfile.id === clientId;

    if (!isAdmin && !isOwnClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { filename, contentType, sizeBytes } = body;

    if (!filename || !sizeBytes) {
      return NextResponse.json(
        { error: 'filename and sizeBytes are required' },
        { status: 400 }
      );
    }

    // Load client settings
    const { data: clientProfile, error: clientErr } = await supabaseAdmin
      .from('profiles')
      .select('upload_enabled, allowed_file_types, max_upload_mb')
      .eq('id', clientId)
      .single();

    if (clientErr || !clientProfile) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if uploads are enabled
    if (!clientProfile.upload_enabled) {
      return NextResponse.json(
        { error: 'Uploads are not enabled for this client' },
        { status: 403 }
      );
    }

    // Check file type
    const allowedTypes = parseAllowedTypes(clientProfile.allowed_file_types);
    if (!isFileTypeAllowed(filename, allowedTypes)) {
      return NextResponse.json(
        {
          error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check file size
    const maxBytes = (clientProfile.max_upload_mb || 50) * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${clientProfile.max_upload_mb}MB`,
        },
        { status: 400 }
      );
    }

    // Generate S3 key
    const s3Key = makeClientUploadKey(clientId, filename);

    // Determine content type
    const finalContentType = contentType || getContentTypeFromFilename(filename);

    // Create presigned POST
    const { url, fields } = await createPresignedUploadPost(
      s3Key,
      finalContentType,
      maxBytes
    );

    // Insert upload record into database
    const { data: upload, error: insertErr } = await supabaseAdmin
      .from('uploads')
      .insert({
        client_id: clientId,
        s3_key: s3Key,
        original_filename: filename,
        content_type: finalContentType,
        size_bytes: sizeBytes,
        uploaded_by: user.id,
        status: 'received',
      })
      .select('id, s3_key, original_filename, uploaded_at, status')
      .single();

    if (insertErr || !upload) {
      // eslint-disable-next-line no-console
      console.error('Error inserting upload record:', insertErr);
      return NextResponse.json(
        { error: 'Failed to create upload record' },
        { status: 500 }
      );
    }

    // Log the event
    // eslint-disable-next-line no-console
    console.log('Upload presigned:', {
      clientId,
      userId: user.id,
      filename,
      sizeBytes,
      uploadId: upload.id,
    });

    return NextResponse.json({
      upload: { url, fields },
      s3Key,
      uploadId: upload.id,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Presign upload API error:', e);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
