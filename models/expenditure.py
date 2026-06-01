"""
models/expenditure.py
---------------------
SQLAlchemy model for a grouped Expenditure.
An expenditure groups multiple expense categories under a single date range
and stores the split calculation (total amount / total houses = per person amount).
"""

from datetime import datetime
from models import db


class Expenditure(db.Model):
    __tablename__ = "expenditures"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    apartment_name = db.Column(
        db.String(150),
        db.ForeignKey("admins.apartment_name", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=False,
    )
    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    total_houses = db.Column(db.Integer, nullable=False)
    per_person_amount = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to linked expenses
    items = db.relationship("Expense", backref="expenditure", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "apartment_name": self.apartment_name,
            "from_date": self.from_date.isoformat(),
            "to_date": self.to_date.isoformat(),
            "total_amount": float(self.total_amount),
            "total_houses": self.total_houses,
            "per_person_amount": float(self.per_person_amount),
            "categories": [
                {
                    "id": e.id,
                    "category": e.category,
                    "custom_category": e.custom_category,
                    "amount": float(e.amount),
                    "units_used": float(e.units_used) if e.units_used else None,
                    "unit_type": e.unit_type,
                }
                for e in self.items
            ],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
