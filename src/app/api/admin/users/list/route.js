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

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

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

    // Check caller is admin using simple self-row policy (auth.uid() = id)
    const { data: callerProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role client to bypass RLS and list all profiles
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, company, upload_enabled, allowed_file_types, max_upload_mb, logo_url')
      .order('email');

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin list users error', error);
      return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
    }

    return NextResponse.json({ profiles: data || [] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin list users API error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
