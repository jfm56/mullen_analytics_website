import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET - Fetch enhanced tasks for a client
export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    console.log('Fetching tasks for client:', clientId);
    
    // Simple query without auth check for debugging
    const { data: tasks, error } = await supabase
      .from('enhanced_tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message, tasks: [] }, { status: 200 });
    }

    return NextResponse.json({ tasks: tasks || [] });

  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ error: error.message, tasks: [] }, { status: 200 });
  }
}

// POST - Create new enhanced task
export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const taskData = await request.json();

    const { data: task, error } = await supabase
      .from('enhanced_tasks')
      .insert({
        client_id: clientId,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'todo',
        due_date: taskData.due_date || null,
        linked_project: taskData.linked_project || null,
        estimated_hours: taskData.estimated_hours || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task });

  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
