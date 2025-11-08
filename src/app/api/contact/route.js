import { sendEmail } from "@/lib/email";

export async function POST(req) {
  try {
    const body = await req.json();
    const to = "hello@mullenanalytics.com";
    const subject = `New website inquiry from ${body?.name || "Unknown"}`;
    const text = `Name: ${body?.name}\nEmail: ${body?.email}\nFocus: ${body?.projectFocus}\n\nMessage:\n${body?.message}`;

    const result = await sendEmail({ to, subject, text });

    return new Response(
      JSON.stringify({ ok: !!result?.ok }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
