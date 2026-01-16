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

export async function POST(request) {
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

    const { data: callerProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { clientId, project_name, project_status, tableau_url, tableau_type } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const updateData = {};
    if (project_name !== undefined) updateData.project_name = project_name ?? null;
    if (project_status !== undefined) updateData.project_status = project_status ?? null;
    if (tableau_url !== undefined) updateData.tableau_url = tableau_url ?? null;
    if (tableau_type !== undefined) updateData.tableau_type = tableau_type ?? null;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', clientId)
      .select('id, email, role, full_name, company, project_name, project_status, tableau_url, tableau_type')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin update client profile error', error);
      return NextResponse.json({ error: 'Failed to update client profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin client profile API error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
