"""DealShield AI — Email Delivery Service.

Supports Console (Dev), InMemory (Testing), and SMTP (Staging/Production).
All OTP transmissions are handled strictly through the configured sender.
"""

from abc import ABC, abstractmethod
import email.message
import logging
import smtplib
from typing import Dict, List, Optional
from app.core.config import settings

logger = logging.getLogger("dealshield.email")


class EmailSender(ABC):
    """Abstract base class for email delivery."""

    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> None:
        """Send an email to a recipient.
        
        Args:
            to: Recipient email address
            subject: Subject line
            body: Plaintext body content
        """
        pass


class ConsoleEmailSender(EmailSender):
    """Development-only console email sender.
    
    Prints messages to stdout/logger clearly tagged as [DEV ONLY].
    """

    def send(self, to: str, subject: str, body: str) -> None:
        output = (
            f"\n==================== [DEV ONLY] EMAIL DISPATCH ====================\n"
            f"To: {to}\n"
            f"Subject: {subject}\n"
            f"From: {settings.SMTP_FROM}\n"
            f"Content:\n{body}\n"
            f"==================================================================="
        )
        print(output)
        logger.info("[DEV ONLY] Email dispatched to %s: %s", to, subject)


class InMemoryEmailSender(EmailSender):
    """Test-only in-memory email sender.
    
    Maintains a class-level outbox list for test assertions and verifications.
    """

    outbox: List[Dict[str, str]] = []

    def send(self, to: str, subject: str, body: str) -> None:
        self.outbox.append({
            "to": to,
            "subject": subject,
            "body": body,
            "from": settings.SMTP_FROM,
        })
        logger.debug("[InMemory] Appended email to %s (outbox count: %d)", to, len(self.outbox))

    @classmethod
    def clear(cls) -> None:
        """Clear all messages in the in-memory outbox."""
        cls.outbox.clear()

    @classmethod
    def get_sent_emails(cls) -> List[Dict[str, str]]:
        """Return all sent emails in the in-memory outbox."""
        return cls.outbox


class SmtpEmailSender(EmailSender):
    """Production and staging SMTP email sender.
    
    Uses standard library smtplib with optional STARTTLS and authentication.
    """

    def send(self, to: str, subject: str, body: str) -> None:
        if not settings.SMTP_HOST:
            raise ValueError("SMTP_HOST must be configured to use SmtpEmailSender")

        from_address = settings.SMTP_FROM
        if (not from_address or "dealshield.local" in from_address) and settings.SMTP_USERNAME and "@" in settings.SMTP_USERNAME:
            from_address = f"DealShield AI <{settings.SMTP_USERNAME}>"

        msg = email.message.EmailMessage()
        msg["Subject"] = subject
        msg["From"] = from_address
        msg["To"] = to
        msg.set_content(body)

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
                logger.info("Successfully sent SMTP email to %s (Subject: %s)", to, subject)
        except Exception as e:
            logger.error("Failed to send SMTP email to %s: %s", to, str(e))
            raise


def get_email_sender() -> EmailSender:
    """Return the configured EmailSender instance dynamically based on settings.
    
    Raises:
        RuntimeError: If in production environment and using a dev email backend.
    """
    backend = (settings.EMAIL_BACKEND or "console").strip().lower()

    if settings.ENVIRONMENT == "production" and backend in ("console", "memory"):
        raise RuntimeError(
            f"Refusing to use dev email backend '{backend}' in production environment. "
            "Configure SMTP credentials and set EMAIL_BACKEND=smtp."
        )

    if backend == "memory":
        return InMemoryEmailSender()
    elif backend == "smtp":
        return SmtpEmailSender()
    elif backend == "console":
        return ConsoleEmailSender()
    else:
        # If not explicitly specified, auto-select SMTP if host is configured
        if settings.SMTP_HOST and settings.SMTP_USERNAME:
            return SmtpEmailSender()
        return ConsoleEmailSender()
