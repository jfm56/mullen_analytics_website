import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { name, email, goal, message } = await req.json();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER,
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: String(process.env.EMAIL_SECURE).toLowerCase() === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: `New Contact: ${name || "Unknown"}`,
      text: `
Name: ${name || ""}
Email: ${email || ""}
Goal: ${goal || "(not provided)"}

Message:
${message || ""}
      `,
    });

    return new Response(
      JSON.stringify({ ok: true, success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, success: false, error: "Email failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
