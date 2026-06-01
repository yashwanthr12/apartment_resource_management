"""
models/bill.py
--------------
SQLAlchemy model for a Bill.
A bill links one resident to one expense with their split amount.
"""

from datetime import datetime
from models import db


class Bill(db.Model):
    __tablename__ = "bills"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    resident_id = db.Column(
        db.Integer,
        db.ForeignKey("residents.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    expense_id = db.Column(
        db.Integer,
        db.ForeignKey("expenses.id", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    split_amount = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships for easy access
    resident = db.relationship("Resident", backref="bills", lazy=True)
    expense = db.relationship("Expense", backref="bills", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "resident_id": self.resident_id,
            "resident_name": self.resident.name if self.resident else None,
            "house_number": self.resident.house_number if self.resident else None,
            "expense_id": self.expense_id,
            "category": self.expense.category if self.expense else None,
            "custom_category": self.expense.custom_category if self.expense else None,
            "from_date": self.expense.from_date.isoformat() if self.expense else None,
            "to_date": self.expense.to_date.isoformat() if self.expense else None,
            "split_amount": float(self.split_amount),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
