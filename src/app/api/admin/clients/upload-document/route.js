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

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const clientId = formData.get('clientId');
    const upload_type = formData.get('upload_type') || 'document';
    const title = formData.get('title');
    const category = formData.get('category') || 'general';
    const description = formData.get('description');
    const tags = formData.get('tags');

    if (!file || !clientId) {
      return NextResponse.json({ error: 'File and clientId are required' }, { status: 400 });
    }

    if (upload_type === 'document' && (!title || !category)) {
      return NextResponse.json({ error: 'Title and category are required for document uploads' }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}/documents/${Date.now()}-${file.name}`;
    
    console.log('Document upload API - Uploading file:', fileName);
    
    // Check if bucket exists first
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'client-uploads');
      if (!bucketExists) {
        console.error('Document upload API - client-uploads bucket does not exist');
        return NextResponse.json({ error: 'Storage bucket not configured. Please create the "client-uploads" bucket in Supabase Storage.' }, { status: 500 });
      }
    } catch (bucketError) {
      console.error('Document upload API - Error checking buckets:', bucketError);
    }
    
    // Use service role to upload (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('client-uploads')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    console.log('Document upload API - Upload result:', { uploadData, uploadError });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('client-uploads')
      .getPublicUrl(fileName);

    // Create upload record
    const { data: uploadRecord, error: uploadRecordError } = await supabaseAdmin
      .from('uploads')
      .insert({
        client_id: clientId,
        s3_key: fileName,
        original_filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
        uploaded_by: user.id,
        upload_type: upload_type,
        notes: upload_type === 'document' ? `${title}|${category}|${description || ''}|${tags || ''}` : null,
        status: 'received'
      })
      .select()
      .single();

    if (uploadRecordError) {
      console.error('Upload record error:', uploadRecordError);
      // Clean up uploaded file if record creation fails
      await supabaseAdmin.storage.from('client-uploads').remove([fileName]);
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 });
    }

    let documentRecord = null;

    // Create document record if this is a document upload
    if (upload_type === 'document') {
      const { data: documentData, error: documentError } = await supabaseAdmin
        .from('documents')
        .insert({
          client_id: clientId,
          upload_id: uploadRecord.id,
          title: title,
          category: category,
          description: description,
          tags: tags,
          status: 'active'
        })
        .select()
        .single();

      if (documentError) {
        console.error('Document record error:', documentError);
        return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
      }

      documentRecord = documentData;
    }

    return NextResponse.json({ 
      success: true,
      upload: uploadRecord,
      document: documentRecord,
      fileUrl: publicUrl
    });

  } catch (e) {
    console.error('Document upload error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
