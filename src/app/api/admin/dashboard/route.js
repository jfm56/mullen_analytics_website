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

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [
      totalClientsRes,
      activeProjectsRes,
      unreadMessagesRes,
      openTasksRes,
      tasksDueSoonRes,
      clientsRes,
      lastMessagesRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user'),
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .in('project_status', ['Discovery', 'In progress']),
      supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null),
      supabaseAdmin
        .from('client_tasks')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'Done'),
      supabaseAdmin
        .from('client_tasks')
        .select('id, client_id, title, status, due_date')
        .neq('status', 'Done')
        .gte('due_date', startStr)
        .lte('due_date', endStr)
        .order('due_date', { ascending: true })
        .limit(10),
      supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, company, project_name, project_status')
        .eq('role', 'user'),
      supabaseAdmin
        .from('messages')
        .select('user_id, max(created_at)', { group: 'user_id' }),
    ]);

    const totalClients = totalClientsRes.count || 0;
    const activeProjects = activeProjectsRes.count || 0;
    const unreadMessages = unreadMessagesRes.count || 0;
    const openTasks = openTasksRes.count || 0;

    const tasksDueSoon = (tasksDueSoonRes.data || []).map((t) => ({
      id: t.id,
      client_id: t.client_id,
      title: t.title,
      status: t.status,
      due_date: t.due_date,
    }));

    const clients = clientsRes.data || [];

    const lastMessagesMap = (lastMessagesRes.data || []).reduce((acc, row) => {
      // row has shape { user_id, max: timestamp }
      if (!row.user_id) return acc;
      acc[row.user_id] = row.max;
      return acc;
    }, {});

    const clientsNeedingOutreach = clients
      .map((c) => {
        const last = lastMessagesMap[c.id] ? new Date(lastMessagesMap[c.id]) : null;
        return { client: c, lastMessageAt: last };
      })
      .filter(({ lastMessageAt }) => !lastMessageAt || lastMessageAt < twoWeeksAgo)
      .sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return -1;
        if (!b.lastMessageAt) return 1;
        return a.lastMessageAt - b.lastMessageAt;
      })
      .slice(0, 10)
      .map(({ client, lastMessageAt }) => ({
        id: client.id,
        email: client.email,
        full_name: client.full_name,
        company: client.company,
        project_name: client.project_name,
        project_status: client.project_status,
        last_message_at: lastMessageAt ? lastMessageAt.toISOString() : null,
      }));

    return NextResponse.json({
      metrics: {
        totalClients,
        activeProjects,
        unreadMessages,
        openTasks,
      },
      tasksDueSoon,
      clientsNeedingOutreach,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin dashboard GET error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
