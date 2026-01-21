import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
  try {
    console.log('Last login API called (fallback version)');

    // Get the current user from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Updating last login for user:', user.id);

    // Try direct update first (simplest approach)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Direct update failed:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update last login', 
        details: updateError.message 
      }, { status: 500 });
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
