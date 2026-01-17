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

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    const userClient = getUserClient(token);
    if (!userClient) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey
    );

    // Get client info for company name and check-in details
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('profiles')
      .select('company, next_check_in, check_in_notes')
      .eq('id', clientId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('project_status_items')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true });

    console.log('Project status API - clientId:', clientId);
    console.log('Project status API - clientData:', clientData);
    console.log('Project status API - data:', data);
    console.log('Project status API - error:', error);

    if (error) {
      console.error('Error fetching project status items:', error);
      return Response.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    return Response.json({ 
      items: data || [], 
      company: clientData?.company || '',
      next_check_in: clientData?.next_check_in,
      check_in_notes: clientData?.check_in_notes
    });
  } catch (e) {
    console.error('Project status GET error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    const userClient = getUserClient(token);
    if (!userClient) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, title, description, status, owner, target_date_text, progress_percent, sort_order } = body;

    if (!clientId || !title) {
      return Response.json({ error: 'clientId and title are required' }, { status: 400 });
    }

    // Validate and clamp progress
    let progress = Math.max(0, Math.min(100, progress_percent || 0));
    
    // Auto-set progress based on status
    if (status === 'Complete') progress = 100;
    if (status === 'Planned' && progress_percent === undefined) progress = 0;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey
    );

    const { data, error } = await supabaseAdmin
      .from('project_status_items')
      .insert({
        client_id: clientId,
        title,
        description: description || '',
        status: status || 'Planned',
        owner: owner || 'Mullen Analytics',
        target_date_text: target_date_text || '',
        progress_percent: progress,
        sort_order: sort_order || 0
      })
      .select()
      .single();

    console.log('Project status POST - inserted data:', data);
    console.log('Project status POST - error:', error);

    if (error) {
      console.error('Error creating project status item:', error);
      return Response.json({ error: 'Failed to create item' }, { status: 500 });
    }

    return Response.json({ item: data });
  } catch (e) {
    console.error('Project status POST error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    const userClient = getUserClient(token);
    if (!userClient) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, description, status, owner, target_date_text, progress_percent, sort_order } = body;

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    // Validate and clamp progress
    let progress = Math.max(0, Math.min(100, progress_percent || 0));
    
    // Auto-set progress based on status
    if (status === 'Complete') progress = 100;
    if (status === 'Planned' && progress_percent === undefined) progress = 0;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey
    );

    const { data, error } = await supabaseAdmin
      .from('project_status_items')
      .update({
        title,
        description,
        status,
        owner,
        target_date_text,
        progress_percent: progress,
        sort_order
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project status item:', error);
      return Response.json({ error: 'Failed to update item' }, { status: 500 });
    }

    return Response.json({ item: data });
  } catch (e) {
    console.error('Project status PUT error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    const userClient = getUserClient(token);
    if (!userClient) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey
    );

    const { error } = await supabaseAdmin
      .from('project_status_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project status item:', error);
      return Response.json({ error: 'Failed to delete item' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('Project status DELETE error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
