import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/emailService';
import { getWelcomeEmailTemplate } from '@/lib/emailTemplates';

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
    const { email, full_name, company, project_name, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase();

    // Create auth user via service role client
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: {
        first_name: full_name || null,
      },
    });

    if (createUserError || !createdUser?.user) {
      // eslint-disable-next-line no-console
      console.error('Error creating auth user', createUserError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const newUser = createdUser.user;

    const { data: profile, error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: newUser.id,
          email: newUser.email,
          role: role || 'user',
          full_name: full_name || null,
          company: company || null,
          project_name: project_name || null,
        },
        { onConflict: 'id' }
      )
      .select('id, email, role, full_name, company, project_name, created_at')
      .single();

    if (profileInsertError) {
      // eslint-disable-next-line no-console
      console.error('Error inserting profile for new user', profileInsertError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    // Send welcome email with temporary password
    const portalUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mullenanalytics.com/portal/login';
    const emailTemplate = getWelcomeEmailTemplate(full_name, portalUrl, tempPassword);
    
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    // eslint-disable-next-line no-console
    console.log('Welcome email sent to:', email);

    return NextResponse.json({ profile });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Admin create user API error', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
