"""
models/payment.py
-----------------
SQLAlchemy model for a Payment.
Tracks payment status and receipt image for each bill.
"""

from datetime import datetime
from models import db


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    resident_id = db.Column(
        db.Integer,
        db.ForeignKey("residents.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    bill_id = db.Column(
        db.Integer,
        db.ForeignKey("bills.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    status = db.Column(
        db.Enum("pending", "paid", "rejected", name="payment_status"),
        default="pending",
    )
    receipt_image = db.Column(db.String(255), default=None)
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    resident = db.relationship("Resident", backref="payments", lazy=True)
    bill = db.relationship("Bill", backref="payments", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "resident_id": self.resident_id,
            "resident_name": self.resident.name if self.resident else None,
            "house_number": self.resident.house_number if self.resident else None,
            "bill_id": self.bill_id,
            "split_amount": float(self.bill.split_amount) if self.bill else None,
            "category": self.bill.expense.category if self.bill and self.bill.expense else None,
            "status": self.status,
            "receipt_image": self.receipt_image,
            "verified": self.verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
