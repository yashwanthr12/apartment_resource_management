"""
routes/analytics.py
-------------------
Analytics API endpoints for the admin dashboard:
  - Monthly category breakdown (pie chart data)
  - Month-over-month comparison (bar chart data)
  - Resource usage trends (line chart data)
  - Cost vs usage scatter data
"""

from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from sqlalchemy import func, extract
from datetime import datetime
from models import db
from models.expense import Expense
from models.admin import Admin
from models.expenditure import Expenditure

analytics_bp = Blueprint("analytics", __name__)


def _require_admin():
    """Return an error response if the current user is not an admin."""
    # Primary check: session role
    if session.get("role") == "admin":
        return None
    # Fallback: check if current_user is an Admin instance (session role may have been lost)
    if isinstance(current_user, Admin):
        session["role"] = "admin"  # Re-set the lost session role
        return None
    return jsonify({"error": "Admin access required"}), 403


# ─── 1. Monthly Category Breakdown (Pie Chart) ───────────────
@analytics_bp.route("/api/analytics/monthly", methods=["GET"])
@login_required
def monthly_breakdown():
    err = _require_admin()
    if err:
        return err

    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)
    apt = current_user.apartment_name

    query = (
        db.session.query(
            Expense.category,
            Expense.custom_category,
            func.sum(Expense.amount).label("total"),
        )
        .filter(Expense.apartment_name == apt)
    )

    expenditure_id = request.args.get("expenditure_id", type=int)
    if expenditure_id:
        query = query.filter(Expense.expenditure_id == expenditure_id)
    elif month and year:
        query = query.filter(
            extract("month", Expense.from_date) == month,
            extract("year", Expense.from_date) == year,
        )
    elif year:
        query = query.filter(extract("year", Expense.from_date) == year)

    results = query.group_by(Expense.category, Expense.custom_category).all()

    data = []
    for cat, custom, total in results:
        label = custom if cat == "other" and custom else cat
        data.append({"category": label, "amount": float(total)})

    return jsonify(data)


# ─── 2. Summary Cards ────────────────────────────────────────
@analytics_bp.route("/api/analytics/summary", methods=["GET"])
@login_required
def summary():
    err = _require_admin()
    if err:
        return err

    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)
    apt = current_user.apartment_name

    query = Expense.query.filter(Expense.apartment_name == apt)

    expenditure_id = request.args.get("expenditure_id", type=int)
    if expenditure_id:
        query = query.filter(Expense.expenditure_id == expenditure_id)
    elif month and year:
        query = query.filter(
            extract("month", Expense.from_date) == month,
            extract("year", Expense.from_date) == year,
        )
    elif year:
        query = query.filter(extract("year", Expense.from_date) == year)

    expenses = query.all()
    if not expenses:
        return jsonify({"total": 0, "highest": None, "lowest": None, "count": 0})

    total = sum(float(e.amount) for e in expenses)
    by_cat = {}
    for e in expenses:
        label = e.custom_category if e.category == "other" and e.custom_category else e.category
        by_cat[label] = by_cat.get(label, 0) + float(e.amount)

    highest = max(by_cat, key=by_cat.get)
    lowest = min(by_cat, key=by_cat.get)

    return jsonify({
        "total": total,
        "highest": {"category": highest, "amount": by_cat[highest]},
        "lowest": {"category": lowest, "amount": by_cat[lowest]},
        "count": len(expenses),
    })


# ─── 3. Month-over-Month Comparison (Bar Chart) ──────────────
@analytics_bp.route("/api/analytics/comparison", methods=["GET"])
@login_required
def comparison():
    err = _require_admin()
    if err:
        return err

    apt = current_user.apartment_name
    results = (
        db.session.query(
            extract("year", Expense.from_date).label("yr"),
            extract("month", Expense.from_date).label("mn"),
            func.sum(Expense.amount).label("total"),
        )
        .filter(Expense.apartment_name == apt)
        .group_by("yr", "mn")
        .order_by("yr", "mn")
        .all()
    )

    data = []
    for yr, mn, total in results:
        data.append({
            "year": int(yr),
            "month": int(mn),
            "label": f"{int(yr)}-{int(mn):02d}",
            "total": float(total),
        })

    return jsonify(data)


# ─── 4. Resource Usage Trends (Line Chart) ───────────────────
@analytics_bp.route("/api/analytics/usage-trends", methods=["GET"])
@login_required
def usage_trends():
    err = _require_admin()
    if err:
        return err

    apt = current_user.apartment_name
    category = request.args.get("category", "electricity")

    results = (
        db.session.query(
            extract("year", Expense.from_date).label("yr"),
            extract("month", Expense.from_date).label("mn"),
            func.sum(Expense.units_used).label("units"),
            func.sum(Expense.amount).label("cost"),
        )
        .filter(
            Expense.apartment_name == apt,
            Expense.category == category,
            Expense.units_used.isnot(None),
        )
        .group_by("yr", "mn")
        .order_by("yr", "mn")
        .all()
    )

    data = []
    for yr, mn, units, cost in results:
        data.append({
            "label": f"{int(yr)}-{int(mn):02d}",
            "units": float(units) if units else 0,
            "cost": float(cost) if cost else 0,
        })

    return jsonify(data)


# ─── 5. Cost vs Usage (Scatter) ──────────────────────────────
@analytics_bp.route("/api/analytics/cost-vs-usage", methods=["GET"])
@login_required
def cost_vs_usage():
    err = _require_admin()
    if err:
        return err

    apt = current_user.apartment_name
    expenses = (
        Expense.query
        .filter(
            Expense.apartment_name == apt,
            Expense.units_used.isnot(None),
        )
        .order_by(Expense.from_date)
        .all()
    )

    data = []
    for e in expenses:
        label = e.custom_category if e.category == "other" and e.custom_category else e.category
        data.append({
            "category": label,
            "units": float(e.units_used),
            "amount": float(e.amount),
            "date": e.from_date.isoformat(),
        })

    return jsonify(data)


# ─── Available Months (for dropdown) ─────────────────────────
@analytics_bp.route("/api/analytics/months", methods=["GET"])
@login_required
def available_months():
    err = _require_admin()
    if err:
        return err

    apt = current_user.apartment_name
    results = (
        db.session.query(
            extract("year", Expense.from_date).label("yr"),
            extract("month", Expense.from_date).label("mn"),
        )
        .filter(Expense.apartment_name == apt)
        .distinct()
        .order_by("yr", "mn")
        .all()
    )

    months = [{"year": int(yr), "month": int(mn), "label": f"{int(yr)}-{int(mn):02d}"} for yr, mn in results]
    return jsonify(months)


# ─── Available Years (for year filter dropdown) ──────────────
@analytics_bp.route("/api/analytics/years", methods=["GET"])
@login_required
def available_years():
    err = _require_admin()
    if err:
        return err

    apt = current_user.apartment_name
    results = (
        db.session.query(
            extract("year", Expense.from_date).label("yr"),
        )
        .filter(Expense.apartment_name == apt)
        .distinct()
        .order_by(db.desc("yr"))
        .all()
    )

    years = [int(yr) for yr, in results]
    return jsonify(years)


# ─── Expenditure Dates for a Year (date filter dropdown) ─────
@analytics_bp.route("/api/analytics/expenditure-dates", methods=["GET"])
@login_required
def expenditure_dates():
    """Return expenditure date ranges for a given year."""
    err = _require_admin()
    if err:
        return err

    apt = current_user.apartment_name
    year = request.args.get("year", type=int)

    query = Expenditure.query.filter(Expenditure.apartment_name == apt)
    if year:
        query = query.filter(extract("year", Expenditure.from_date) == year)

    expenditures = query.order_by(Expenditure.from_date.desc()).all()

    dates = []
    for exp in expenditures:
        dates.append({
            "id": exp.id,
            "from_date": exp.from_date.isoformat(),
            "to_date": exp.to_date.isoformat(),
            "total_amount": float(exp.total_amount),
        })

    return jsonify(dates)
