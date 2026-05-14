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

// GET - Fetch all revenue pipeline deals
export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: deals, error } = await getSupabaseAdmin()
      .from('revenue_pipeline')
      .select(`
        *,
        profiles:client_id (
          full_name,
          company,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deals:', error);
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }

    return NextResponse.json({ deals });

  } catch (error) {
    console.error('Revenue pipeline GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new revenue pipeline deal
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealData = await request.json();

    const { data: deal, error } = await getSupabaseAdmin()
      .from('revenue_pipeline')
      .insert({
        client_id: dealData.client_id,
        deal_name: dealData.deal_name,
        expected_value: dealData.expected_value,
        probability: dealData.probability || 50,
        stage: dealData.stage || 'prospect',
        forecast_month: dealData.forecast_month || null,
        notes: dealData.notes || null,
        contact_person: dealData.contact_person || null,
        deal_source: dealData.deal_source || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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
      console.error('Error creating deal:', error);
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
    }

    return NextResponse.json({ deal });

  } catch (error) {
    console.error('Revenue pipeline POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
