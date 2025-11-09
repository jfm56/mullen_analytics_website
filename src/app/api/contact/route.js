import nodemailer from "nodemailer";
import { logEvent } from "@/lib/logger";

export async function POST(req) {
  try {
    const { name, email, goal, message, projectFocus } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER,
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: String(process.env.EMAIL_SECURE).toLowerCase() === "true",
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      await transporter.verify();
      await logEvent("smtp_verify_ok", { server: process.env.EMAIL_SERVER, port: process.env.EMAIL_PORT || "587" });
    } catch {
      await logEvent("smtp_verify_fail", { server: process.env.EMAIL_SERVER, port: process.env.EMAIL_PORT || "587" });
    }

    const resolvedGoal = goal || projectFocus || "(not provided)";

    const mail = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `New Contact: ${name || "Unknown"}`,
      replyTo: email || undefined,
      text: `
Name: ${name || ""}
Email: ${email || ""}
Goal: ${resolvedGoal}

Message:
${message || ""}
      `,
    };

    const info = await transporter.sendMail(mail);
    await logEvent("smtp_send_ok", { messageId: info?.messageId || "", accepted: info?.accepted, rejected: info?.rejected });

    const ua = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    await logEvent("contact_submit", { name, email, goal: resolvedGoal, ip, ua });

    return new Response(
      JSON.stringify({ ok: true, success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    try {
      const ua = req.headers.get("user-agent") || "";
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
      await logEvent("contact_error", { error: true, ip, ua });
    } catch {}
    return new Response(
      JSON.stringify({ ok: false, success: false, error: "Email failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
