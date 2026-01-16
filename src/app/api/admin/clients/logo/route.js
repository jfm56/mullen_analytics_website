import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

    const formData = await request.formData();
    const logoFile = formData.get('logoFile');
    const clientId = formData.get('clientId');

    if (!logoFile || !clientId) {
      return NextResponse.json({ error: 'Logo file and clientId are required' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(logoFile.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PNG, JPG, GIF, SVG allowed' }, { status: 400 });
    }

    if (logoFile.size > 2 * 1024 * 1024) { // 2MB limit
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${clientId}/logo-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('client-logos')
      .upload(fileName, logoFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('client-logos')
      .getPublicUrl(fileName);

    // Update client profile with logo URL
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ logo_url: publicUrl })
      .eq('id', clientId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update client profile' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Logo uploaded successfully',
      logoUrl: publicUrl 
    });

  } catch (e) {
    console.error('Logo upload API error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
