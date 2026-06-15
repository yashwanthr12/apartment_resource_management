"""
models/email_log.py
-------------------
SQLAlchemy model for logging email deliveries.
"""

from datetime import datetime
from models import db


class EmailLog(db.Model):
    __tablename__ = "email_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    recipient_email = db.Column(db.String(150), nullable=False)
    resident_id = db.Column(
        db.Integer,
        db.ForeignKey("residents.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    bill_id = db.Column(
        db.Integer,
        db.ForeignKey("bills.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    expenditure_id = db.Column(
        db.Integer,
        db.ForeignKey("expenditures.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )
    status = db.Column(db.String(50), nullable=False)  # 'success', 'failed'
    message_id = db.Column(db.String(100), nullable=True)  # Unique delivery message ID
    failure_reason = db.Column(db.Text, nullable=True)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships for easy access
    resident = db.relationship("Resident", backref="email_logs", lazy=True)
    bill = db.relationship("Bill", backref="email_logs", lazy=True)
    expenditure = db.relationship("Expenditure", backref="email_logs", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "recipient_email": self.recipient_email,
            "resident_id": self.resident_id,
            "resident_name": self.resident.name if self.resident else None,
            "bill_id": self.bill_id,
            "expenditure_id": self.expenditure_id,
            "status": self.status,
            "message_id": self.message_id,
            "failure_reason": self.failure_reason,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
        }
