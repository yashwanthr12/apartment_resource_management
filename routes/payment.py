"""
routes/payment.py
-----------------
Payment management routes:
  - Resident uploads receipt
  - Admin views and verifies payments
"""

import os
import io
from flask import Blueprint, request, jsonify, session, current_app, send_file
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from models import db
from models.payment import Payment
from models.bill import Bill
from models.expense import Expense
from models.expenditure import Expenditure
from models.admin import Admin
from models.resident import Resident

payment_bp = Blueprint("payment", __name__)


def _require_admin():
    """Return an error response if the current user is not an admin."""
    if session.get("role") == "admin":
        return None
    if isinstance(current_user, Admin):
        session["role"] = "admin"
        return None
    return jsonify({"error": "Admin access required"}), 403

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ─── Upload Receipt (Resident) ───────────────────────────────
@payment_bp.route("/api/payments/upload", methods=["POST"])
@login_required
def upload_receipt():
    if session.get("role") != "resident":
        return jsonify({"error": "Resident access required"}), 403

    bill_id = request.form.get("bill_id")
    if not bill_id:
        return jsonify({"error": "'bill_id' is required"}), 400

    file = request.files.get("receipt")
    if not file or not file.filename:
        return jsonify({"error": "Receipt file is required"}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    payment = Payment.query.filter_by(
        bill_id=int(bill_id), resident_id=current_user.id
    ).first()
    if not payment:
        return jsonify({"error": "Payment record not found"}), 404

    filename = secure_filename(f"receipt_{payment.id}_{file.filename}")
    upload_dir = os.path.join(current_app.root_path, current_app.config["UPLOAD_FOLDER"])
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    payment.receipt_image = f"{current_app.config['UPLOAD_FOLDER']}/{filename}"
    payment.status = "paid"
    db.session.commit()

    return jsonify({"message": "Receipt uploaded", "payment": payment.to_dict()})


# ─── List Payments for Verification (Admin) ──────────────────────────────
@payment_bp.route("/api/payments", methods=["GET"])
@login_required
def list_payments():
    err = _require_admin()
    if err:
        return err

    # Optional filter: ?expenditure_id=<id>
    expenditure_id_filter = request.args.get("expenditure_id", type=int)

    from models.expenditure import Expenditure

    query = (
        Payment.query
        .join(Bill).join(Expense)
        .filter(Expense.apartment_name == current_user.apartment_name)
        .order_by(Payment.updated_at.desc())
    )

    if expenditure_id_filter:
        query = query.filter(Expense.expenditure_id == expenditure_id_filter)

    payments = query.all()

    result = []
    for p in payments:
        d = p.to_dict()
        # Enrich with expenditure date range and total amount
        if p.bill and p.bill.expense and p.bill.expense.expenditure_id:
            exp = Expenditure.query.get(p.bill.expense.expenditure_id)
            if exp:
                d["expenditure_id"] = exp.id
                d["from_date"] = exp.from_date.isoformat()
                d["to_date"] = exp.to_date.isoformat()
                # Override split_amount with the per-person total for the full expenditure
                d["split_amount"] = float(exp.per_person_amount)
        else:
            # Standalone expense — use expense dates
            if p.bill and p.bill.expense:
                d["from_date"] = p.bill.expense.from_date.isoformat()
                d["to_date"] = p.bill.expense.to_date.isoformat()

        result.append(d)

    return jsonify(result)


# ─── Verify / Reject Payment (Admin) ─────────────────────────
@payment_bp.route("/api/payments/<int:payment_id>/verify", methods=["PUT"])
@login_required
def verify_payment(payment_id):
    err = _require_admin()
    if err:
        return err

    data = request.get_json()
    action = data.get("action")  # "approve" or "reject"

    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    bill = Bill.query.get(payment.bill_id)
    expense = Expense.query.get(bill.expense_id) if bill else None
    if not expense or expense.apartment_name != current_user.apartment_name:
        return jsonify({"error": "Unauthorized"}), 403

    if action == "approve":
        payment.status = "paid"
        payment.verified = True
    elif action == "reject":
        payment.status = "rejected"
        payment.verified = False
    else:
        return jsonify({"error": "action must be 'approve' or 'reject'"}), 400

    db.session.commit()
    return jsonify({"message": f"Payment {action}d", "payment": payment.to_dict()})


# ─── Download Verified Receipt (Resident/Admin) ─────────────────────────
@payment_bp.route("/api/payments/<int:payment_id>/receipt", methods=["GET"])
@login_required
def download_receipt(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404

    if not payment.verified:
        return jsonify({"error": "Payment is not verified"}), 400

    role = session.get("role")
    if role == "resident" and payment.resident_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    bill = Bill.query.get(payment.bill_id)
    resident = Resident.query.get(payment.resident_id)
    expense = Expense.query.get(bill.expense_id)
    
    if role == "admin" and expense.apartment_name != current_user.apartment_name:
        return jsonify({"error": "Unauthorized"}), 403

    # Query Admin for additional apartment details (address and name)
    admin = Admin.query.filter_by(apartment_name=expense.apartment_name).first()
    admin_name = admin.name if admin else "Apartment Administrator"
    apartment_address = admin.apartment_address if admin else "Apartment Address"

    # Font Setup for Indian Rupee Symbol support on Windows
    try:
        font_path = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', 'arial.ttf')
        font_bold_path = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', 'arialbd.ttf')
        if os.path.exists(font_path) and os.path.exists(font_bold_path):
            pdfmetrics.registerFont(TTFont('Arial', font_path))
            pdfmetrics.registerFont(TTFont('Arial-Bold', font_bold_path))
            FONT_FAMILY = 'Arial'
            FONT_FAMILY_BOLD = 'Arial-Bold'
        else:
            FONT_FAMILY = 'Helvetica'
            FONT_FAMILY_BOLD = 'Helvetica-Bold'
    except Exception:
        FONT_FAMILY = 'Helvetica'
        FONT_FAMILY_BOLD = 'Helvetica-Bold'

    RUPEE_SYMBOL = "₹" if FONT_FAMILY == 'Arial' else "Rs. "

    # Gather data
    apartment_name = expense.apartment_name
    from_date = expense.from_date.strftime("%d %b %Y")
    to_date = expense.to_date.strftime("%d %b %Y")
    total_original_amount = 0
    total_houses = expense.total_houses
    split_amount = float(bill.split_amount)
    contribution_factor = resident.split_number

    items = []
    if expense.expenditure_id:
        expenditure = Expenditure.query.get(expense.expenditure_id)
        if expenditure:
            total_houses = expenditure.total_houses
            from_date = expenditure.from_date.strftime("%d %b %Y")
            to_date = expenditure.to_date.strftime("%d %b %Y")
            total_original_amount = float(expenditure.total_amount)
            for e in expenditure.items:
                cat_name = e.custom_category if (e.category == "other" and e.custom_category) else e.category.capitalize()
                amt = float(e.amount)
                items.append([cat_name, f"{RUPEE_SYMBOL}{amt:,.2f}"])
    else:
        cat_name = expense.custom_category if (expense.category == "other" and expense.custom_category) else expense.category.capitalize()
        total_original_amount = float(expense.amount)
        items.append([cat_name, f"{RUPEE_SYMBOL}{total_original_amount:,.2f}"])

    items.append(["Total Expenditure Amount", f"{RUPEE_SYMBOL}{total_original_amount:,.2f}"])

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    styles.add(ParagraphStyle(
        name='ReceiptHeaderTitle',
        fontName=FONT_FAMILY_BOLD,
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#4f46e5"), # Primary brand color
        alignment=1, # Center
        spaceAfter=4
    ))
    
    styles.add(ParagraphStyle(
        name='ReceiptHeaderTagline',
        fontName=FONT_FAMILY,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"), # Slate muted
        alignment=1, # Center
        spaceAfter=12
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName=FONT_FAMILY_BOLD,
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#4f46e5"), # Accent color for section titles
        spaceBefore=14,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='ReceiptLabel',
        fontName=FONT_FAMILY_BOLD,
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#475569") # Subtle Slate
    ))
    
    styles.add(ParagraphStyle(
        name='ReceiptValue',
        fontName=FONT_FAMILY,
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1e293b")
    ))

    styles.add(ParagraphStyle(
        name='ReceiptValueBold',
        fontName=FONT_FAMILY_BOLD,
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#1e293b")
    ))
    
    styles.add(ParagraphStyle(
        name='TableHead',
        fontName=FONT_FAMILY_BOLD,
        fontSize=9.5,
        leading=13,
        textColor=colors.white
    ))

    styles.add(ParagraphStyle(
        name='TableText',
        fontName=FONT_FAMILY,
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1e293b")
    ))

    styles.add(ParagraphStyle(
        name='TableTextBold',
        fontName=FONT_FAMILY_BOLD,
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1e293b")
    ))

    styles.add(ParagraphStyle(
        name='TableTextRight',
        fontName=FONT_FAMILY,
        fontSize=9.5,
        leading=13,
        alignment=2, # Right
        textColor=colors.HexColor("#1e293b")
    ))

    styles.add(ParagraphStyle(
        name='TableTextRightBold',
        fontName=FONT_FAMILY_BOLD,
        fontSize=9.5,
        leading=13,
        alignment=2, # Right
        textColor=colors.HexColor("#1e293b")
    ))

    styles.add(ParagraphStyle(
        name='VerifiedBadge',
        fontName=FONT_FAMILY_BOLD,
        fontSize=12,
        leading=15,
        alignment=1, # Center
        textColor=colors.HexColor("#16a34a"), # Success Green
    ))
    
    styles.add(ParagraphStyle(
        name='VerifiedTime',
        fontName=FONT_FAMILY,
        fontSize=9,
        leading=13,
        alignment=1, # Center
        textColor=colors.HexColor("#64748b"),
    ))

    styles.add(ParagraphStyle(
        name='ReceiptFooter',
        fontName=FONT_FAMILY,
        fontSize=9,
        leading=13,
        alignment=1, # Center
        textColor=colors.HexColor("#94a3b8"), # Muted slate
    ))

    Story = []

    # 1. Header Logo Badge Drawing (ReportLab Shapes)
    from reportlab.graphics.shapes import Drawing, Rect
    logo_drawing = Drawing(40, 40)
    logo_drawing.add(Rect(0, 0, 40, 40, rx=8, ry=8, fillColor=colors.HexColor("#4f46e5"), strokeColor=None))
    # Sleek vector apartment tower shapes inside badge
    logo_drawing.add(Rect(9, 9, 13, 22, rx=1, ry=1, fillColor=colors.white, strokeColor=None))
    logo_drawing.add(Rect(20, 14, 9, 17, rx=1, ry=1, fillColor=colors.HexColor("#e0e7ff"), strokeColor=None))
    logo_drawing.hAlign = 'CENTER'

    Story.append(logo_drawing)
    Story.append(Spacer(1, 6))
    Story.append(Paragraph("ApartEase", styles["ReceiptHeaderTitle"]))
    Story.append(Paragraph("Simple Living. Smart Billing.", styles["ReceiptHeaderTagline"]))
    Story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#e2e8f0"), spaceBefore=4, spaceAfter=14))
    
    # 2. Apartment Information Block
    Story.append(Paragraph("Apartment Information", styles["SectionHeading"]))
    apartment_info_data = [
        [Paragraph("Apartment Name:", styles["ReceiptLabel"]), Paragraph(apartment_name, styles["ReceiptValueBold"])],
        [Paragraph("Apartment Address:", styles["ReceiptLabel"]), Paragraph(apartment_address, styles["ReceiptValue"])],
        [Paragraph("Admin Name:", styles["ReceiptLabel"]), Paragraph(admin_name, styles["ReceiptValue"])],
    ]
    apartment_info_table = Table(apartment_info_data, colWidths=[140, 364])
    apartment_info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    Story.append(apartment_info_table)
    Story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#e2e8f0"), spaceBefore=10, spaceAfter=12))

    # 3. Receipt Information
    Story.append(Paragraph("Expense Bill Receipt", styles["SectionHeading"]))
    receipt_info_data = [
        [Paragraph("Resident Name:", styles["ReceiptLabel"]), Paragraph(resident.name, styles["ReceiptValueBold"])],
        [Paragraph("Flat Number:", styles["ReceiptLabel"]), Paragraph(resident.house_number, styles["ReceiptValue"])],
        [Paragraph("Billing Period:", styles["ReceiptLabel"]), Paragraph(f"{from_date} — {to_date}", styles["ReceiptValue"])],
    ]
    receipt_info_table = Table(receipt_info_data, colWidths=[140, 364])
    receipt_info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    Story.append(receipt_info_table)
    Story.append(Spacer(1, 14))

    # 4. Expenditure Details Table
    table_data = [[
        Paragraph("Expenditure Category", styles["TableHead"]),
        Paragraph("Original Amount", styles["TableHead"])
    ]]
    for item in items:
        is_total = item[0] == "Total Expenditure Amount"
        style_left = styles["TableTextBold"] if is_total else styles["TableText"]
        style_right = styles["TableTextRightBold"] if is_total else styles["TableTextRight"]
        
        table_data.append([
            Paragraph(item[0], style_left),
            Paragraph(item[1], style_right)
        ])
    
    exp_table = Table(table_data, colWidths=[354, 150])
    exp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f8fafc")),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.HexColor("#cbd5e1")),
    ]))
    Story.append(exp_table)
    Story.append(Spacer(1, 18))

    # 5. Highlighted Contribution Details Box
    box_data = [
        [
            Paragraph("Contribution Factor (Split Value):", styles["ReceiptLabel"]),
            Paragraph(f"<b>{contribution_factor:.1f}</b> (Total Households: {total_houses})", styles["ReceiptValue"])
        ],
        [
            Paragraph("Amount Paid:", styles["ReceiptLabel"]),
            Paragraph(f"<b>{RUPEE_SYMBOL}{split_amount:,.2f}</b>", ParagraphStyle(
                name='PaidText',
                parent=styles['TableTextRightBold'],
                fontSize=15,
                leading=18,
                textColor=colors.HexColor("#16a34a") # Clean green for amount paid
            ))
        ]
    ]
    box_table = Table(box_data, colWidths=[240, 244])
    box_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
    ]))
    Story.append(box_table)
    Story.append(Spacer(1, 18))

    # 6. Verification Section
    verification_date = payment.updated_at.strftime("%d %b %Y")
    verification_time = payment.updated_at.strftime("%I:%M %p")
    verified_data = [
        [Paragraph("<b>✓ Payment Verified</b>", styles["VerifiedBadge"])],
        [Paragraph(f"Verified on {verification_date} at {verification_time}", styles["VerifiedTime"])]
    ]
    verified_table = Table(verified_data, colWidths=[400])
    verified_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4")), # Soft light green
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#dcfce7")), # Soft green border
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    verified_table.hAlign = 'CENTER'
    Story.append(verified_table)

    # 7. Footer
    Story.append(Spacer(1, 24))
    Story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#e2e8f0"), spaceBefore=12, spaceAfter=12))
    Story.append(Paragraph("Thank you for your payment. We appreciate being a part of the ApartEase Community.", styles["ReceiptFooter"]))

    doc.build(Story)
    buffer.seek(0)
    
    filename = f"Receipt_{resident.name.replace(' ', '_')}_{expense.from_date.strftime('%b_%Y')}.pdf"
    
    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype='application/pdf'
    )
