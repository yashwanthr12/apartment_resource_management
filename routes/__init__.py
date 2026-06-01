"""
routes/__init__.py
------------------
Convenience imports so we can do:
    from routes import auth_bp, admin_bp, ...
"""

from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.expense import expense_bp
from routes.bill import bill_bp
from routes.payment import payment_bp
from routes.analytics import analytics_bp
