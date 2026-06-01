"""
models/expense.py
-----------------
SQLAlchemy model for an Expense.
An expense belongs to one apartment and may track resource usage (kWh, liters).
"""

from datetime import datetime
from models import db


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    apartment_name = db.Column(
        db.String(150),
        db.ForeignKey("admins.apartment_name", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date, nullable=False)
    category = db.Column(
        db.Enum("electricity", "water", "maintenance", "security", "elevator", "other",
                name="expense_category"),
        nullable=False,
    )
    custom_category = db.Column(db.String(100), default=None)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    units_used = db.Column(db.Numeric(10, 2), default=None)
    unit_type = db.Column(db.String(20), default=None)
    total_houses = db.Column(db.Integer, nullable=False)
    expenditure_id = db.Column(
        db.Integer,
        db.ForeignKey("expenditures.id", onupdate="CASCADE", ondelete="SET NULL"),
        default=None,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "apartment_name": self.apartment_name,
            "from_date": self.from_date.isoformat(),
            "to_date": self.to_date.isoformat(),
            "category": self.category,
            "custom_category": self.custom_category,
            "amount": float(self.amount),
            "units_used": float(self.units_used) if self.units_used else None,
            "unit_type": self.unit_type,
            "total_houses": self.total_houses,
            "expenditure_id": self.expenditure_id,
            "split_amount": round(float(self.amount) / self.total_houses, 2),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
