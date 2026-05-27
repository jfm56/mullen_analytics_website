import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from ..config import get_settings

settings = get_settings()


async def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success."""
    if not settings.smtp_host or not settings.smtp_user:
        print(f"[Email] SMTP not configured. Would have sent to {to_email}: {subject}")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        print(f"[Email] Sent '{subject}' to {to_email}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
        return False


def _email_wrapper(title: str, preheader: str, body_html: str) -> str:
    """Returns a fully branded HTML email wrapping body_html."""
    hero_url = f"{settings.app_url}/hero-image.png"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f4f4;">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="650" cellpadding="0" cellspacing="0"
               style="max-width:650px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Hero banner -->
          <tr>
            <td>
              <img src="{hero_url}" alt="Mullen Analytics" width="650"
                   style="width:100%;height:auto;display:block;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              {body_html}
              <p style="margin-top:40px;font-size:15px;color:#111827;">
                Thank you,<br />
                <strong>Mullen Analytics &amp; AI Consulting</strong>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;" />
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                You received this email because an account was created for you on
                <a href="{settings.app_url}" style="color:#9ca3af;">{settings.app_url}</a>.
                If this was a mistake, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_invite_email(
    to_email: str,
    full_name: str | None,
    temporary_password: str,
    setup_token: str | None = None,
) -> bool:
    """Send a branded welcome email with login credentials and optional setup link."""
    name = full_name.split()[0] if full_name else to_email
    login_url = f"{settings.app_url}/portal/login"

    if setup_token:
        cta_url = f"{settings.app_url}/portal/reset-password?token={setup_token}"
        cta_label = "Set Up My Account"
        cta_note = "This secure setup link expires in 24&nbsp;hours."
    else:
        cta_url = login_url
        cta_label = "Log In to Portal"
        cta_note = "Use the temporary password above to log in, then change it immediately."

    body = f"""
      <h2 style="margin:0 0 16px;font-size:26px;color:#111827;">
        Welcome to Mullen Analytics
      </h2>
      <p style="font-size:16px;color:#374151;line-height:26px;margin:0 0 12px;">
        Hi {name},
      </p>
      <p style="font-size:16px;color:#374151;line-height:26px;margin:0 0 24px;">
        Your client portal account has been created. Please set up your account
        using the button below.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:0 0 28px;">
        <p style="margin:4px 0;font-size:14px;color:#374151;">
          <strong>Email:</strong> {to_email}
        </p>
        <p style="margin:4px 0;font-size:14px;color:#374151;">
          <strong>Temporary Password:</strong>
          <code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:13px;">{temporary_password}</code>
        </p>
      </div>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="{cta_url}"
           style="display:inline-block;background:#0f172a;color:#ffffff;padding:14px 32px;
                  border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
          {cta_label}
        </a>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">{cta_note}</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">
        Questions? Contact us at
        <a href="mailto:admin@mullenanalytics.com" style="color:#0f172a;">
          admin@mullenanalytics.com
        </a>
      </p>
    """

    html = _email_wrapper(
        title="Welcome to Mullen Analytics",
        preheader="Set up your Mullen Analytics account",
        body_html=body,
    )
    return await send_email(to_email, "Welcome — Set Up Your Mullen Analytics Account", html)


async def send_password_reset_email(
    to_email: str,
    full_name: str | None,
    reset_token: str,
) -> bool:
    """Send a branded password reset email."""
    name = full_name.split()[0] if full_name else to_email
    reset_url = f"{settings.app_url}/portal/reset-password?token={reset_token}"

    body = f"""
      <h2 style="margin:0 0 16px;font-size:26px;color:#111827;">
        Reset Your Password
      </h2>
      <p style="font-size:16px;color:#374151;line-height:26px;margin:0 0 12px;">
        Hi {name},
      </p>
      <p style="font-size:16px;color:#374151;line-height:26px;margin:0 0 28px;">
        We received a request to reset your password. Click the button below.
        This link expires in {settings.password_reset_expire_hours}&nbsp;hour(s).
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="{reset_url}"
           style="display:inline-block;background:#0f172a;color:#ffffff;padding:14px 32px;
                  border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
          Reset My Password
        </a>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    """

    html = _email_wrapper(
        title="Reset Your Mullen Analytics Password",
        preheader="Reset your Mullen Analytics account password",
        body_html=body,
    )
    return await send_email(to_email, "Reset Your Mullen Analytics Password", html)
