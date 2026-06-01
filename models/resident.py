"""
models/resident.py
------------------
SQLAlchemy model for a Resident.
Each resident belongs to exactly one apartment (via apartment_name).
"""

from datetime import datetime
try:
    # pyrefly: ignore [missing-import]
    from flask_login import UserMixin
except ImportError as e:
    raise ImportError(
        "Flask-Login is not installed. Install it with 'pip install Flask-Login'."
    ) from e
try:
    # pyrefly: ignore [missing-import]
    import bcrypt
except ImportError as e:
    raise ImportError(
        "bcrypt library is not installed. Install it with 'pip install bcrypt'."
    ) from e
from models import db


class Resident(UserMixin, db.Model):
    __tablename__ = "residents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    house_number = db.Column(db.String(20), nullable=False)
    apartment_name = db.Column(
        db.String(150),
        db.ForeignKey("admins.apartment_name", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    is_verified = db.Column(db.Boolean, default=False, nullable=False)  # Admin must verify before login
    is_active = db.Column(db.Boolean, default=True, nullable=False)      # Soft-delete flag (False = removed by admin)
    deactivation_requested_at = db.Column(db.DateTime, default=None, nullable=True)
    split_number = db.Column(db.Float, default=1.0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ── Password helpers ──

    def set_password(self, raw_password: str):
        self.password = bcrypt.hashpw(
            raw_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        return bcrypt.checkpw(
            raw_password.encode("utf-8"),
            self.password.encode("utf-8"),
        )

    # Prefix to avoid collision with Admin IDs
    def get_id(self):
        return f"resident-{self.id}"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "house_number": self.house_number,
            "apartment_name": self.apartment_name,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "deactivation_requested_at": self.deactivation_requested_at.isoformat() if self.deactivation_requested_at else None,
            "split_number": self.split_number,
        }
