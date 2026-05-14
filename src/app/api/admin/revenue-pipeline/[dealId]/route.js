import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// Helper function to get authenticated user
async function getAuthenticatedUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  // Verify user is admin
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return null;
  }

  return user;
}

// PATCH - Update deal stage or other fields
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealId = params.dealId;
    const updateData = await request.json();

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    // If moving to closed won or lost, set closed_date
    if (updateData.stage && ['closed_won', 'closed_lost'].includes(updateData.stage)) {
      updateData.closed_date = new Date().toISOString();
    }

    const { data: deal, error } = await getSupabaseAdmin()
      .from('revenue_pipeline')
      .update(updateData)
      .eq('id', dealId)
      .select(`
        *,
        profiles:client_id (
          full_name,
          company,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error updating deal:', error);
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
    }

    return NextResponse.json({ deal });

  } catch (error) {
    console.error('Deal PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove deal
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealId = params.dealId;

    const { error } = await getSupabaseAdmin()
      .from('revenue_pipeline')
      .delete()
      .eq('id', dealId);

    if (error) {
      console.error('Error deleting deal:', error);
      return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Deal DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
