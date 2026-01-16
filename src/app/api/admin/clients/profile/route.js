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
    const { clientId, project_name, project_status, tableau_url, tableau_type, upload_enabled, allowed_file_types, max_upload_mb } = body;

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
    // Note: project_name, project_status, tableau_url, tableau_type columns don't exist in profiles table
    if (upload_enabled !== undefined) updateData.upload_enabled = upload_enabled ?? false;
    if (allowed_file_types !== undefined) updateData.allowed_file_types = allowed_file_types ?? 'csv,xlsx,json,pdf';
    if (max_upload_mb !== undefined) updateData.max_upload_mb = max_upload_mb ?? 50;

    // eslint-disable-next-line no-console
    console.log('Updating profile with data:', updateData, 'for clientId:', clientId);

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', clientId)
      .select('id, email, role, full_name, company, upload_enabled, allowed_file_types, max_upload_mb')
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
