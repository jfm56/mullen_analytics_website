import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';
import { getDocumentRequestEmailTemplate, getProfileUpdateNotificationTemplate } from '@/lib/emailTemplates';

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

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    const userClient = getUserClient(token);
    if (!userClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { 
      clientId, 
      project_name, 
      project_status, 
      full_name, 
      company, 
      next_check_in, 
      check_in_notes, 
      tableau_url, 
      tableau_type, 
      upload_enabled, 
      allowed_file_types, 
      max_upload_mb 
    } = body;

    // eslint-disable-next-line no-console
    console.log('Request body:', body);

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Get current profile state to detect changes
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('upload_enabled, email, full_name')
      .eq('id', clientId)
      .single();

    if (fetchError) {
      // eslint-disable-next-line no-console
      console.error('Error fetching current profile:', fetchError);
      return NextResponse.json({ 
        error: 'Profile not found', 
        details: fetchError.message 
      }, { status: 404 });
    }

    const updateData = {};
    // All fields now exist in the database after running the SQL migration
    if (project_name !== undefined) updateData.project_name = project_name;
    if (project_status !== undefined) updateData.project_status = project_status;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (company !== undefined) updateData.company = company;
    if (next_check_in !== undefined) updateData.next_check_in = next_check_in;
    if (check_in_notes !== undefined) updateData.check_in_notes = check_in_notes;
    if (tableau_url !== undefined) updateData.tableau_url = tableau_url;
    if (tableau_type !== undefined) updateData.tableau_type = tableau_type;
    if (upload_enabled !== undefined) updateData.upload_enabled = upload_enabled ?? false;
    if (allowed_file_types !== undefined) updateData.allowed_file_types = allowed_file_types ?? 'csv,xlsx,json,pdf';
    if (max_upload_mb !== undefined) updateData.max_upload_mb = max_upload_mb ?? 50;

    // eslint-disable-next-line no-console
    console.log('Updating profile with data:', updateData, 'for clientId:', clientId);

    // If no valid fields to update, return success without database operation
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        profile: { id: clientId, message: 'No database fields to update (local only)' }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', clientId)
      .select('id, email, role, full_name, company, logo_url, upload_enabled, allowed_file_types, max_upload_mb')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Admin update client profile error:', error);
      // eslint-disable-next-line no-console
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to update client profile', 
        details: error.message || error.hint || 'Unknown error' 
      }, { status: 500 });
    }

    // Send email notifications based on changes
    const portalUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mullenanalytics.com/portal';
    
    // Document request email when uploads are newly enabled
    if (upload_enabled && currentProfile && !currentProfile.upload_enabled) {
      const emailTemplate = getDocumentRequestEmailTemplate(
        data.full_name,
        portalUrl,
        data.allowed_file_types,
        data.max_upload_mb
      );
      
      await sendEmail({
        to: data.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      // eslint-disable-next-line no-console
      console.log('Document request email sent to:', data.email);
    }

    return NextResponse.json({ profile: data });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin client profile API error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
