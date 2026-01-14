import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeCustomerId = process.env.STRIPE_CUSTOMER_ID; // TEMP: single-customer MVP

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

export async function GET() {
  try {
    if (!stripe || !stripeCustomerId) {
      return NextResponse.json({ invoices: [] });
    }

    // MVP: use a single Stripe customer ID from env.
    // Later: map Supabase user -> stripe_customer_id in your database.
    const list = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 20,
    });

    const invoices = (list.data || []).map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      currency: inv.currency,
      amount_due: inv.amount_due,
      hosted_invoice_url: inv.hosted_invoice_url,
      created: inv.created,
    }));

    return NextResponse.json({ invoices });
  } catch (e) {
    console.error('Invoices error', e);
    return NextResponse.json({ invoices: [] });
  }
}
