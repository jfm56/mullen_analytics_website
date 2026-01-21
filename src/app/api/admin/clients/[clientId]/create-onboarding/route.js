import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// POST - Create onboarding tasks for a client
export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const { template_id, client_type, tasks } = await request.json();

    // If custom tasks array is provided, use that
    // Otherwise fall back to template tasks
    let tasksToCreate = [];

    if (tasks && tasks.length > 0) {
      // Use the custom tasks array from the frontend
      tasksToCreate = tasks.map(task => ({
        client_id: clientId,
        title: task.title,
        description: task.description || null,
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        due_date: task.due_date || null,
        linked_project: task.linked_project || null,
        estimated_hours: task.estimated_hours || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    } else if (template_id) {
      // Get the template and use its tasks
      const { data: template, error: templateError } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      if (template.task_templates) {
        tasksToCreate = template.task_templates.map(task => ({
          client_id: clientId,
          title: task.title,
          description: task.description || null,
          priority: task.priority || 'medium',
          status: 'todo',
          due_date: null,
          linked_project: task.linked_project || null,
          estimated_hours: task.estimated_hours || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }
    }

    if (tasksToCreate.length === 0) {
      return NextResponse.json({ 
        success: true, 
        tasks_created: 0,
        template_name: client_type || 'Custom'
      });
    }

    // Insert tasks
    const { data: createdTasks, error: insertError } = await supabase
      .from('enhanced_tasks')
      .insert(tasksToCreate)
      .select();

    if (insertError) {
      console.error('Error creating onboarding tasks:', insertError);
      return NextResponse.json({ error: 'Failed to create tasks', details: insertError.message }, { status: 500 });
    }

    // Update client project phase
    await supabase
      .from('profiles')
      .update({ 
        project_phase: 'discovery',
        client_status: 'active'
      })
      .eq('id', clientId);

    return NextResponse.json({ 
      success: true,
      tasks_created: createdTasks?.length || 0,
      template_name: client_type || 'Custom Onboarding'
    });

  } catch (error) {
    console.error('Onboarding creation POST error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
