import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    console.log('Last login API called');

    // Get the current user from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Updating last login for user:', user.id);

    // Try direct update first
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Direct update failed, trying RPC function:', updateError);
      
      // Fallback to RPC function
      const { error: rpcError } = await supabaseAdmin.rpc('update_last_login_simple', {
        user_uuid: user.id
      });

      if (rpcError) {
        console.error('RPC update also failed:', rpcError);
        return NextResponse.json({ 
          error: 'Failed to update last login', 
          details: rpcError.message 
        }, { status: 500 });
      }
    }

    console.log('Last login updated successfully for user:', user.id);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Last login update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
