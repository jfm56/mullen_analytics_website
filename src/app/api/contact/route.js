export async function POST(req) {
  try {
    const body = await req.json();
    // TODO: integrate with email.js and recaptcha.js
    return new Response(JSON.stringify({ ok: true, received: body }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (_err) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}
