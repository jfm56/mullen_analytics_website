import { NextResponse } from 'next/server';
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

export async function GET(request, { params }) {
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

    // Authorization: Admin can view any client's uploads, regular users only their own
    const isAdmin = userProfile.role === 'admin';
    const isOwnClient = userProfile.id === clientId;

    if (!isAdmin && !isOwnClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch uploads for this client
    const { data: uploads, error: uploadsErr } = await supabaseAdmin
      .from('uploads')
      .select('id, s3_key, original_filename, content_type, size_bytes, uploaded_by, uploaded_at, status, notes')
      .eq('client_id', clientId)
      .order('uploaded_at', { ascending: false });

    if (uploadsErr) {
      // eslint-disable-next-line no-console
      console.error('Error fetching uploads:', uploadsErr);
      return NextResponse.json(
        { error: 'Failed to fetch uploads' },
        { status: 500 }
      );
    }

    return NextResponse.json({ uploads: uploads || [] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('List uploads API error:', e);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
