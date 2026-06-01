"""
models/__init__.py
------------------
Initialises the shared SQLAlchemy instance.
All model files import `db` from here.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Expose models for automatic DB table creation via db.create_all()
from models.admin import Admin
from models.resident import Resident
from models.expenditure import Expenditure
from models.expense import Expense
from models.bill import Bill
from models.payment import Payment
from models.otp_verification import OTPVerification
from models.email_log import EmailLog

