import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeCustomerId = process.env.STRIPE_CUSTOMER_ID; // TEMP: single-customer MVP

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

export async function GET(request) {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create user client to get user info
    const { createClient } = await import('@supabase/supabase-js');
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let stripeInvoices = [];
    let uploadedInvoices = [];

    // Get Stripe invoices (if configured)
    if (stripe && stripeCustomerId) {
      try {
        const list = await stripe.invoices.list({
          customer: stripeCustomerId,
          limit: 20,
        });

        stripeInvoices = (list.data || []).map((inv) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          currency: inv.currency,
          amount_due: inv.amount_due,
          hosted_invoice_url: inv.hosted_invoice_url,
          created: inv.created,
          type: 'stripe',
          description: 'Stripe Invoice'
        }));
      } catch (e) {
        console.error('Stripe invoices error:', e);
      }
    }

    // Get uploaded invoices for this user
    if (supabaseAdmin) {
      try {
        const { data: invoices, error } = await supabaseAdmin
          .from('invoices')
          .select(`
            *,
            uploads!inner(
              original_filename,
              s3_key,
              content_type
            )
          `)
          .eq('client_id', user.id)
          .order('invoice_date', { ascending: false });

        if (!error && invoices) {
          uploadedInvoices = invoices.map((inv) => ({
            id: inv.id,
            number: inv.invoice_number,
            status: inv.status,
            currency: inv.currency,
            amount_due: inv.amount_cents,
            created: new Date(inv.created_at).getTime() / 1000,
            type: 'uploaded',
            description: inv.description || inv.uploads.original_filename,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            file_url: supabaseAdmin.storage
              .from('client-uploads')
              .getPublicUrl(inv.uploads.s3_key).data.publicUrl,
            original_filename: inv.uploads.original_filename
          }));
        }
      } catch (e) {
        console.error('Uploaded invoices error:', e);
      }
    }

    // Combine and sort all invoices by date
    const allInvoices = [...stripeInvoices, ...uploadedInvoices].sort((a, b) => {
      // Sort by created date (newest first)
      return b.created - a.created;
    });

    return NextResponse.json({ invoices: allInvoices });
  } catch (e) {
    console.error('Invoices error', e);
    return NextResponse.json({ invoices: [] });
  }
}
