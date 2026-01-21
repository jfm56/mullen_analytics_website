import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET - Check onboarding status for a client
export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    
    // Check if client has any enhanced tasks (indicates onboarding was done)
    const { data: tasks, error } = await supabase
      .from('enhanced_tasks')
      .select('id')
      .eq('client_id', clientId)
      .limit(1);

    if (error) {
      console.error('Error checking onboarding status:', error);
      return NextResponse.json({ 
        status: { completed: false, tasks_created: 0 },
        error: error.message 
      });
    }

    const hasOnboarding = tasks && tasks.length > 0;
    
    return NextResponse.json({ 
      status: {
        completed: hasOnboarding,
        tasks_created: tasks?.length || 0
      }
    });

  } catch (error) {
    console.error('Onboarding status GET error:', error);
    return NextResponse.json({ 
      status: { completed: false, tasks_created: 0 },
      error: error.message 
    });
  }
}

// POST - Create onboarding tasks for a client
export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const { template_id, client_type } = await request.json();

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('onboarding_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create tasks from template
    const tasksToCreate = [];
    if (template.task_templates) {
      for (const taskTemplate of template.task_templates) {
        tasksToCreate.push({
          client_id: clientId,
          title: taskTemplate.title,
          description: taskTemplate.description || null,
          priority: taskTemplate.priority || 'medium',
          status: 'todo',
          due_date: null,
          linked_project: taskTemplate.linked_project || null,
          estimated_hours: taskTemplate.estimated_hours || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    // Insert tasks
    const { data: createdTasks, error: insertError } = await supabase
      .from('enhanced_tasks')
      .insert(tasksToCreate)
      .select();

    if (insertError) {
      console.error('Error creating onboarding tasks:', insertError);
      return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
    }

    // Update client project phases
    if (template.default_project_phases) {
      await supabase
        .from('profiles')
        .update({ 
          project_phase: template.default_project_phases[0] || 'discovery'
        })
        .eq('id', clientId);
    }

    return NextResponse.json({ 
      success: true,
      tasks_created: createdTasks?.length || 0,
      template_name: template.name
    });

  } catch (error) {
    console.error('Onboarding creation POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
