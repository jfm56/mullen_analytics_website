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

// GET - Generate signed URL for invoice file
export async function GET(
  request,
  { params }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { clientId, invoiceId } = await params;

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

    // Get invoice with upload info
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        uploads!inner(
          s3_key,
          upload_type
        )
      `)
      .eq('id', invoiceId)
      .eq('client_id', clientId)
      .single();

    if (error || !invoice) {
      console.error('Error fetching invoice:', error);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.uploads.s3_key || invoice.uploads.upload_type !== 'invoice') {
      return NextResponse.json({ error: 'No file available for this invoice' }, { status: 404 });
    }

    // Generate signed URL (valid for 60 seconds)
    const { data: signedUrl, error: signedUrlError } = await supabaseAdmin.storage
      .from('client-uploads')
      .createSignedUrl(invoice.uploads.s3_key, 60);

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });

  } catch (e) {
    console.error('Invoice file URL error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
