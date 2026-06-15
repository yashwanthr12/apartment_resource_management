"""
config.py
---------
Centralised application configuration.
Reads values from environment variables (loaded via .env file).
"""

import os
from dotenv import load_dotenv

# Load .env file located in the project root
load_dotenv(override=True)


class Config:
    """Flask configuration class."""

    # Flask secret key — used for session cookies
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

    # Session cookie security settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() == "true"

    # ── MySQL connection ──
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "apartment_mgmt")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── File uploads ──
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "static/uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 5 * 1024 * 1024))  # 5 MB

    # ── SMTP (Billing) ──
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    APP_URL = os.getenv("APP_URL", "http://localhost:5000")

    # ── SMTP (Email OTP) ──
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "True").lower() == "true"
    EMAIL_FROM = os.getenv("EMAIL_FROM", "apartease.billing@gmail.com")


# Trigger Dev Server Reload to ingest updated .env variables


