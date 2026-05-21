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


async def send_invite_email(
    to_email: str,
    full_name: str | None,
    temporary_password: str,
) -> bool:
    """Send a welcome/invite email with login credentials."""
    name = full_name or to_email
    login_url = f"{settings.app_url}/portal/login"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0f172a;">Welcome to the Mullen Analytics Client Portal</h2>
      <p>Hi {name},</p>
      <p>Your account has been created. Use the credentials below to log in:</p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Login URL:</strong> <a href="{login_url}">{login_url}</a></p>
        <p style="margin: 4px 0;"><strong>Email:</strong> {to_email}</p>
        <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">{temporary_password}</code></p>
      </div>
      <p>Please log in and change your password as soon as possible.</p>
      <p>If you have any questions, reply to this email or contact us at <a href="mailto:admin@mullenanalytics.com">admin@mullenanalytics.com</a>.</p>
      <br>
      <p style="color: #64748b; font-size: 13px;">Mullen Analytics &amp; AI Consulting LLC</p>
    </div>
    """

    return await send_email(to_email, "Your Mullen Analytics Portal Access", html)


async def send_password_reset_email(
    to_email: str,
    full_name: str | None,
    reset_token: str,
) -> bool:
    """Send a password reset email."""
    name = full_name or to_email
    reset_url = f"{settings.app_url}/portal/reset-password?token={reset_token}"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0f172a;">Password Reset Request</h2>
      <p>Hi {name},</p>
      <p>Click the button below to reset your password. This link expires in {settings.password_reset_expire_hours} hour(s).</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_url}" style="background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;">If you did not request this, ignore this email.</p>
      <br>
      <p style="color: #64748b; font-size: 13px;">Mullen Analytics &amp; AI Consulting LLC</p>
    </div>
    """

    return await send_email(to_email, "Reset Your Mullen Analytics Password", html)
