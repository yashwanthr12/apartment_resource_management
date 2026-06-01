"""
app.py
------
Flask application entry point.
  - Initialises database, Flask-Login, and all Blueprints.
  - Serves the React SPA for all page routes (production).
  - Creates database tables automatically on first run.
"""

import os
from flask import Flask, send_from_directory, jsonify, session, request
# Attempt to import Flask-Login components, with clear error message if unavailable.
try:
    # pyrefly: ignore [missing-import]
    from flask_login import LoginManager, current_user
except ImportError as e:
    raise ImportError(
        "Flask-Login is not installed. Please install it using 'pip install Flask-Login' and ensure it is available in your Python environment."
    ) from e
from config import Config
from models import db
from models.admin import Admin
from models.resident import Resident
from models.expenditure import Expenditure
from flask.sessions import SecureCookieSessionInterface

class RoleBasedSessionInterface(SecureCookieSessionInterface):
    def get_cookie_name(self, app):
        from flask import request
        try:
            role = request.headers.get("X-Session-Role")
            if role == "admin":
                return "admin_session"
            elif role == "resident":
                return "resident_session"
            
            if request.path.startswith("/api/admin"):
                return "admin_session"
            elif request.path.startswith("/api/resident"):
                return "resident_session"
        except RuntimeError:
            pass
        return app.config.get("SESSION_COOKIE_NAME", "session")

app = Flask(__name__)
app.config.from_object(Config)
app.session_interface = RoleBasedSessionInterface()

# Ensure upload directory exists
os.makedirs(os.path.join(app.root_path, app.config["UPLOAD_FOLDER"]), exist_ok=True)

# ── Database ──
db.init_app(app)

# ── Flask-Login ──
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id: str):
    """
    Flask-Login user_loader callback.
    The user_id is prefixed: 'admin-{id}' or 'resident-{id}'.
    Also ensures session['role'] stays in sync so that authorization
    checks in route handlers never fail due to a missing role key.
    """
    if not user_id or not isinstance(user_id, str):
        return None
    if user_id.startswith("admin-"):
        try:
            admin = Admin.query.get(int(user_id.split("-", 1)[1]))
            if admin:
                session["role"] = "admin"
            return admin
        except (ValueError, IndexError):
            return None
    elif user_id.startswith("resident-"):
        try:
            resident = Resident.query.get(int(user_id.split("-", 1)[1]))
            if resident:
                session["role"] = "resident"
            return resident
        except (ValueError, IndexError):
            return None
    return None


@login_manager.unauthorized_handler
def unauthorized():
    """Return 401 JSON for API requests instead of redirecting."""
    return jsonify({"error": "Authentication required"}), 401


@app.errorhandler(Exception)
def handle_unexpected_error(e):
    """
    Global exception handler.
    Logs unhandled exceptions internally and masks stack traces from users.
    """
    app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({"error": "An unexpected error occurred. Please contact the administrator."}), 500


# ── Prevent browser caching of API responses (real-time data) ──
@app.after_request
def add_no_cache_headers(response):
    """Add no-cache headers to all API responses so dashboards always
    reflect the latest database state without requiring logout/login."""
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# ── Register Blueprints ──
from routes import auth_bp, admin_bp, expense_bp, bill_bp, payment_bp, analytics_bp

app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(expense_bp)
app.register_blueprint(bill_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(analytics_bp)


# ── Serve React SPA (production build) ───────────────────────
# In development, the Vite dev server on :5173 handles serving.
# In production, Flask serves the built React bundle from static/react/.

REACT_BUILD_DIR = os.path.join(app.root_path, "static", "react")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    """
    Serve the React single-page application.
    - If a static file exists in the build dir, serve it directly.
    - Otherwise, serve index.html for client-side routing.
    API routes are handled by blueprints registered above.
    """
    if path and os.path.exists(os.path.join(REACT_BUILD_DIR, path)):
        return send_from_directory(REACT_BUILD_DIR, path)
    # Serve index.html for all non-API, non-static routes (React Router)
    index_path = os.path.join(REACT_BUILD_DIR, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(REACT_BUILD_DIR, "index.html")
    # If React build doesn't exist yet, show a helpful message
    return (
        "<h2>React frontend not built yet</h2>"
        "<p>Run <code>cd frontend && npm run build</code> to build the React app, "
        "or run <code>cd frontend && npm run dev</code> for development.</p>"
    ), 200


# ── Create tables & run ──
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        # Failsafe migrations: Add access_code and deactivation_requested_at columns
        try:
            from sqlalchemy import text
            # access_code
            result = db.session.execute(text("SHOW COLUMNS FROM admins LIKE 'access_code'")).fetchone()
            if not result:
                db.session.execute(text("ALTER TABLE admins ADD COLUMN access_code VARCHAR(50) DEFAULT NULL"))
                db.session.commit()
                app.logger.info("Successfully added 'access_code' column to 'admins' table.")

            # deactivation_requested_at in admins
            result = db.session.execute(text("SHOW COLUMNS FROM admins LIKE 'deactivation_requested_at'")).fetchone()
            if not result:
                db.session.execute(text("ALTER TABLE admins ADD COLUMN deactivation_requested_at DATETIME DEFAULT NULL"))
                db.session.commit()
                app.logger.info("Successfully added 'deactivation_requested_at' column to 'admins' table.")

            # deactivation_requested_at in residents
            result = db.session.execute(text("SHOW COLUMNS FROM residents LIKE 'deactivation_requested_at'")).fetchone()
            if not result:
                db.session.execute(text("ALTER TABLE residents ADD COLUMN deactivation_requested_at DATETIME DEFAULT NULL"))
                db.session.commit()
                app.logger.info("Successfully added 'deactivation_requested_at' column to 'residents' table.")

            # split_number in residents
            result = db.session.execute(text("SHOW COLUMNS FROM residents LIKE 'split_number'")).fetchone()
            if not result:
                db.session.execute(text("ALTER TABLE residents ADD COLUMN split_number FLOAT NOT NULL DEFAULT 1.0"))
                db.session.commit()
                app.logger.info("Successfully added 'split_number' column to 'residents' table.")

        except Exception as e:
            db.session.rollback()
            app.logger.warning(f"Failsafe migration failed (may be already applied): {e}")
    app.run(debug=True)
