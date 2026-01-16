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

    // Fetch project status items for the logged-in client
    const { data, error } = await userClient
      .from('project_status_items')
      .select('*')
      .eq('client_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching project status items:', error);
      return Response.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    return Response.json({ items: data || [] });
  } catch (e) {
    console.error('Project status GET error:', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
