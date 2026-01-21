import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

// DELETE - Delete a document and its file
export async function DELETE(
  request,
  { params }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { clientId, documentId } = await params;

    // Authenticate user
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    const userClient = getUserClient(token);
    if (!userClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: userProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get document with upload info before deleting
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select(`
        *,
        uploads!inner(
          s3_key,
          upload_type
        )
      `)
      .eq('id', documentId)
      .eq('client_id', clientId)
      .single();

    if (fetchError || !document) {
      console.error('Error fetching document for deletion:', fetchError);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete the document record first
    const { error: deleteDocumentError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('client_id', clientId);

    if (deleteDocumentError) {
      console.error('Error deleting document:', deleteDocumentError);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    // Delete the upload record
    if (document.upload_id) {
      const { error: deleteUploadError } = await supabaseAdmin
        .from('uploads')
        .delete()
        .eq('id', document.upload_id);

      if (deleteUploadError) {
        console.error('Error deleting upload record:', deleteUploadError);
        // Don't fail the whole operation if upload record deletion fails
      }
    }

    // Delete the file from storage
    if (document.uploads.s3_key) {
      try {
        const { error: deleteFileError } = await supabaseAdmin.storage
          .from('client-uploads')
          .remove([document.uploads.s3_key]);

        if (deleteFileError) {
          console.error('Error deleting file from storage:', deleteFileError);
          // Don't fail the whole operation if file deletion fails
        }
      } catch (fileError) {
        console.error('Error removing file:', fileError);
        // Don't fail the whole operation if file deletion fails
      }
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });

  } catch (e) {
    console.error('Document deletion error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
