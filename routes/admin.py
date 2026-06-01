"""
routes/admin.py
---------------
Admin-only routes:
  - Dashboard statistics
  - Payment settings (UPI, bank, QR code)
  - Resident list for the admin's apartment
"""

import os
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from models import db
from models.admin import Admin
from models.resident import Resident
from models.expense import Expense
from models.bill import Bill
from models.payment import Payment

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    """Return an error response if the current user is not an admin."""
    from flask import session
    # Primary check: session role
    if session.get("role") == "admin":
        return None
    # Fallback: check if current_user is an Admin instance (session role may have been lost)
    if isinstance(current_user, Admin):
        session["role"] = "admin"  # Re-set the lost session role
        return None
    return jsonify({"error": "Admin access required"}), 403


# ─── Dashboard Stats ─────────────────────────────────────────
@admin_bp.route("/api/admin/dashboard-stats", methods=["GET"])
@login_required
def dashboard_stats():
    err = _require_admin()
    if err:
        return err

    apt = current_user.apartment_name

    total_residents = Resident.query.filter_by(apartment_name=apt, is_verified=True, is_active=True).count()
    total_expenses = db.session.query(db.func.sum(Expense.amount)).filter_by(apartment_name=apt).scalar() or 0
    total_bills = Bill.query.join(Expense).filter(Expense.apartment_name == apt).count()
    pending_payments = (
        Payment.query
        .join(Bill)
        .join(Expense)
        .filter(Expense.apartment_name == apt, Payment.status == "pending")
        .count()
    )
    paid_payments = (
        Payment.query
        .join(Bill)
        .join(Expense)
        .filter(Expense.apartment_name == apt, Payment.verified == True)
        .count()
    )

    return jsonify({
        "apartment_name": apt,
        "total_residents": total_residents,
        "total_expenses": float(total_expenses),
        "total_bills": total_bills,
        "pending_payments": pending_payments,
        "paid_payments": paid_payments,
    })


# ─── Resident List ───────────────────────────────────────────
@admin_bp.route("/api/admin/residents", methods=["GET"])
@login_required
def admin_residents():
    err = _require_admin()
    if err:
        return err

    residents = Resident.query.filter_by(
        apartment_name=current_user.apartment_name,
        is_verified=True,
        is_active=True,
    ).all()
    return jsonify([r.to_dict() for r in residents])


# ─── Payment Settings (GET / PUT) ────────────────────────────
@admin_bp.route("/api/admin/payment-settings", methods=["GET"])
@login_required
def get_payment_settings():
    err = _require_admin()
    if err:
        return err

    return jsonify({
        "upi_id": current_user.upi_id,
        "bank_details": current_user.bank_details,
        "bank_name": current_user.bank_name,
        "account_holder_name": current_user.account_holder_name,
        "account_number": current_user.account_number,
        "ifsc_code": current_user.ifsc_code,
        "branch_name": current_user.branch_name,
        "qr_code": current_user.qr_code,
    })


@admin_bp.route("/api/admin/payment-settings", methods=["PUT"])
@login_required
def update_payment_settings():
    err = _require_admin()
    if err:
        return err

    try:
        admin = Admin.query.get(current_user.id)
        if not admin:
            return jsonify({"error": "Admin record not found"}), 404

        # Handle form data (may include file upload for QR code)
        if request.content_type and "multipart/form-data" in request.content_type:
            admin.upi_id = request.form.get("upi_id", admin.upi_id) or None
            admin.bank_name = request.form.get("bank_name", admin.bank_name) or None
            admin.account_holder_name = request.form.get("account_holder_name", admin.account_holder_name) or None
            admin.account_number = request.form.get("account_number", admin.account_number) or None
            admin.ifsc_code = request.form.get("ifsc_code", admin.ifsc_code) or None
            admin.branch_name = request.form.get("branch_name", admin.branch_name) or None

            # Build a combined bank_details string for backward compatibility
            parts = [p for p in [
                f"Bank: {admin.bank_name}" if admin.bank_name else None,
                f"A/C Holder: {admin.account_holder_name}" if admin.account_holder_name else None,
                f"A/C No: {admin.account_number}" if admin.account_number else None,
                f"IFSC: {admin.ifsc_code}" if admin.ifsc_code else None,
                f"Branch: {admin.branch_name}" if admin.branch_name else None,
            ] if p]
            admin.bank_details = "\n".join(parts) if parts else None

            qr_file = request.files.get("qr_code")
            if qr_file and qr_file.filename:
                # Extension validation to mitigate arbitrary file upload vulnerability
                ext = qr_file.filename.rsplit(".", 1)[-1].lower() if "." in qr_file.filename else ""
                if ext not in {"png", "jpg", "jpeg", "gif", "webp"}:
                    return jsonify({"error": "Invalid file type. Only PNG, JPG, JPEG, GIF, and WEBP image uploads are allowed for QR codes."}), 400
                filename = secure_filename(f"qr_{admin.id}_{qr_file.filename}")
                upload_dir = os.path.join(current_app.root_path, current_app.config["UPLOAD_FOLDER"])
                os.makedirs(upload_dir, exist_ok=True)
                filepath = os.path.join(upload_dir, filename)
                qr_file.save(filepath)
                admin.qr_code = f"{current_app.config['UPLOAD_FOLDER']}/{filename}"
        else:
            data = request.get_json()
            admin.upi_id = data.get("upi_id", admin.upi_id) or None
            admin.bank_name = data.get("bank_name", admin.bank_name) or None
            admin.account_holder_name = data.get("account_holder_name", admin.account_holder_name) or None
            admin.account_number = data.get("account_number", admin.account_number) or None
            admin.ifsc_code = data.get("ifsc_code", admin.ifsc_code) or None
            admin.branch_name = data.get("branch_name", admin.branch_name) or None

            parts = [p for p in [
                f"Bank: {admin.bank_name}" if admin.bank_name else None,
                f"A/C Holder: {admin.account_holder_name}" if admin.account_holder_name else None,
                f"A/C No: {admin.account_number}" if admin.account_number else None,
                f"IFSC: {admin.ifsc_code}" if admin.ifsc_code else None,
                f"Branch: {admin.branch_name}" if admin.branch_name else None,
            ] if p]
            admin.bank_details = "\n".join(parts) if parts else None

        db.session.commit()
        return jsonify({"message": "Payment settings updated", "settings": {
            "upi_id": admin.upi_id,
            "bank_details": admin.bank_details,
            "bank_name": admin.bank_name,
            "account_holder_name": admin.account_holder_name,
            "account_number": admin.account_number,
            "ifsc_code": admin.ifsc_code,
            "branch_name": admin.branch_name,
            "qr_code": admin.qr_code,
        }})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save settings: {str(e)}"}), 500


# ─── Resident: Fetch Payment Info (read-only) ────────────────
@admin_bp.route("/api/resident/payment-info", methods=["GET"])
@login_required
def resident_payment_info():
    """
    Read-only endpoint for residents to fetch their apartment admin's
    payment settings (UPI ID, bank details, QR code).
    Data is fetched directly from the admin table — no duplication.
    """
    from flask import session
    if session.get("role") != "resident":
        return jsonify({"error": "Resident access required"}), 403

    # Look up the admin for this resident's apartment
    admin = Admin.query.filter_by(
        apartment_name=current_user.apartment_name
    ).first()

    if not admin:
        return jsonify({"error": "Apartment admin not found"}), 404

    return jsonify({
        "upi_id": admin.upi_id,
        "bank_details": admin.bank_details,
        "bank_name": admin.bank_name,
        "account_holder_name": admin.account_holder_name,
        "account_number": admin.account_number,
        "ifsc_code": admin.ifsc_code,
        "branch_name": admin.branch_name,
        "qr_code": admin.qr_code,
    })


# ═══════════════════════════════════════════════════════════════
#  RESIDENT VERIFICATION (Admin-controlled onboarding)
# ═══════════════════════════════════════════════════════════════

# ─── List Pending (Unverified) Residents ─────────────────────
@admin_bp.route("/api/admin/pending-residents", methods=["GET"])
@login_required
def pending_residents():
    """Return all unverified residents for the admin's apartment."""
    err = _require_admin()
    if err:
        return err

    residents = Resident.query.filter_by(
        apartment_name=current_user.apartment_name,
        is_verified=False,
        is_active=True,
    ).order_by(Resident.created_at.desc()).all()

    return jsonify([r.to_dict() for r in residents])


# ─── Verify a Resident ───────────────────────────────────────
@admin_bp.route("/api/admin/verify-resident/<int:resident_id>", methods=["PUT"])
@login_required
def verify_resident(resident_id):
    """Set is_verified = True so the resident can log in."""
    err = _require_admin()
    if err:
        return err

    resident = Resident.query.filter_by(
        id=resident_id,
        apartment_name=current_user.apartment_name,
    ).first()

    if not resident:
        return jsonify({"error": "Resident not found"}), 404

    resident.is_verified = True
    db.session.commit()

    return jsonify({"message": f"{resident.name} has been verified successfully"})


# ─── Reject (Delete) an Unverified Resident ──────────────────
@admin_bp.route("/api/admin/reject-resident/<int:resident_id>", methods=["DELETE"])
@login_required
def reject_resident(resident_id):
    """Remove an unverified resident's registration."""
    err = _require_admin()
    if err:
        return err

    resident = Resident.query.filter_by(
        id=resident_id,
        apartment_name=current_user.apartment_name,
        is_verified=False,
    ).first()

    if not resident:
        return jsonify({"error": "Resident not found or already verified"}), 404

    db.session.delete(resident)
    db.session.commit()

    return jsonify({"message": f"{resident.name}'s registration has been rejected"})


# ─── List Verified (Active) Residents ────────────────────────
@admin_bp.route("/api/admin/verified-residents", methods=["GET"])
@login_required
def verified_residents():
    """Return all verified & active residents for the admin's apartment."""
    err = _require_admin()
    if err:
        return err

    residents = Resident.query.filter_by(
        apartment_name=current_user.apartment_name,
        is_verified=True,
        is_active=True,
    ).order_by(Resident.created_at.desc()).all()

    return jsonify([r.to_dict() for r in residents])


# ─── Soft-Delete a Verified Resident ─────────────────────────
@admin_bp.route("/api/admin/soft-delete-resident/<int:resident_id>", methods=["PUT"])
@login_required
def soft_delete_resident(resident_id):
    """
    Soft-delete a verified resident by setting is_active = False.
    The record is preserved for analytics, bills, and payment history.
    """
    err = _require_admin()
    if err:
        return err

    resident = Resident.query.filter_by(
        id=resident_id,
        apartment_name=current_user.apartment_name,
        is_active=True,
    ).first()

    if not resident:
        return jsonify({"error": "Resident not found or already removed"}), 404

    resident.is_active = False
    db.session.commit()

    return jsonify({"message": f"{resident.name}'s account has been deactivated"})


# ─── Get Specific Resident Details ────────────────────────────
@admin_bp.route("/api/admin/resident/<int:resident_id>", methods=["GET"])
@login_required
def get_resident_details(resident_id):
    err = _require_admin()
    if err:
        return err

    resident = Resident.query.filter_by(
        id=resident_id,
        apartment_name=current_user.apartment_name
    ).first()

    if not resident:
        return jsonify({"error": "Resident not found"}), 404

    return jsonify(resident.to_dict())


# ─── Update Resident Split Number ─────────────────────────────
@admin_bp.route("/api/admin/resident-split/<int:resident_id>", methods=["PUT"])
@login_required
def update_resident_split(resident_id):
    err = _require_admin()
    if err:
        return err

    data = request.get_json()
    split_val = data.get("split_number")
    if split_val is None:
        return jsonify({"error": "split_number is required"}), 400

    try:
        split_val = float(split_val)
    except ValueError:
        return jsonify({"error": "Invalid split number format"}), 400

    allowed_splits = {1.0, 1.5, 2.0, 2.25, 0.75}
    if split_val not in allowed_splits:
        return jsonify({"error": f"Invalid split value. Must be one of: [1, 1.5, 2, 2.25, 0.75]"}), 400

    resident = Resident.query.filter_by(
        id=resident_id,
        apartment_name=current_user.apartment_name
    ).first()

    if not resident:
        return jsonify({"error": "Resident not found"}), 404

    resident.split_number = split_val
    db.session.commit()

    return jsonify({
        "message": "Split number updated successfully",
        "resident": resident.to_dict()
    })

