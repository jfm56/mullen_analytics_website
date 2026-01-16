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

// GET - List all clients for authenticated user
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = userClient
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: clients, error } = await query;

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    return NextResponse.json({ clients: clients || [] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Clients API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// POST - Create new client
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
    const { company_name, primary_email, status, last_contacted_at, next_followup_at } = body;

    if (!company_name && !primary_email) {
      return NextResponse.json({ error: 'Company name or email is required' }, { status: 400 });
    }

    const { data: client, error } = await userClient
      .from('clients')
      .insert({
        owner_id: user.id,
        company_name: company_name || null,
        primary_email: primary_email || null,
        status: status || 'lead',
        last_contacted_at: last_contacted_at || null,
        next_followup_at: next_followup_at || null,
      })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating client:', error);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    // Log activity
    await userClient.from('activity_log').insert({
      actor_id: user.id,
      action: 'created',
      entity_type: 'client',
      entity_id: client.id,
      meta: { company_name: client.company_name },
    });

    return NextResponse.json({ client });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Create client API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// PUT - Update client
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
    const { id, company_name, primary_email, status, last_contacted_at, next_followup_at } = body;

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const updateData = {};
    if (company_name !== undefined) updateData.company_name = company_name;
    if (primary_email !== undefined) updateData.primary_email = primary_email;
    if (status !== undefined) updateData.status = status;
    if (last_contacted_at !== undefined) updateData.last_contacted_at = last_contacted_at;
    if (next_followup_at !== undefined) updateData.next_followup_at = next_followup_at;

    const { data: client, error } = await userClient
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating client:', error);
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    // Log activity
    await userClient.from('activity_log').insert({
      actor_id: user.id,
      action: 'updated',
      entity_type: 'client',
      entity_id: client.id,
      meta: { changes: Object.keys(updateData) },
    });

    return NextResponse.json({ client });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Update client API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// DELETE - Delete client
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
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const { error } = await userClient.from('clients').delete().eq('id', id);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting client:', error);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }

    // Log activity
    await userClient.from('activity_log').insert({
      actor_id: user.id,
      action: 'deleted',
      entity_type: 'client',
      entity_id: id,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Delete client API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
