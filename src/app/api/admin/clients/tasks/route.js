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

async function requireAdmin(request) {
  if (!supabaseAdmin) {
    return { errorResponse: NextResponse.json({ error: 'Admin client not configured' }, { status: 500 }) };
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  const userClient = getUserClient(token);
  if (!userClient) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: callerProfile, error: profileErr } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
    return { errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, userClient };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const { data, error } = await supabaseAdmin
      .from('client_tasks')
      .select('id, client_id, title, status, due_date, notes, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin list tasks error', error);
      return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: data || [] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin tasks GET error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const { clientId, title, status, due_date, notes } = body;

    if (!clientId || !title) {
      return NextResponse.json({ error: 'clientId and title are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('client_tasks')
      .insert({
        client_id: clientId,
        title,
        status: status || 'Not started',
        due_date: due_date || null,
        notes: notes || null,
      })
      .select('id, client_id, title, status, due_date, notes, created_at')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin create task error', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin tasks POST error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    }

    const update = {};
    if (typeof status === 'string') update.status = status;
    if (typeof notes === 'string') update.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('client_tasks')
      .update(update)
      .eq('id', id)
      .select('id, client_id, title, status, due_date, notes, created_at')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin update task error', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin tasks PATCH error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    if (!id) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('client_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin delete task error', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin tasks DELETE error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
