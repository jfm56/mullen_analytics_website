import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(request) {
  try {
    if (!supabaseAdmin) {
      return Response.json({ error: 'Supabase admin client not configured' }, { status: 500 });
    }

    // Get the client ID from query parameters
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return Response.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Authorization required' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);

    // Verify the access token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Delete client directly (simple version)
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      console.error('Delete client error:', deleteError);
      return Response.json({ error: 'Failed to delete client: ' + deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Client deleted successfully' });

  } catch (error) {
    console.error('Delete client API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
