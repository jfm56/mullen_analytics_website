import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// PUT - Update user role
export async function PUT(request, { params }) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify current user is admin
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get new role from request body
    const { newRole } = await request.json();
    
    if (!newRole || !['admin', 'client'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update the target user's role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', params.userId);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Role updated to ${newRole}`,
      newRole: newRole 
    });

  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
