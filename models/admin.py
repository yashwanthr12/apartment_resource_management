"""
models/admin.py
---------------
SQLAlchemy model for the Admin (apartment owner/manager).
Each admin creates exactly one apartment.
"""

from datetime import datetime
from flask_login import UserMixin
import bcrypt
from models import db


class Admin(UserMixin, db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    apartment_name = db.Column(db.String(150), unique=True, nullable=False)
    apartment_address = db.Column(db.Text, nullable=False)
    access_code = db.Column(db.String(50), default=None, nullable=True, unique=True)
    upi_id = db.Column(db.String(100), default=None)
    bank_details = db.Column(db.Text, default=None)  # Legacy — kept for backward compat
    bank_name = db.Column(db.String(150), default=None)
    account_holder_name = db.Column(db.String(150), default=None)
    account_number = db.Column(db.String(50), default=None)
    ifsc_code = db.Column(db.String(20), default=None)
    branch_name = db.Column(db.String(150), default=None)
    qr_code = db.Column(db.String(255), default=None)
    deactivation_requested_at = db.Column(db.DateTime, default=None, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ── Password helpers ──

    def set_password(self, raw_password: str):
        """Hash and store the password."""
        self.password = bcrypt.hashpw(
            raw_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        """Verify a raw password against the stored hash."""
        return bcrypt.checkpw(
            raw_password.encode("utf-8"),
            self.password.encode("utf-8"),
        )

    # Flask-Login requires a unique ID; prefix to avoid collision with Resident
    def get_id(self):
        return f"admin-{self.id}"

    def to_dict(self):
        """Serialise to a JSON-safe dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "apartment_name": self.apartment_name,
            "apartment_address": self.apartment_address,
            "access_code": self.access_code,
            "upi_id": self.upi_id,
            "bank_details": self.bank_details,
            "bank_name": self.bank_name,
            "account_holder_name": self.account_holder_name,
            "account_number": self.account_number,
            "ifsc_code": self.ifsc_code,
            "branch_name": self.branch_name,
            "qr_code": self.qr_code,
            "deactivation_requested_at": self.deactivation_requested_at.isoformat() if self.deactivation_requested_at else None,
        }
