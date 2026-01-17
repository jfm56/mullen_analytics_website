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
    console.log('Invoice upload API - Starting request');
    
    if (!supabaseAdmin) {
      console.error('Invoice upload API - Supabase admin not configured');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Authenticate user
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    
    console.log('Invoice upload API - Auth header present:', !!authHeader);
    console.log('Invoice upload API - Token extracted:', !!token);

    const userClient = getUserClient(token);
    if (!userClient) {
      console.error('Invoice upload API - Failed to create user client');
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
    console.log('Invoice upload API - Parsing form data');
    
    const file = formData.get('file');
    const clientId = formData.get('clientId');
    const upload_type = formData.get('upload_type') || 'invoice';
    const invoice_number = formData.get('invoice_number');
    const invoice_date = formData.get('invoice_date');
    const due_date = formData.get('due_date');
    const amount_cents = formData.get('amount_cents');
    const currency = formData.get('currency') || 'USD';
    const description = formData.get('description');

    console.log('Invoice upload API - Form data parsed:', {
      file: file ? file.name : 'null',
      clientId,
      upload_type,
      invoice_number,
      invoice_date,
      due_date,
      amount_cents,
      currency,
      description
    });

    if (!file || !clientId) {
      console.error('Invoice upload API - Missing file or clientId');
      return NextResponse.json({ error: 'File and clientId are required' }, { status: 400 });
    }

    if (upload_type === 'invoice' && (!invoice_number || !invoice_date || !amount_cents)) {
      console.error('Invoice upload API - Missing required invoice fields');
      return NextResponse.json({ error: 'Invoice number, date, and amount are required for invoice uploads' }, { status: 400 });
    }

    // Upload file to Supabase Storage using service role (bypasses RLS)
    const fileExt = file.name.split('.').pop();
    const fileName = `${clientId}/invoices/${Date.now()}-${file.name}`;
    
    console.log('Invoice upload API - Uploading file:', fileName);
    console.log('Invoice upload API - File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Check if bucket exists first
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      console.log('Invoice upload API - Available buckets:', buckets?.map(b => b.name));
      
      const bucketExists = buckets?.some(b => b.name === 'client-uploads');
      if (!bucketExists) {
        console.error('Invoice upload API - client-uploads bucket does not exist');
        return NextResponse.json({ error: 'Storage bucket not configured. Please create the "client-uploads" bucket in Supabase Storage.' }, { status: 500 });
      }
    } catch (bucketError) {
      console.error('Invoice upload API - Error checking buckets:', bucketError);
    }
    
    // Use service role to upload (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('client-uploads')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    console.log('Invoice upload API - Upload result:', { uploadData, uploadError });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      console.error('Storage upload error details:', JSON.stringify(uploadError, null, 2));
      
      // Provide more specific error messages
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({ error: 'Storage bucket not found. Please create the "client-uploads" bucket in Supabase Storage dashboard.' }, { status: 500 });
      }
      if (uploadError.message?.includes('permission')) {
        return NextResponse.json({ error: 'Storage permission denied. The service role may not have access to this bucket.' }, { status: 500 });
      }
      if (uploadError.message?.includes('duplicate')) {
        return NextResponse.json({ error: 'File already exists. Please try again.' }, { status: 500 });
      }
      
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
        invoice_number: upload_type === 'invoice' ? invoice_number : null,
        notes: upload_type === 'invoice' ? description : null,
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

    let invoiceRecord = null;

    // Create invoice record if this is an invoice upload
    if (upload_type === 'invoice') {
      const { data: invoiceData, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .insert({
          client_id: clientId,
          upload_id: uploadRecord.id,
          invoice_number: invoice_number,
          invoice_date: invoice_date,
          due_date: due_date || null,
          amount_cents: parseInt(amount_cents),
          currency: currency,
          description: description,
          status: 'pending'
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Invoice record error:', invoiceError);
        return NextResponse.json({ error: 'Failed to create invoice record' }, { status: 500 });
      }

      invoiceRecord = invoiceData;
    }

    return NextResponse.json({ 
      success: true,
      upload: uploadRecord,
      invoice: invoiceRecord,
      fileUrl: publicUrl
    });

  } catch (e) {
    console.error('Invoice upload error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
