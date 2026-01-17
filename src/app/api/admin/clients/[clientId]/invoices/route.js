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

// GET - Fetch invoices for a client
export async function GET(
  request,
  { params }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { clientId } = await params;

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

    // Get all invoices for the client
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        uploads!inner(
          original_filename,
          s3_key,
          content_type,
          upload_type
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    // Add file URLs for uploaded invoices
    const invoicesWithUrls = invoices.map((invoice) => {
      let fileUrl = null;
      if (invoice.uploads.upload_type === 'invoice' && invoice.uploads.s3_key) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('client-uploads')
          .getPublicUrl(invoice.uploads.s3_key);
        fileUrl = publicUrl;
      }

      return {
        ...invoice,
        file_url: fileUrl,
        type: invoice.uploads.upload_type === 'invoice' ? 'uploaded' : 'stripe'
      };
    });

    return NextResponse.json({ invoices: invoicesWithUrls });

  } catch (e) {
    console.error('Invoices GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
