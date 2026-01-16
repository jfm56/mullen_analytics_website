import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn('SMTP credentials not configured. Emails will not be sent.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  
  if (!transport) {
    console.log('Email not sent (SMTP not configured):', { to, subject });
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const info = await transport.sendMail({
      from: `"Mullen Analytics" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });

    console.log('Email sent successfully:', { to, subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}
