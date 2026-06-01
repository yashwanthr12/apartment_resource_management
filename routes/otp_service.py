"""
routes/otp_service.py
---------------------
Service module for handling OTP (One-Time Password) lifecycles.
Provides:
  - OTP generation using cryptographically secure 'secrets' module.
  - Rate limiting (minimum 60 seconds between requests).
  - High-fidelity branded HTML email notification utilizing free smtplib.
  - Hashed database record creation and verification.
  - Consumption verification logic for final actions (email/password updates).
"""

import smtplib
from email.message import EmailMessage
import ssl
import secrets
from datetime import datetime, timedelta
import logging
from flask import current_app
from models import db
from models.otp_verification import OTPVerification

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit random OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def get_purpose_label(purpose: str) -> str:
    """Return a display-friendly label representing the action purpose."""
    mapping = {
        "admin-register": "Verify Your Admin Registration",
        "resident-register": "Verify Your Resident Registration",
        "change-email-current": "Change Email Address Verification (Current)",
        "change-email-new": "Change Email Address Verification (New)",
        "change-password": "Change Password Verification",
        "disable-account": "Disable Account Verification",
        "forgot-password-admin": "Verify Admin Password Reset",
        "forgot-password-resident": "Verify Resident Password Reset"
    }
    return mapping.get(purpose, "Verification Required")


def check_otp_rate_limit(email: str, purpose: str) -> bool:
    """
    Check if a verification request was made in the last 60 seconds.
    Returns True if rate-limited, False otherwise.
    """
    one_minute_ago = datetime.utcnow() - timedelta(seconds=60)
    recent_otp = OTPVerification.query.filter(
        OTPVerification.email == email,
        OTPVerification.purpose == purpose,
        OTPVerification.created_at >= one_minute_ago,
        OTPVerification.status == "pending"
    ).first()
    return recent_otp is not None


def create_otp_record(email: str, purpose: str) -> str:
    """
    Generate an OTP, mark prior pending ones as expired,
    and save the new OTP hashed in the database.
    Returns: the raw OTP code string.
    """
    # Expire prior pending OTPs for this exact email and purpose
    db.session.query(OTPVerification).filter(
        OTPVerification.email == email,
        OTPVerification.purpose == purpose,
        OTPVerification.status == "pending"
    ).update({"status": "expired"})

    raw_otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp_record = OTPVerification(
        email=email,
        purpose=purpose,
        expires_at=expires_at
    )
    otp_record.set_otp(raw_otp)

    db.session.add(otp_record)
    db.session.commit()
    return raw_otp


def send_otp_email(email: str, otp: str, purpose: str) -> bool:
    """
    Send verification email to recipient.
    Uses free python smtplib. Falls back to console log if SMTP is not configured.
    """
    purpose_label = get_purpose_label(purpose)
    smtp_server = current_app.config.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = current_app.config.get("SMTP_PORT", 465)
    smtp_username = current_app.config.get("SMTP_USERNAME", "")
    smtp_password = current_app.config.get("SMTP_PASSWORD", "")
    smtp_use_ssl = current_app.config.get("SMTP_USE_SSL", True)
    email_from = current_app.config.get("EMAIL_FROM", "apartease.billing@gmail.com")

    # High fidelity styled HTML Email Body matching ApartEase branding
    html_body = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; color: #ffffff;">
            <div style="font-size: 40px; margin-bottom: 8px;">🏠</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">ApartEase</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.85); font-weight: 500;">Simple Living. Smart Billing.</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 36px; background-color: #ffffff;">
            <h2 style="margin-top: 0; color: #1e293b; font-size: 20px; font-weight: 700; text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
                {purpose_label}
            </h2>
            
            <p style="font-size: 15px; color: #475569; line-height: 1.6; text-align: center; margin-top: 24px;">
                Use the verification code below to authorize your request.
            </p>
            
            <!-- OTP Box -->
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
                <div style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                    Your Verification Code
                </div>
                <div style="color: #6366f1; font-size: 38px; font-weight: 800; letter-spacing: 6px; margin: 10px 0;">
                    {otp}
                </div>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; margin-bottom: 0;">
                This code expires in <strong>5 minutes</strong>.<br />
                If you did not request this action, please ignore this email.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
            <h3 style="margin: 0; color: #475569; font-size: 15px; font-weight: 700;">ApartEase</h3>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Simple Living. Smart Billing.</p>
        </div>
    </div>
    """

    # Print to console log in development environment if SMTP credentials are empty
    if not smtp_username or not smtp_password:
        logger.warning(
            "\n"
            "==========================================================\n"
            "   [DEVELOPMENT MODE - OTP VERIFICATION LOG]\n"
            "   Recipient: %s\n"
            "   Purpose: %s\n"
            "   Generated OTP: %s\n"
            "==========================================================\n",
            email, purpose, otp
        )
        return True

    try:
        msg = EmailMessage()
        msg["Subject"] = f"ApartEase OTP Verification Code: {otp}"
        msg["From"] = f"ApartEase <{email_from}>"
        msg["To"] = email
        msg.set_content(f"Your verification code is: {otp}\nExpires in 5 minutes.")
        msg.add_alternative(html_body, subtype="html")

        if smtp_use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)

        logger.info("Successfully sent OTP email to %s for purpose %s", email, purpose)
        return True

    except Exception as e:
        logger.error("SMTP delivery failed for OTP to %s: %s", email, str(e))
        # Keep developer workflow functional by returning OTP in logs on delivery failure
        logger.warning(
            "\n"
            "==========================================================\n"
            "   [SMTP FAILURE - OTP LOCAL BACKUP LOG]\n"
            "   Recipient: %s\n"
            "   Purpose: %s\n"
            "   Generated OTP: %s\n"
            "==========================================================\n",
            email, purpose, otp
        )
        return False


def verify_otp_code(email: str, raw_otp: str, purpose: str) -> tuple[bool, str]:
    """
    Verify the user's OTP code.
    Returns: (success: bool, error_message: str)
    """
    otp_record = OTPVerification.query.filter(
        OTPVerification.email == email,
        OTPVerification.purpose == purpose,
        OTPVerification.status == "pending"
    ).order_by(OTPVerification.created_at.desc()).first()

    if not otp_record:
        return False, "No pending verification code found."

    if otp_record.is_expired():
        otp_record.status = "expired"
        db.session.commit()
        return False, "Verification code has expired."

    if not otp_record.check_otp(raw_otp):
        return False, "Invalid verification code."

    # Mark as verified
    otp_record.status = "verified"
    db.session.commit()
    return True, "Verification successful."


def consume_verified_otp(email: str, purpose: str) -> bool:
    """
    Consume the verified OTP record to execute final changes.
    Matches the OTP verified within the last 15 minutes.
    Returns: True if found and consumed, False otherwise.
    """
    fifteen_minutes_ago = datetime.utcnow() - timedelta(minutes=15)
    otp_record = OTPVerification.query.filter(
        OTPVerification.email == email,
        OTPVerification.purpose == purpose,
        OTPVerification.status == "verified",
        OTPVerification.created_at >= fifteen_minutes_ago
    ).order_by(OTPVerification.created_at.desc()).first()

    if otp_record:
        otp_record.status = "used"
        db.session.commit()
        return True
    return False
