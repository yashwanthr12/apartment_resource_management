"""
routes/expense.py
-----------------
Expense management routes:
  - Add a new expense (admin only)
  - List expenses for the admin's apartment
  - Calculate split amount
  - Save grouped expenditure (multi-category)
  - List expenditures
  - Get expenditure details
"""

from datetime import datetime
from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from models import db
from models.expense import Expense
from models.expenditure import Expenditure
from models.admin import Admin

expense_bp = Blueprint("expense", __name__)


def _require_admin():
    # Primary check: session role
    if session.get("role") == "admin":
        return None
    # Fallback: check if current_user is an Admin instance (session role may have been lost)
    if isinstance(current_user, Admin):
        session["role"] = "admin"  # Re-set the lost session role
        return None
    return jsonify({"error": "Admin access required"}), 403


# ─── Add Expense ──────────────────────────────────────────────
@expense_bp.route("/api/expenses", methods=["POST"])
@login_required
def add_expense():
    """
    Create a new expense for the admin's apartment.
    Expected JSON: {
        from_date, to_date, category,
        custom_category (optional), amount,
        units_used (optional), unit_type (optional),
        total_houses
    }
    """
    err = _require_admin()
    if err:
        return err

    data = request.get_json() or {}

    required = ["from_date", "to_date", "category", "amount", "total_houses"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    # Validate amount > 0 to prevent negative billing exploits
    try:
        amount = float(data["amount"])
        if amount <= 0:
            return jsonify({"error": "Amount must be a positive number"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Amount must be a valid number"}), 400

    # Validate total_houses > 0
    total_houses = int(data["total_houses"])
    if total_houses <= 0:
        return jsonify({"error": "total_houses must be > 0"}), 400

    try:
        from_date = datetime.strptime(data["from_date"], "%Y-%m-%d").date()
        to_date = datetime.strptime(data["to_date"], "%Y-%m-%d").date()
    except (ValueError, KeyError, TypeError):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    import datetime as dt
    today = dt.date.today()
    if from_date > today or to_date > today:
        return jsonify({"error": "Billing dates cannot be in the future"}), 400

    expense = Expense(
        apartment_name=current_user.apartment_name,
        from_date=from_date,
        to_date=to_date,
        category=data["category"],
        custom_category=data.get("custom_category"),
        amount=float(data["amount"]),
        units_used=float(data["units_used"]) if data.get("units_used") else None,
        unit_type=data.get("unit_type"),
        total_houses=total_houses,
    )

    db.session.add(expense)
    db.session.commit()

    return jsonify({
        "message": "Expense added",
        "expense": expense.to_dict(),
    }), 201


# ─── List Expenses ────────────────────────────────────────────
@expense_bp.route("/api/expenses", methods=["GET"])
@login_required
def list_expenses():
    err = _require_admin()
    if err:
        return err

    expenses = (
        Expense.query
        .filter_by(apartment_name=current_user.apartment_name)
        .order_by(Expense.created_at.desc())
        .all()
    )
    return jsonify([e.to_dict() for e in expenses])


# ─── Calculate Split (preview, no save) ──────────────────────
@expense_bp.route("/api/expenses/calculate-split", methods=["POST"])
@login_required
def calculate_split():
    """
    Quick calculation endpoint:
    { amount, total_houses } → { split_amount }
    """
    data = request.get_json()
    amount = float(data.get("amount", 0))
    total_houses = int(data.get("total_houses", 1))
    if total_houses <= 0:
        return jsonify({"error": "total_houses must be > 0"}), 400

    return jsonify({"split_amount": round(amount / total_houses, 2)})


# ═══════════════════════════════════════════════════════════════
#  GROUPED EXPENDITURE ENDPOINTS
# ═══════════════════════════════════════════════════════════════

# ─── Save Expenditure (multi-category batch) ─────────────────
@expense_bp.route("/api/expenditures", methods=["POST"])
@login_required
def save_expenditure():
    """
    Save a grouped expenditure with multiple category items.
    Expected JSON: {
        from_date, to_date,
        total_houses,
        categories: [
            { category, custom_category?, amount, units_used?, unit_type? },
            ...
        ]
    }
    """
    err = _require_admin()
    if err:
        return err

    data = request.get_json()

    # Validate required fields
    for field in ["from_date", "to_date", "total_houses", "categories"]:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    categories = data["categories"]
    if not isinstance(categories, list) or len(categories) == 0:
        return jsonify({"error": "At least one category is required"}), 400

    # Validate all category amounts are positive numbers to prevent negative billing exploits
    for c in categories:
        try:
            amt = float(c.get("amount", 0))
            if amt <= 0:
                return jsonify({"error": "All category amounts must be positive numbers"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "All category amounts must be valid numbers"}), 400

    total_houses = int(data["total_houses"])
    if total_houses <= 0:
        return jsonify({"error": "total_houses must be > 0"}), 400

    from_date = datetime.strptime(data["from_date"], "%Y-%m-%d").date()
    to_date = datetime.strptime(data["to_date"], "%Y-%m-%d").date()

    import datetime as dt
    today = dt.date.today()
    if from_date > today or to_date > today:
        return jsonify({"error": "Billing dates cannot be in the future"}), 400

    # Calculate total amount from all categories
    total_amount = sum(float(c.get("amount", 0)) for c in categories)
    per_person_amount = round(total_amount / total_houses, 2)

    # Create the Expenditure record
    expenditure = Expenditure(
        apartment_name=current_user.apartment_name,
        from_date=from_date,
        to_date=to_date,
        total_amount=total_amount,
        total_houses=total_houses,
        per_person_amount=per_person_amount,
    )
    db.session.add(expenditure)
    db.session.flush()  # Get the expenditure ID

    # Create individual Expense records linked to this expenditure
    for c in categories:
        if not c.get("category") or not c.get("amount"):
            continue

        expense = Expense(
            apartment_name=current_user.apartment_name,
            from_date=from_date,
            to_date=to_date,
            category=c["category"],
            custom_category=c.get("custom_category"),
            amount=float(c["amount"]),
            units_used=float(c["units_used"]) if c.get("units_used") else None,
            unit_type=c.get("unit_type"),
            total_houses=total_houses,
            expenditure_id=expenditure.id,
        )
        db.session.add(expense)

    db.session.commit()

    return jsonify({
        "message": "Expenditure saved successfully",
        "expenditure": expenditure.to_dict(),
    }), 201


# ─── List Expenditures ───────────────────────────────────────
@expense_bp.route("/api/expenditures", methods=["GET"])
@login_required
def list_expenditures():
    """List all grouped expenditures for the admin's apartment."""
    err = _require_admin()
    if err:
        return err

    expenditures = (
        Expenditure.query
        .filter_by(apartment_name=current_user.apartment_name)
        .order_by(Expenditure.created_at.desc())
        .all()
    )
    from models.bill import Bill
    from models.expense import Expense

    result = []
    for e in expenditures:
        d = e.to_dict()
        d["bill_sent"] = (
            Bill.query
            .join(Expense)
            .filter(Expense.expenditure_id == e.id)
            .first() is not None
        )
        result.append(d)

    return jsonify(result)


# ─── Get Single Expenditure ──────────────────────────────────
@expense_bp.route("/api/expenditures/<int:expenditure_id>", methods=["GET"])
@login_required
def get_expenditure(expenditure_id):
    """Get a single expenditure with all its category details."""
    expenditure = Expenditure.query.get(expenditure_id)
    if not expenditure:
        return jsonify({"error": "Expenditure not found"}), 404
    if expenditure.apartment_name != current_user.apartment_name:
        return jsonify({"error": "Unauthorized"}), 403

    from models.bill import Bill
    from models.expense import Expense
    d = expenditure.to_dict()
    d["bill_sent"] = (
        Bill.query
        .join(Expense)
        .filter(Expense.expenditure_id == expenditure_id)
        .first() is not None
    )

    return jsonify(d)


# ─── Update Grouped Expenditure (PUT) ────────────────────────
@expense_bp.route("/api/expenditures/<int:expenditure_id>", methods=["PUT"])
@login_required
def update_expenditure(expenditure_id):
    """
    Update an existing grouped expenditure and its category items.
    Prevents duplication by deleting old linked Expense records,
    re-creating them, and updating the split_amount in generated Bills.
    """
    err = _require_admin()
    if err:
        return err

    expenditure = Expenditure.query.get(expenditure_id)
    if not expenditure:
        return jsonify({"error": "Expenditure not found"}), 404
    if expenditure.apartment_name != current_user.apartment_name:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()

    # Validate required fields
    for field in ["from_date", "to_date", "total_houses", "categories"]:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    categories = data["categories"]
    if not isinstance(categories, list) or len(categories) == 0:
        return jsonify({"error": "At least one category is required"}), 400

    # Validate all category amounts are positive numbers to prevent negative billing exploits
    for c in categories:
        try:
            amt = float(c.get("amount", 0))
            if amt <= 0:
                return jsonify({"error": "All category amounts must be positive numbers"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "All category amounts must be valid numbers"}), 400

    total_houses = int(data["total_houses"])
    if total_houses <= 0:
        return jsonify({"error": "total_houses must be > 0"}), 400

    from_date = datetime.strptime(data["from_date"], "%Y-%m-%d").date()
    to_date = datetime.strptime(data["to_date"], "%Y-%m-%d").date()

    import datetime as dt
    today = dt.date.today()
    if from_date > today or to_date > today:
        return jsonify({"error": "Billing dates cannot be in the future"}), 400

    # Calculate total amount and per person split
    total_amount = sum(float(c.get("amount", 0)) for c in categories)
    per_person_amount = round(total_amount / total_houses, 2)

    try:
        # Update Expenditure record
        expenditure.from_date = from_date
        expenditure.to_date = to_date
        expenditure.total_amount = total_amount
        expenditure.total_houses = total_houses
        expenditure.per_person_amount = per_person_amount

        # Delete existing Expense records linked to this expenditure to avoid duplicates
        Expense.query.filter_by(expenditure_id=expenditure_id).delete()

        # Create new Expense records linked to this expenditure
        for c in categories:
            if not c.get("category") or not c.get("amount"):
                continue

            expense = Expense(
                apartment_name=current_user.apartment_name,
                from_date=from_date,
                to_date=to_date,
                category=c["category"],
                custom_category=c.get("custom_category"),
                amount=float(c["amount"]),
                units_used=float(c["units_used"]) if c.get("units_used") else None,
                unit_type=c.get("unit_type"),
                total_houses=total_houses,
                expenditure_id=expenditure.id,
            )
            db.session.add(expense)

        # Update the split_amount in any generated Bills for this expenditure
        from models.bill import Bill
        bills = Bill.query.join(Expense).filter(Expense.expenditure_id == expenditure_id).all()
        for b in bills:
            b.split_amount = per_person_amount

        db.session.commit()
        return jsonify({
            "message": "Expenditure updated successfully",
            "expenditure": expenditure.to_dict(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update expenditure: {str(e)}"}), 500
