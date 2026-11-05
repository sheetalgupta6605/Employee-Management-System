import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
logger = logging.getLogger(__name__)


def send_employee_invite_email(email: str, name: str, invite_url: str) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM") or smtp_username
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError as error:
        raise HTTPException(
            status_code=503,
            detail="SMTP_PORT must be a valid port number in the backend .env file.",
        ) from error

    if not smtp_host or not smtp_username or not smtp_password or not sender:
        raise HTTPException(
            status_code=503,
            detail="Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM in backend/.env.",
        )
    if not os.getenv("FRONTEND_URL"):
        raise HTTPException(
            status_code=503,
            detail="FRONTEND_URL is missing from backend/.env.",
        )

    message = EmailMessage()
    message["Subject"] = "Complete your Workify account"
    message["From"] = sender
    message["To"] = email
    message.set_content(
        f"""Hello {name},

You have been invited to join Workify.

Complete your profile and choose a password using this one-time invitation link:
{invite_url}

This invitation expires in 72 hours. If you did not expect this email, you can ignore it.
"""
    )

    use_ssl = (
        os.getenv("SMTP_USE_SSL", "").strip().lower() in {"1", "true", "yes"}
        or smtp_port == 465
    )
    if use_ssl and smtp_port != 465:
        raise HTTPException(
            status_code=503,
            detail="SMTP_USE_SSL=true requires SMTP_PORT=465. Use SMTP_PORT=587 and SMTP_USE_SSL=false for STARTTLS.",
        )

    smtp_phase = "TLS setup"
    try:
        context = ssl.create_default_context()
        smtp_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        server_options = {"context": context} if use_ssl else {}
        smtp_phase = "connect"
        with smtp_class(smtp_host, smtp_port, timeout=20, **server_options) as server:
            server.ehlo()
            if not use_ssl:
                smtp_phase = "TLS negotiation"
                server.starttls(context=context)
                server.ehlo()
            login_password = (
                "".join(smtp_password.split())
                if smtp_host.lower() == "smtp.gmail.com"
                else smtp_password
            )
            smtp_phase = "authentication"
            server.login(smtp_username, login_password)
            smtp_phase = "message delivery"
            server.send_message(message)
    except smtplib.SMTPAuthenticationError as error:
        logger.warning("SMTP invitation delivery failed during authentication.")
        raise HTTPException(
            status_code=502,
            detail="SMTP authentication failed. For Gmail, use the account email and a current Google App Password (not the regular account password).",
        ) from error
    except smtplib.SMTPRecipientsRefused as error:
        logger.warning("SMTP invitation delivery rejected one or more recipients.")
        raise HTTPException(
            status_code=502,
            detail="The mail server rejected the recipient address. Verify the employee email address and SMTP account sending permissions.",
        ) from error
    except smtplib.SMTPServerDisconnected as error:
        logger.exception("SMTP server disconnected during %s.", smtp_phase)
        raise HTTPException(
            status_code=502,
            detail=(
                f"The SMTP server closed the connection during {smtp_phase}. "
                "This is not a normal invalid-password response. Fully stop and restart Uvicorn "
                "after editing backend/.env, then verify the Gmail username and App Password "
                "and that the network allows SMTP on port 587."
            ),
        ) from error
    except (smtplib.SMTPException, OSError) as error:
        logger.exception(
            "SMTP invitation delivery failed during %s (%s).",
            smtp_phase,
            type(error).__name__,
        )
        raise HTTPException(
            status_code=502,
            detail=f"SMTP delivery failed during {smtp_phase} ({type(error).__name__}). For authentication failures, verify the provider credentials; the backend log contains additional diagnostics.",
        ) from error
