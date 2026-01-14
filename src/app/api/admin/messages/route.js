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
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const messageQuery = supabaseAdmin
      .from('messages')
      .select('id, user_id, from_name, subject, body, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (userId) {
      messageQuery.eq('user_id', userId);
    }

    const { data: messages, error } = await messageQuery;

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin list messages error', error);
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }

    const userIds = Array.from(new Set((messages || []).map((m) => m.user_id).filter(Boolean)));

    let profilesById = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        // eslint-disable-next-line no-console
        console.error('Admin messages profiles error', profilesError);
      } else {
        profilesById = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    const enriched = (messages || []).map((m) => ({
      ...m,
      profile: profilesById[m.user_id] || null,
    }));

    return NextResponse.json({ messages: enriched });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin messages GET error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const { userId, subject, body: messageBody, from_name } = body;

    if (!userId || !subject || !messageBody) {
      return NextResponse.json(
        { error: 'userId, subject, and body are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        user_id: userId,
        subject,
        body: messageBody,
        from_name: from_name || 'Mullen Analytics',
      })
      .select('id, user_id, from_name, subject, body, created_at, read_at')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin create message error', error);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin messages POST error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const { ids, read } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const update = { read_at: read ? new Date().toISOString() : null };

    const { error } = await supabaseAdmin
      .from('messages')
      .update(update)
      .in('id', ids);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin update messages error', error);
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin messages PATCH error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { errorResponse } = await requireAdmin(request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .in('id', ids);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin delete messages error', error);
      return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin messages DELETE error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
