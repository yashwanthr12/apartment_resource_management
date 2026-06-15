"""
routes/auth.py
--------------
Authentication routes for Admin and Resident:
  - Register
  - Login
  - Logout
  - List apartments (for resident registration dropdown)
"""

from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from models import db
from models.admin import Admin
from models.resident import Resident
from routes.otp_service import check_otp_rate_limit, create_otp_record, send_otp_email, verify_otp_code

import re
import time
from collections import defaultdict

auth_bp = Blueprint("auth", __name__)


# ─── OTP Send Endpoint ───────────────────────────────────────
@auth_bp.route("/api/auth/send-otp", methods=["POST"])
def send_otp():
    """
    Generate, register, and email a 6-digit verification code.
    Expected JSON: { email, purpose }
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    purpose = data.get("purpose", "").strip()

    if not email or not purpose:
        return jsonify({"error": "Email and purpose are required"}), 400

    if not _is_valid_email(email):
        return jsonify({"error": "Invalid email address format"}), 400

    # Business Validation based on purpose
    if purpose == "admin-register":
        if Admin.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 409
    elif purpose == "resident-register":
        if Resident.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 409
    elif purpose == "change-email-new":
        if Admin.query.filter_by(email=email).first() or Resident.query.filter_by(email=email).first():
            return jsonify({"error": "New email is already in use by another account"}), 409
    elif purpose == "forgot-password-admin":
        if not Admin.query.filter_by(email=email).first():
            return jsonify({"error": "Email address is not registered."}), 404
    elif purpose == "forgot-password-resident":
        if not Resident.query.filter_by(email=email).first():
            return jsonify({"error": "Email address is not registered."}), 404

    # Rate limiting
    if check_otp_rate_limit(email, purpose):
        return jsonify({"error": "Please wait 60 seconds before requesting another code."}), 429

    # Create OTP record
    try:
        raw_otp = create_otp_record(email, purpose)
        # Send email (falls back to logging if SMTP not configured)
        sent = send_otp_email(email, raw_otp, purpose)
        if not sent:
            return jsonify({"error": "Failed to deliver verification code. Please check your SMTP settings or connection."}), 500
        return jsonify({"message": "Verification code sent successfully!"}), 200
    except Exception as e:
        current_app.logger.error(f"OTP generation/sending error: {e}")
        return jsonify({"error": "Failed to send verification code. Please try again."}), 500


# ─── OTP Verify Endpoint ─────────────────────────────────────
@auth_bp.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    """
    Verify the user's OTP code.
    Expected JSON: { email, otp, purpose }
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    otp = data.get("otp", "").strip()
    purpose = data.get("purpose", "").strip()

    if not email or not otp or not purpose:
        return jsonify({"error": "Email, verification code, and purpose are required"}), 400

    success, message = verify_otp_code(email, otp, purpose)
    if success:
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 400


# In-memory store for login rate-limiting (5 failures = 5 minutes block)
# Key: email string -> Value: [failed_attempts_count, block_until_timestamp]
_failed_attempts = defaultdict(lambda: [0, 0.0])

def _is_valid_email(email):
    """Validate email format using a standard regular expression."""
    return bool(re.match(r"^[^@]+@[^@]+\.[^@]+$", email))

def _check_rate_limit(email):
    """Check if the given email is currently rate-limited."""
    attempts, block_until = _failed_attempts[email]
    current_time = time.time()
    if current_time < block_until:
        return False, int(block_until - current_time)
    return True, 0

def _record_failed_attempt(email):
    """Record a failed login attempt. Blocks the email if attempts >= 5."""
    attempts, block_until = _failed_attempts[email]
    attempts += 1
    if attempts >= 5:
        block_until = time.time() + 300  # Block for 5 minutes
        attempts = 0  # Reset counter
    _failed_attempts[email] = [attempts, block_until]

def _reset_attempts(email):
    """Reset failed login attempts on successful login."""
    if email in _failed_attempts:
        del _failed_attempts[email]


def validate_password_strength(password):
    """
    Validate password strength against policy:
    - Minimum 8 characters
    - Maximum 12 characters
    - At least 1 uppercase letter (A-Z)
    - At least 1 lowercase letter (a-z)
    - At least 1 number (0-9)
    - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
    """
    if not password or not isinstance(password, str):
        return False, "Password is required."
    if len(password) < 8 or len(password) > 12:
        return False, "Password must be between 8 and 12 characters."
    if not any('A' <= c <= 'Z' for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any('a' <= c <= 'z' for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any('0' <= c <= '9' for c in password):
        return False, "Password must contain at least one number."
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character."
    return True, "Password meets all security requirements."


# ─── Admin Registration ──────────────────────────────────────
@auth_bp.route("/api/admin/register", methods=["POST"])
def admin_register():
    """
    Register a new admin and create their apartment.
    Expected JSON: { name, email, password, apartment_name, apartment_address, access_code }
    """
    data = request.get_json() or {}

    # Validate required fields
    required = ["name", "email", "password", "apartment_name", "apartment_address"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    # Validate password strength
    password = data.get("password", "")
    is_valid_pwd, pwd_error = validate_password_strength(password)
    if not is_valid_pwd:
        return jsonify({"error": pwd_error}), 400

    access_code = (data.get("access_code") or data.get("accessCode", "")).strip().upper()
    if not access_code:
        return jsonify({"error": "Access code is required"}), 400

    # Sanitize and validate email
    email = data["email"].strip().lower()
    if not _is_valid_email(email):
        return jsonify({"error": "Invalid email address format"}), 400

    # Check for duplicate email
    if Admin.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Check for duplicate apartment name
    if Admin.query.filter_by(apartment_name=data["apartment_name"]).first():
        return jsonify({"error": "Apartment name already taken"}), 409

    # Check for duplicate access code
    if Admin.query.filter_by(access_code=access_code).first():
        return jsonify({"error": "Access code already taken by another apartment"}), 409

    # Enforce OTP consumption
    from routes.otp_service import consume_verified_otp
    if not consume_verified_otp(email, "admin-register"):
        return jsonify({"error": "Email verification is required to complete registration."}), 400

    admin = Admin(
        name=data["name"],
        email=email,
        apartment_name=data["apartment_name"],
        apartment_address=data["apartment_address"],
        access_code=access_code,
    )
    admin.set_password(data["password"])

    db.session.add(admin)
    db.session.commit()

    return jsonify({"message": "Admin registered successfully", "admin": admin.to_dict()}), 201


# ─── Verify Apartment Access Code ───────────────────────────
@auth_bp.route("/api/apartments/verify-code", methods=["GET"])
def verify_apartment_code():
    """
    Verify an apartment access code entered by a resident.
    Returns: { message: "Apartment Found", apartment_name }
    """
    code = request.args.get("code", "").strip().upper()
    if not code:
        return jsonify({"error": "Access code is required"}), 400

    # Search for admin with this access_code
    admin = Admin.query.filter_by(access_code=code).first()
    if admin:
        return jsonify({
            "message": "Apartment Found",
            "apartment_name": admin.apartment_name
        }), 200

    # Backward compatibility fallback: derived alphanumeric code match
    all_admins = Admin.query.all()
    for a in all_admins:
        derived = re.sub(r"[^A-Za-z0-9]", "", a.apartment_name).upper()
        if derived == code:
            return jsonify({
                "message": "Apartment Found",
                "apartment_name": a.apartment_name
            }), 200

    return jsonify({"error": "Invalid access code. Please check with your apartment administrator."}), 404


# ─── Admin Login ──────────────────────────────────────────────
@auth_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    """
    Login an admin.
    Expected JSON: { email, password }
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # Check rate limit
    allowed, seconds_left = _check_rate_limit(email)
    if not allowed:
        return jsonify({"error": f"Too many login attempts. Please try again in {seconds_left} seconds."}), 429

    admin = Admin.query.filter_by(email=email).first()

    if not admin or not admin.check_password(data.get("password", "")):
        _record_failed_attempt(email)
        return jsonify({"error": "Invalid email or password"}), 401

    # Check deactivation grace period
    if admin.deactivation_requested_at:
        from datetime import datetime
        time_elapsed = datetime.utcnow() - admin.deactivation_requested_at
        if time_elapsed.total_seconds() > 86400:  # 24 hours
            return jsonify({"error": "Your account has been permanently deactivated."}), 403
        else:
            # Log in but return pending_deactivation flag so frontend can intercept and show recovery card
            _reset_attempts(email)
            login_user(admin)
            session["role"] = "admin"
            return jsonify({
                "message": "Login successful",
                "admin": admin.to_dict(),
                "pending_deactivation": True,
                "deactivation_requested_at": admin.deactivation_requested_at.isoformat()
            })

    _reset_attempts(email)
    login_user(admin)
    session["role"] = "admin"
    return jsonify({"message": "Login successful", "admin": admin.to_dict()})


# ─── Resident Registration ───────────────────────────────────
@auth_bp.route("/api/resident/register", methods=["POST"])
def resident_register():
    """
    Register a new resident under an existing apartment.
    Expected JSON: { name, email, password, house_number, apartment_name }
    """
    data = request.get_json() or {}

    required = ["name", "email", "password", "house_number", "apartment_name"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    # Validate password strength
    password = data.get("password", "")
    is_valid_pwd, pwd_error = validate_password_strength(password)
    if not is_valid_pwd:
        return jsonify({"error": pwd_error}), 400

    # Sanitize and validate email
    email = data["email"].strip().lower()
    if not _is_valid_email(email):
        return jsonify({"error": "Invalid email address format"}), 400

    # Verify apartment exists
    if not Admin.query.filter_by(apartment_name=data["apartment_name"]).first():
        return jsonify({"error": "Apartment not found"}), 404

    # Check for duplicate email
    if Resident.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Enforce OTP consumption
    from routes.otp_service import consume_verified_otp
    if not consume_verified_otp(email, "resident-register"):
        return jsonify({"error": "Email verification is required to complete registration."}), 400

    resident = Resident(
        name=data["name"],
        email=email,
        house_number=data["house_number"],
        apartment_name=data["apartment_name"],
        is_verified=False,  # Requires admin verification before login
    )
    resident.set_password(data["password"])

    db.session.add(resident)
    db.session.commit()

    return jsonify({
        "message": "Registration successful! Your account is pending admin approval. You will be able to login once verified.",
        "resident": resident.to_dict(),
    }), 201


# ─── Resident Login ──────────────────────────────────────────
@auth_bp.route("/api/resident/login", methods=["POST"])
def resident_login():
    """
    Login a resident.
    Expected JSON: { email, password }
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # Check rate limit
    allowed, seconds_left = _check_rate_limit(email)
    if not allowed:
        return jsonify({"error": f"Too many login attempts. Please try again in {seconds_left} seconds."}), 429

    resident = Resident.query.filter_by(email=email).first()

    if not resident or not resident.check_password(data.get("password", "")):
        _record_failed_attempt(email)
        return jsonify({"error": "Invalid email or password"}), 401

    # Check deactivation grace period
    if resident.deactivation_requested_at:
        from datetime import datetime
        time_elapsed = datetime.utcnow() - resident.deactivation_requested_at
        if time_elapsed.total_seconds() > 86400:  # 24 hours
            return jsonify({"error": "Your account has been permanently deactivated."}), 403
        else:
            # Log in but return pending_deactivation flag so frontend can intercept and show recovery card
            _reset_attempts(email)
            login_user(resident)
            session["role"] = "resident"
            return jsonify({
                "message": "Login successful",
                "resident": resident.to_dict(),
                "pending_deactivation": True,
                "deactivation_requested_at": resident.deactivation_requested_at.isoformat()
            })

    # ── Soft-delete gate: reactivation ──
    if not resident.is_active:
        _reset_attempts(email)
        resident.is_active = True
        resident.is_verified = False
        db.session.commit()
        return jsonify({"error": "Admin verification is required before accessing this apartment account."}), 403

    # ── Strict verification gate ──
    if not resident.is_verified:
        return jsonify({"error": "Admin verification is required before accessing this apartment account."}), 403

    _reset_attempts(email)
    login_user(resident)
    session["role"] = "resident"
    return jsonify({"message": "Login successful", "resident": resident.to_dict()})


# ─── Logout (both roles) ─────────────────────────────────────
@auth_bp.route("/api/logout")
@login_required
def logout():
    logout_user()
    session.clear()
    return jsonify({"message": "Logged out"})


# ─── List Apartments (for dropdown) ──────────────────────────
@auth_bp.route("/api/apartments", methods=["GET"])
def list_apartments():
    """Return all apartment names for the resident registration dropdown."""
    admins = Admin.query.with_entities(Admin.apartment_name).all()
    return jsonify([a.apartment_name for a in admins])


# ─── Current User Info ────────────────────────────────────────
@auth_bp.route("/api/me", methods=["GET"])
@login_required
def me():
    """Return the current logged-in user's info and role."""
    role = session.get("role", "unknown")
    data = current_user.to_dict()
    data["role"] = role
    return jsonify(data)


# ─── Account & Settings API Endpoints ─────────────────────────

@auth_bp.route("/api/auth/update-profile", methods=["POST"])
@login_required
def update_profile():
    """
    Update profile details for the currently logged-in Admin or Resident.
    Admin receives: { name, email, apartment_name, apartment_address, access_code }
    Resident receives: { name, email, house_number }
    """
    data = request.get_json() or {}
    role = session.get("role")
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    
    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 400
        
    if not _is_valid_email(email):
        return jsonify({"error": "Invalid email address format"}), 400

    if role == "admin":
        # Check email duplicate
        dup_email = Admin.query.filter(Admin.email == email, Admin.id != current_user.id).first()
        if dup_email or Resident.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered by another account"}), 409
            
        apartment_name = data.get("apartment_name", "").strip()
        apartment_address = data.get("apartment_address", "").strip()
        access_code = data.get("access_code", "").strip().upper()
        
        if not apartment_name or not apartment_address or not access_code:
            return jsonify({"error": "All apartment details and access code are required"}), 400
            
        # Check duplicate apartment name or access code
        dup_apt = Admin.query.filter(Admin.apartment_name == apartment_name, Admin.id != current_user.id).first()
        if dup_apt:
            return jsonify({"error": "Apartment name already taken"}), 409
            
        dup_code = Admin.query.filter(Admin.access_code == access_code, Admin.id != current_user.id).first()
        if dup_code:
            return jsonify({"error": "Access code already taken by another apartment"}), 409
            
        # Perform updates
        current_user.name = name
        current_user.email = email
        current_user.apartment_name = apartment_name
        current_user.apartment_address = apartment_address
        current_user.access_code = access_code
        db.session.commit()
        
        return jsonify({"message": "Profile updated successfully", "user": current_user.to_dict()})
        
    elif role == "resident":
        # Check email duplicate
        dup_email = Resident.query.filter(Resident.email == email, Resident.id != current_user.id).first()
        if dup_email or Admin.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered by another account"}), 409
            
        house_number = data.get("house_number", "").strip()
        if not house_number:
            return jsonify({"error": "Flat number is required"}), 400
            
        current_user.name = name
        current_user.email = email
        current_user.house_number = house_number
        db.session.commit()
        
        return jsonify({"message": "Profile updated successfully", "user": current_user.to_dict()})
        
    return jsonify({"error": "Invalid role"}), 400


@auth_bp.route("/api/auth/change-email", methods=["POST"])
@login_required
def change_email():
    """
    Step 5 secure save: requires password verification, duplicate validation, and updates email.
    Expected JSON: { current_email, new_email, password }
    """
    data = request.get_json() or {}
    new_email = data.get("new_email", "").strip().lower()
    password = data.get("password", "")
    
    if not new_email or not password:
        return jsonify({"error": "New email and password are required"}), 400
        
    if not _is_valid_email(new_email):
        return jsonify({"error": "Invalid new email address format"}), 400
        
    # Authenticate password
    if not current_user.check_password(password):
        return jsonify({"error": "Incorrect password"}), 401
        
    # Check email duplicate
    if Admin.query.filter_by(email=new_email).first() or Resident.query.filter_by(email=new_email).first():
        return jsonify({"error": "New email is already in use by another account"}), 409

    # Enforce OTP consumption
    from routes.otp_service import consume_verified_otp
    if not consume_verified_otp(current_user.email, "change-email-current"):
        return jsonify({"error": "Current email verification code has not been verified or has expired."}), 400
    if not consume_verified_otp(new_email, "change-email-new"):
        return jsonify({"error": "New email verification code has not been verified or has expired."}), 400
        
    current_user.email = new_email
    db.session.commit()
    
    return jsonify({"message": "Email address updated successfully", "user": current_user.to_dict()})


@auth_bp.route("/api/auth/change-password", methods=["POST"])
@login_required
def change_password():
    """
    Save password endpoint: sets hashed new password.
    Expected JSON: { current_email, new_password }
    """
    data = request.get_json() or {}
    new_password = data.get("new_password", "")
    
    if not new_password:
        return jsonify({"error": "New password is required"}), 400

    # Validate password strength
    is_valid_pwd, pwd_error = validate_password_strength(new_password)
    if not is_valid_pwd:
        return jsonify({"error": pwd_error}), 400

    # Enforce OTP consumption
    from routes.otp_service import consume_verified_otp
    if not consume_verified_otp(current_user.email, "change-password"):
        return jsonify({"error": "Verification code has not been verified or has expired."}), 400
        
    current_user.set_password(new_password)
    db.session.commit()
    
    return jsonify({"message": "Password updated successfully"})


@auth_bp.route("/api/auth/disable-account", methods=["POST"])
@login_required
def disable_account():
    """
    Initiates account disabling. Enters grace-period deactivation.
    """
    # Enforce OTP consumption
    from routes.otp_service import consume_verified_otp
    if not consume_verified_otp(current_user.email, "disable-account"):
        return jsonify({"error": "Verification code has not been verified or has expired."}), 400

    from datetime import datetime
    from flask_login import logout_user
    current_user.deactivation_requested_at = datetime.utcnow()
    db.session.commit()
    
    # Immediately log user out to force deactivation state on next interaction
    logout_user()
    session.clear()
    
    return jsonify({"message": "Account successfully scheduled for deactivation."})


@auth_bp.route("/api/auth/restore-account", methods=["POST"])
@login_required
def restore_account():
    """
    Fully restores account within 24-hour grace period.
    Only allows authenticated users to restore their own account.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    role = data.get("role", "").strip().lower()
    
    if not email or not role:
        return jsonify({"error": "Email and role are required"}), 400
        
    if role == "admin":
        if session.get("role") != "admin" or current_user.email != email:
            return jsonify({"error": "Unauthorized"}), 403
        user = Admin.query.filter_by(email=email).first()
    elif role == "resident":
        if session.get("role") != "resident" or current_user.email != email:
            return jsonify({"error": "Unauthorized"}), 403
        user = Resident.query.filter_by(email=email).first()
    else:
        return jsonify({"error": "Invalid role specified"}), 400
        
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # Clear deactivation grace period
    user.deactivation_requested_at = None
    db.session.commit()
    
    return jsonify({"message": "Account successfully restored!", "user": user.to_dict()})



@auth_bp.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    """
    Reset password using a verified OTP.
    Expected JSON: { email, role, new_password }
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    role = data.get("role", "").strip().lower()
    new_password = data.get("new_password", "")
    
    if not email or not role or not new_password:
        return jsonify({"error": "Email, role, and new password are required"}), 400
        
    # Validate password strength
    is_valid_pwd, pwd_error = validate_password_strength(new_password)
    if not is_valid_pwd:
        return jsonify({"error": pwd_error}), 400

    purpose = f"forgot-password-{role}"
    
    # Enforce OTP consumption
    from routes.otp_service import consume_verified_otp
    if not consume_verified_otp(email, purpose):
        return jsonify({"error": "Verification code has not been verified or has expired."}), 400
        
    # Update password based on role
    if role == "admin":
        user = Admin.query.filter_by(email=email).first()
    elif role == "resident":
        user = Resident.query.filter_by(email=email).first()
    else:
        return jsonify({"error": "Invalid role specified"}), 400
        
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({"message": "Password reset successfully!"}), 200
