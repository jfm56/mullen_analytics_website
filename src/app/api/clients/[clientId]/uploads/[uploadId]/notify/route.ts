import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';
import { getFileUploadedNotificationTemplate } from '@/lib/emailTemplates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getUserClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; uploadId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const { clientId, uploadId } = await params;

    // Authenticate user
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    const userClient = getUserClient(token || '');
    if (!userClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get upload details
    const { data: upload, error: uploadErr } = await supabaseAdmin
      .from('uploads')
      .select('id, client_id, original_filename, uploaded_by')
      .eq('id', uploadId)
      .single();

    if (uploadErr || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Get client profile
    const { data: clientProfile, error: clientErr } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', clientId)
      .single();

    if (clientErr || !clientProfile) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get uploader profile
    const { data: uploaderProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, role')
      .eq('id', upload.uploaded_by)
      .single();

    const uploaderName = uploaderProfile?.full_name || 
                        (uploaderProfile?.role === 'admin' ? 'Mullen Analytics Team' : 'You');

    // Send email notification
    const portalUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mullenanalytics.com/portal';
    const emailTemplate = getFileUploadedNotificationTemplate(
      clientProfile.full_name,
      upload.original_filename,
      uploaderName,
      portalUrl
    );

    await sendEmail({
      to: clientProfile.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    // eslint-disable-next-line no-console
    console.log('Upload notification email sent to:', clientProfile.email);

    return NextResponse.json({ success: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Upload notification API error:', e);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
