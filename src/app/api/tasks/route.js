import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// GET - List tasks
export async function GET(request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const dueSoon = searchParams.get('due_soon') === 'true';

    let query = userClient
      .from('tasks')
      .select('*, clients(company_name), projects(name)')
      .order('due_at', { ascending: true, nullsFirst: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dueSoon) {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      query = query.lte('due_at', sevenDaysFromNow.toISOString());
    }

    const { data: tasks, error } = await query;

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Tasks API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// POST - Create task
export async function POST(request) {
  try {
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

    const body = await request.json().catch(() => ({}));
    const { title, description, client_id, project_id, status, priority, due_at } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!client_id && !project_id) {
      return NextResponse.json({ error: 'Either client_id or project_id is required' }, { status: 400 });
    }

    const { data: task, error } = await userClient
      .from('tasks')
      .insert({
        title,
        description: description || null,
        client_id: client_id || null,
        project_id: project_id || null,
        status: status || 'open',
        priority: priority || 'medium',
        due_at: due_at || null,
      })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    await userClient.from('activity_log').insert({
      actor_id: user.id,
      action: 'created',
      entity_type: 'task',
      entity_id: task.id,
      meta: { title: task.title },
    });

    return NextResponse.json({ task });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Create task API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// PUT - Update task
export async function PUT(request) {
  try {
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

    const body = await request.json().catch(() => ({}));
    const { id, title, description, status, priority, due_at } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (due_at !== undefined) updateData.due_at = due_at;

    const { data: task, error } = await userClient
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    await userClient.from('activity_log').insert({
      actor_id: user.id,
      action: 'updated',
      entity_type: 'task',
      entity_id: task.id,
      meta: { changes: Object.keys(updateData) },
    });

    return NextResponse.json({ task });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Update task API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// DELETE - Delete task
export async function DELETE(request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { error } = await userClient.from('tasks').delete().eq('id', id);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    await userClient.from('activity_log').insert({
      actor_id: user.id,
      action: 'deleted',
      entity_type: 'task',
      entity_id: id,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Delete task API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
