"""
routes/bill.py
--------------
Bill generation and listing routes.
"""

from datetime import datetime
from sqlalchemy import extract
from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from models import db
from models.expense import Expense
from models.expenditure import Expenditure
from models.bill import Bill
from models.payment import Payment
from models.resident import Resident
from models.admin import Admin
from routes.email_service import send_bill_email, send_batch_bill_emails

bill_bp = Blueprint("bill", __name__)


def _require_admin():
    # Primary check: session role
    if session.get("role") == "admin":
        return None
    # Fallback: check if current_user is an Admin instance (session role may have been lost)
    if isinstance(current_user, Admin):
        session["role"] = "admin"  # Re-set the lost session role
        return None
    return jsonify({"error": "Admin access required"}), 403


@bill_bp.route("/api/bills/generate", methods=["POST"])
@login_required
def generate_bills():
    """
    Generate bills for selected residents based on expense data.
    This function calculates split amount and stores bill records.

    Expected JSON: { expense_id: int, resident_ids: [int, ...] }

    Logic:
      1. Fetch the expense record.
      2. split_amount = expense.amount / expense.total_houses
      3. For each resident:
         a. Create Bill record
         b. Create Payment record (pending)
      4. Send batch email notification to all residents at once.
      5. Return generated bills.
    """
    err = _require_admin()
    if err:
        return err

    data = request.get_json()
    expense_id = data.get("expense_id")
    resident_ids = data.get("resident_ids", [])

    if not expense_id:
        return jsonify({"error": "'expense_id' is required"}), 400
    if not resident_ids:
        return jsonify({"error": "Select at least one resident"}), 400

    # Step 1: Fetch expense
    expense = Expense.query.get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404
    if expense.apartment_name != current_user.apartment_name:
        return jsonify({"error": "Unauthorized"}), 403

    # Step 2: Calculate split base amount
    base_split = float(expense.amount) / expense.total_houses

    # Step 3: Create bills + payments (collect residents for batch email)
    admin = Admin.query.get(current_user.id)
    created_bills = []
    residents_bills = []  # list of (Resident, Bill) for batch email

    for rid in resident_ids:
        resident = Resident.query.get(rid)
        if not resident or resident.apartment_name != current_user.apartment_name:
            continue

        # Skip if already billed
        if Bill.query.filter_by(resident_id=rid, expense_id=expense_id).first():
            continue

        # Proportional to resident Contribution Factor (split_number, default 1.0)
        split_amount = round(base_split * (resident.split_number if resident.split_number else 1.0), 2)
        bill = Bill(resident_id=rid, expense_id=expense_id, split_amount=split_amount)
        db.session.add(bill)
        db.session.flush()

        payment = Payment(resident_id=rid, bill_id=bill.id, status="pending", verified=False)
        db.session.add(payment)
        created_bills.append(bill)
        residents_bills.append((resident, bill))

    db.session.commit()

    # Step 4: Send batch email to ALL residents at once
    email_results = send_batch_bill_emails(residents_bills, admin, expense)

    return jsonify({
        "message": f"{len(created_bills)} bill(s) generated",
        "bills": [b.to_dict() for b in created_bills],
        "emails": email_results,
    }), 201


# ═══════════════════════════════════════════════════════════════
#  EXPENDITURE-BASED BILL GENERATION
# ═══════════════════════════════════════════════════════════════

@bill_bp.route("/api/bills/generate-from-expenditure", methods=["POST"])
@login_required
def generate_bills_from_expenditure():
    """
    Generate ONE bill per resident for a grouped expenditure.
    The bill split_amount = expenditure.per_person_amount (total split).
    Linked to the first expense in the expenditure to satisfy the FK.

    Expected JSON: { expenditure_id: int, resident_ids: [int, ...] }
    """
    err = _require_admin()
    if err:
        return err

    data = request.get_json()
    expenditure_id = data.get("expenditure_id")
    resident_ids = data.get("resident_ids", [])

    if not expenditure_id:
        return jsonify({"error": "'expenditure_id' is required"}), 400
    if not resident_ids:
        return jsonify({"error": "Select at least one resident"}), 400

    # Step 1: Fetch expenditure
    expenditure = Expenditure.query.get(expenditure_id)
    if not expenditure:
        return jsonify({"error": "Expenditure not found"}), 404
    if expenditure.apartment_name != current_user.apartment_name:
        return jsonify({"error": "Unauthorized"}), 403

    # Get all expense items for this expenditure
    expenses = Expense.query.filter_by(expenditure_id=expenditure_id).all()
    if not expenses:
        return jsonify({"error": "No expense items found for this expenditure"}), 404

    per_person_amount = float(expenditure.per_person_amount)
    # Use first expense as the FK anchor for this bill
    anchor_expense = expenses[0]

    # Step 2: Create ONE bill + payment per resident
    admin = Admin.query.get(current_user.id)
    created_bills = []
    residents_bills = []

    for rid in resident_ids:
        resident = Resident.query.get(rid)
        if not resident or resident.apartment_name != current_user.apartment_name:
            continue

        # Skip if resident already has a bill for any expense in this expenditure
        already_billed = (
            Bill.query
            .join(Expense)
            .filter(
                Bill.resident_id == rid,
                Expense.expenditure_id == expenditure_id,
            )
            .first()
        )
        if already_billed:
            continue

        # Create ONE bill linked to the anchor expense scaled by Contribution Factor (split_number)
        split_amount = round(per_person_amount * (resident.split_number if resident.split_number else 1.0), 2)
        bill = Bill(
            resident_id=rid,
            expense_id=anchor_expense.id,
            split_amount=split_amount,
        )
        db.session.add(bill)
        db.session.flush()

        payment = Payment(
            resident_id=rid, bill_id=bill.id,
            status="pending", verified=False,
        )
        db.session.add(payment)
        created_bills.append(bill)
        residents_bills.append((resident, bill))

    db.session.commit()

    # Step 3: Send batch email (use anchor expense as reference)
    email_results = []
    if residents_bills:
        email_results = send_batch_bill_emails(residents_bills, admin, anchor_expense)

    return jsonify({
        "message": f"{len(created_bills)} bill(s) generated from expenditure",
        "bills": [b.to_dict() for b in created_bills],
        "emails": email_results,
    }), 201


@bill_bp.route("/api/bills", methods=["GET"])
@login_required
def list_bills():
    """List bills — admin sees all for apartment, resident sees own."""
    role = session.get("role")

    if role == "admin":
        bills = (
            Bill.query.join(Expense)
            .filter(Expense.apartment_name == current_user.apartment_name)
            .order_by(Bill.created_at.desc()).all()
        )
    else:
        bills = Bill.query.filter_by(resident_id=current_user.id).order_by(Bill.created_at.desc()).all()

    result = []
    for bill in bills:
        d = bill.to_dict()
        p = Payment.query.filter_by(bill_id=bill.id).first()
        d["payment_status"] = p.status if p else "no_payment"
        d["payment_verified"] = p.verified if p else False
        d["payment_id"] = p.id if p else None
        d["receipt_image"] = p.receipt_image if p else None

        # Add expenditure info if linked
        if bill.expense and bill.expense.expenditure_id:
            expenditure = Expenditure.query.get(bill.expense.expenditure_id)
            if expenditure:
                d["expenditure_id"] = expenditure.id
                d["expenditure_total"] = float(expenditure.total_amount)
                d["expenditure_per_person"] = float(expenditure.per_person_amount)
                d["expenditure_categories"] = expenditure.to_dict()["categories"]

        result.append(d)

    return jsonify(result)


# ═══════════════════════════════════════════════════════════════
#  RESIDENT DASHBOARD FILTER ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@bill_bp.route("/api/bills/filter-years", methods=["GET"])
@login_required
def get_filter_years():
    """
    Return a list of unique years extracted from the from_date of
    expenses linked to this resident's bills.
    Resident-only endpoint.
    """
    bills = (
        Bill.query.join(Expense)
        .filter(Bill.resident_id == current_user.id)
        .all()
    )

    years = set()
    for bill in bills:
        if bill.expense and bill.expense.from_date:
            years.add(bill.expense.from_date.year)

    return jsonify(sorted(years, reverse=True))


@bill_bp.route("/api/bills/filter-ranges", methods=["GET"])
@login_required
def get_filter_ranges():
    """
    For a given year, return all unique "from_date – to_date" ranges
    from the resident's bills.

    Query params:
      year (int) — the selected year

    Returns:
      [ { id, from_date, to_date, label }, ... ]
    """
    year = request.args.get("year", type=int)
    if not year:
        return jsonify([]), 400

    bills = (
        Bill.query.join(Expense)
        .filter(
            Bill.resident_id == current_user.id,
            extract("year", Expense.from_date) == year,
        )
        .all()
    )

    # Collect unique (from_date, to_date) pairs
    seen = {}
    for bill in bills:
        if bill.expense:
            key = (bill.expense.from_date.isoformat(), bill.expense.to_date.isoformat())
            if key not in seen:
                # Use expenditure_id if available, else expense_id as range identifier
                range_id = bill.expense.expenditure_id or bill.expense.id
                seen[key] = {
                    "range_id": range_id,
                    "from_date": bill.expense.from_date.isoformat(),
                    "to_date": bill.expense.to_date.isoformat(),
                    "is_expenditure": bill.expense.expenditure_id is not None,
                }

    return jsonify(list(seen.values()))


@bill_bp.route("/api/bills/filtered", methods=["GET"])
@login_required
def get_filtered_bills():
    """
    Return bills for the current resident filtered by year and
    date range (from_date + to_date).

    Query params:
      year      (int)  — selected year
      from_date (str)  — ISO date string e.g. 2025-01-01
      to_date   (str)  — ISO date string e.g. 2025-02-01
    """
    year = request.args.get("year", type=int)
    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")

    if not year or not from_date_str or not to_date_str:
        return jsonify({"error": "year, from_date, and to_date are required"}), 400

    try:
        from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
        to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    bills = (
        Bill.query.join(Expense)
        .filter(
            Bill.resident_id == current_user.id,
            Expense.from_date == from_date,
            Expense.to_date == to_date,
        )
        .order_by(Bill.created_at.desc())
        .all()
    )

    result = []
    for bill in bills:
        d = bill.to_dict()
        p = Payment.query.filter_by(bill_id=bill.id).first()
        d["payment_status"] = p.status if p else "no_payment"
        d["payment_verified"] = p.verified if p else False
        d["payment_id"] = p.id if p else None
        d["receipt_image"] = p.receipt_image if p else None

        if bill.expense and bill.expense.expenditure_id:
            expenditure = Expenditure.query.get(bill.expense.expenditure_id)
            if expenditure:
                d["expenditure_id"] = expenditure.id
                d["expenditure_total"] = float(expenditure.total_amount)
                d["expenditure_per_person"] = float(expenditure.per_person_amount)
                d["expenditure_categories"] = expenditure.to_dict()["categories"]

        result.append(d)

    return jsonify(result)
