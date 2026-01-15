import nodemailer from "nodemailer";
import { logEvent } from "@/lib/logger";

export async function POST(req) {
  try {
    const { name, email, goal, message, projectFocus, recaptchaToken } = await req.json();

    // Verify reCAPTCHA
    if (!recaptchaToken) {
      return new Response(
        JSON.stringify({ ok: false, success: false, error: 'Please verify you are human.' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${recaptchaSecret}&response=${recaptchaToken}`
      });
      const recaptchaData = await recaptchaResponse.json();
      
      if (!recaptchaData.success) {
        await logEvent("recaptcha_fail", { score: recaptchaData.score, errors: recaptchaData['error-codes'] });
        return new Response(
          JSON.stringify({ ok: false, success: false, error: 'reCAPTCHA verification failed. Please try again.' }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      await logEvent("recaptcha_success", { score: recaptchaData.score });
    }

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
    } catch (verr) {
      await logEvent("smtp_verify_fail", {
        server: process.env.EMAIL_SERVER,
        port: process.env.EMAIL_PORT || "587",
        message: verr?.message,
        code: verr?.code,
        response: verr?.response,
      });
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
  } catch (err) {
    try {
      const ua = req.headers.get("user-agent") || "";
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
      await logEvent("contact_error", {
        error: true,
        ip,
        ua,
        message: err?.message,
        code: err?.code,
        response: err?.response,
        command: err?.command,
      });
    } catch {}
    const isProd = process.env.NODE_ENV === "production";
    const payload = {
      ok: false,
      success: false,
      error: isProd ? "Email failed" : (err?.message || "Email failed"),
      ...(isProd
        ? {}
        : { code: err?.code, response: err?.response, command: err?.command }),
    };
    return new Response(
      JSON.stringify(payload),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
