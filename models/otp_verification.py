"""
models/otp_verification.py
--------------------------
SQLAlchemy model for storing OTP (One-Time Password) verification records.
Supports secure hashing (bcrypt) and state tracking (Pending, Verified, Expired, Used).
"""

from datetime import datetime
import bcrypt
from models import db


class OTPVerification(db.Model):
    __tablename__ = "otp_verifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(150), nullable=False, index=True)
    otp_hash = db.Column(db.String(255), nullable=False)
    purpose = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False)  # pending, verified, expired, used
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

    def set_otp(self, raw_otp: str):
        """Hash and store the OTP using bcrypt."""
        self.otp_hash = bcrypt.hashpw(
            raw_otp.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_otp(self, raw_otp: str) -> bool:
        """Verify the raw OTP against the stored bcrypt hash."""
        try:
            return bcrypt.checkpw(
                raw_otp.encode("utf-8"),
                self.otp_hash.encode("utf-8")
            )
        except Exception:
            return False

    def is_expired(self) -> bool:
        """Check if the OTP has expired."""
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        """Serialize to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "email": self.email,
            "purpose": self.purpose,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
        }
