"""
routes/email_service.py
-----------------------
Helper module for sending emails via Gmail SMTP.
If the API key is not configured, emails are silently skipped
(a warning is logged instead).
"""

import logging
import html
from flask import current_app
import smtplib
import ssl
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def send_bill_email(resident, bill, admin):
    """
    Send a bill notification email to a resident.

    Parameters
    ----------
    resident : Resident model instance
    bill     : Bill model instance (with .expense loaded)
    admin    : Admin model instance (apartment owner)
    """
    smtp_host = current_app.config.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = current_app.config.get("SMTP_PORT", 465)
    smtp_email = current_app.config.get("SMTP_EMAIL", "")
    smtp_password = current_app.config.get("SMTP_PASSWORD", "")

    if not smtp_email or not smtp_password:
        logger.warning(
            "SMTP credentials not configured — skipping email to %s", resident.email
        )
        return False

    try:
        # Build a simple HTML email body
        category = bill.expense.custom_category if bill.expense.category == "other" else bill.expense.category
        period = f"{bill.expense.from_date} → {bill.expense.to_date}"

        escaped_resident_name = html.escape(resident.name)
        escaped_apartment_name = html.escape(resident.apartment_name)
        escaped_category = html.escape(category)
        escaped_period = html.escape(period)
        escaped_house_number = html.escape(resident.house_number)
        escaped_upi_id = html.escape(admin.upi_id) if admin.upi_id else ""
        escaped_bank_details = html.escape(admin.bank_details) if admin.bank_details else ""

        html_body = f"""
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 28px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 22px;">🏠 Apartment Bill Notification</h1>
            </div>
            <div style="padding: 28px;">
                <p style="font-size: 16px;">Hello <strong>{escaped_resident_name}</strong>,</p>
                <p>A new bill has been generated for your apartment <strong>{escaped_apartment_name}</strong>.</p>
 
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 10px; font-weight: 600;">Category</td>
                        <td style="padding: 10px;">{escaped_category.title()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: 600;">Period</td>
                        <td style="padding: 10px;">{escaped_period}</td>
                    </tr>
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 10px; font-weight: 600;">House Number</td>
                        <td style="padding: 10px;">{escaped_house_number}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: 600;">Amount Due</td>
                        <td style="padding: 10px; color: #6366f1; font-size: 18px; font-weight: 700;">₹{float(bill.split_amount):,.2f}</td>
                    </tr>
                </table>
 
                <p><strong>Payment Instructions:</strong></p>
                <ul style="line-height: 1.8;">
                    {"<li>UPI ID: <code>" + escaped_upi_id + "</code></li>" if escaped_upi_id else ""}
                    {"<li>Bank Details: " + escaped_bank_details + "</li>" if escaped_bank_details else ""}
                    <li>After payment, log in and upload your receipt screenshot.</li>
                </ul>
 
                <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">This is an automated email. Please do not reply.</p>
            </div>
        </div>
        """

        msg = EmailMessage()
        msg["Subject"] = f"New Bill: {category.title()} — ₹{float(bill.split_amount):,.2f}"
        msg["From"] = f"ApartEase <{smtp_email}>"
        msg["To"] = resident.email
        msg.set_content(f"A new bill has been generated for your apartment. Please log in to view it.")
        msg.add_alternative(html_body, subtype="html")

        if smtp_port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)

        logger.info("Email sent to %s for bill #%s", resident.email, bill.id)
        return True

    except Exception as exc:
        logger.error("Failed to send email to %s: %s", resident.email, exc)
        return False


# ── Batch Email (SMTP) ────────────────────────────

def _format_date_email(date_val):
    """Format a date object as 'DD MMM YYYY' for emails."""
    if not date_val:
        return "--"
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    try:
        return f"{date_val.day:02d} {months[date_val.month - 1]} {date_val.year}"
    except Exception:
        return str(date_val)


def send_batch_bill_emails(residents_bills, admin, expense):
    """
    Send bill notification emails to ALL residents using SMTP.
    Logs each transaction status, sent time, and failure reason in EmailLog.
    """
    from models import db
    from models.email_log import EmailLog
    from models.expenditure import Expenditure
    from models.expense import Expense as ExpenseModel
    from datetime import datetime

    smtp_host = current_app.config.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = current_app.config.get("SMTP_PORT", 465)
    smtp_email = current_app.config.get("SMTP_EMAIL", "")
    smtp_password = current_app.config.get("SMTP_PASSWORD", "")

    if not smtp_email or not smtp_password:
        logger.warning("SMTP credentials not configured — skipping batch emails")
        return [
            {"resident": r.name, "email_sent": False}
            for r, _ in residents_bills
        ]

    if not residents_bills:
        return []

    app_url = current_app.config.get("APP_URL", "http://localhost:5000")
    from_address = f"ApartEase <{smtp_email}>"
    apartment_name = admin.apartment_name

    # ── Fetch expenditure-based details if available ──
    expenditure = None
    expense_items = []
    if expense.expenditure_id:
        expenditure = Expenditure.query.get(expense.expenditure_id)
        if expenditure:
            expense_items = ExpenseModel.query.filter_by(expenditure_id=expenditure.id).all()

    if not expenditure:
        # Fallback to single expense items
        expense_items = [expense]
        total_amount = float(expense.amount)
        total_houses = expense.total_houses
        per_person = round(total_amount / total_houses, 2)
        from_date_str = _format_date_email(expense.from_date)
        to_date_str = _format_date_email(expense.to_date)
    else:
        total_amount = float(expenditure.total_amount)
        total_houses = expenditure.total_houses
        per_person = float(expenditure.per_person_amount)
        from_date_str = _format_date_email(expenditure.from_date)
        to_date_str = _format_date_email(expenditure.to_date)

    # HTML Email Template
    html_template = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ApartEase - Expenditure Bill</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); border: 1px solid #e2e8f0;">
                    <!-- HEADER -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #4f46e5, #818cf8); padding: 32px 24px; text-align: center;">
                            <!-- Logo Badge -->
                            <div style="display: inline-block; background-color: #ffffff; padding: 12px; border-radius: 14px; margin-bottom: 12px;">
                                <span style="font-size: 28px; line-height: 1;">🏢</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">ApartEase</h1>
                            <p style="color: #e0e7ff; margin: 4px 0 0 0; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Simple Living. Smart Billing.</p>
                        </td>
                    </tr>

                    <!-- BILL INFO & METADATA -->
                    <tr>
                        <td style="padding: 24px 32px 12px 32px; border-bottom: 1px solid #f1f5f9;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <span style="display: inline-block; padding: 6px 12px; background-color: #e0e7ff; color: #4f46e5; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Bill Information</span>
                                        <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 20px; font-weight: 700;">Expenditure Bill</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 8px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #475569;">
                                            <tr>
                                                <td style="padding: 4px 0; font-weight: 600; width: 140px;">Billing Period:</td>
                                                <td style="padding: 4px 0;">{from_date} &rarr; {to_date}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 0; font-weight: 600;">Apartment Name:</td>
                                                <td style="padding: 4px 0;">{apartment_name}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 0; font-weight: 600;">Admin Name:</td>
                                                <td style="padding: 4px 0;">{admin_name}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- GREETING -->
                    <tr>
                        <td style="padding: 24px 32px 0 32px;">
                            <p style="margin: 0; font-size: 16px; color: #334155; font-weight: 600;">Hello {resident_name},</p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                                A new expenditure bill has been generated for your unit. Please review the details below and complete payment through ApartEase.
                            </p>
                        </td>
                    </tr>

                    <!-- EXPENDITURE BREAKDOWN -->
                    <tr>
                        <td style="padding: 24px 32px 0 32px;">
                            <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Expenditure Breakdown</h3>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; font-size: 14px;">
                                <thead>
                                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                        <th align="left" style="padding: 10px 12px; font-weight: 600; color: #475569; text-align: left;">Category</th>
                                        <th align="right" style="padding: 10px 12px; font-weight: 600; color: #475569; text-align: right;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {category_rows}
                                    <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 700;">
                                        <td style="padding: 12px; color: #0f172a; text-align: left;">Total Expenditure:</td>
                                        <td align="right" style="padding: 12px; color: #0f172a; text-align: right;">₹{total_expenditure_formatted}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <!-- RESIDENT CONTRIBUTION (HIGHLIGHTED) -->
                    <tr>
                        <td style="padding: 24px 32px 0 32px;">
                            <div style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.04), rgba(129, 140, 248, 0.04)); border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px;">
                                <h3 style="margin: 0 0 14px 0; font-size: 15px; color: #0f172a; font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">Resident Contribution</h3>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #475569;">
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; text-align: left;">Flat Number:</td>
                                        <td align="right" style="padding: 4px 0; font-weight: 700; color: #0f172a; text-align: right;">{flat_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; text-align: left;">Split Factor:</td>
                                        <td align="right" style="padding: 4px 0; font-weight: 700; color: #4f46e5; text-align: right;">{split_factor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: 600; text-align: left;">Included Houses:</td>
                                        <td align="right" style="padding: 4px 0; font-weight: 700; color: #0f172a; text-align: right;">{included_houses}</td>
                                    </tr>
                                    <tr style="font-size: 16px;">
                                        <td style="padding: 14px 0 0 0; font-weight: 800; color: #4f46e5; border-top: 1px dashed #cbd5e1; text-align: left;">Amount Payable:</td>
                                        <td align="right" style="padding: 14px 0 0 0; font-weight: 900; color: #4f46e5; font-size: 20px; text-align: right;">₹{amount_payable_formatted}</td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- ACTION SECTION -->
                    <tr>
                        <td align="center" style="padding: 32px 32px; text-align: center;">
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; font-weight: 500;">Please log in to ApartEase to review and complete payment.</p>
                            <a href="{app_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #818cf8); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);">View Bill</a>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                            <p style="margin: 0; font-size: 14px; color: #475569; font-weight: 700;">Thank You</p>
                            <p style="margin: 4px 0 0 0; font-size: 15px; color: #0f172a; font-weight: 800;">ApartEase</p>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500;">Simple Living. Smart Billing.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    # Establish SMTP connection
    try:
        if smtp_port == 465:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, context=context)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        server.login(smtp_email, smtp_password)
    except Exception as connection_exc:
        logger.error("Failed to connect to SMTP server: %s", connection_exc)
        email_results = []
        for res, bill in residents_bills:
            log = EmailLog(
                recipient_email=res.email,
                resident_id=res.id,
                bill_id=bill.id,
                expenditure_id=expenditure.id if expenditure else None,
                status="failed",
                failure_reason=f"SMTP Connection/Auth failed: {str(connection_exc)}",
                sent_at=datetime.utcnow()
            )
            db.session.add(log)
            email_results.append({"resident": res.name, "email_sent": False})
        try:
            db.session.commit()
        except Exception as commit_exc:
            logger.error("Failed to commit SMTP connection failure logs: %s", commit_exc)
            db.session.rollback()
        return email_results

    # Loop through and send
    email_results = []
    with server:
        for resident, bill in residents_bills:
            category_rows = ""
            for idx, item in enumerate(expense_items):
                cat_name = (
                    item.custom_category
                    if item.category == "other" and item.custom_category
                    else item.category
                )
                bg = 'style="background-color: #f8fafc;"' if idx % 2 == 0 else ""
                category_rows += f"""
                <tr {bg} style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 12px; color: #334155; text-align: left;">{html.escape(cat_name).title()}</td>
                    <td align="right" style="padding: 10px 12px; color: #334155; font-weight: 600; text-align: right;">₹{float(item.amount):,.2f}</td>
                </tr>"""

            personalized_html = html_template.format(
                from_date=html.escape(from_date_str),
                to_date=html.escape(to_date_str),
                apartment_name=html.escape(apartment_name),
                admin_name=html.escape(admin.name),
                resident_name=html.escape(resident.name),
                category_rows=category_rows,
                total_expenditure_formatted=f"{total_amount:,.2f}",
                flat_number=html.escape(resident.house_number),
                split_factor=f"{resident.split_number:.1f}",
                included_houses=total_houses,
                amount_payable_formatted=f"{float(bill.split_amount):,.2f}",
                app_url=app_url
            )

            bill_subject = f"Expenditure Bill Generated — Flat {resident.house_number} — ₹{float(bill.split_amount):,.2f}"

            try:
                msg = EmailMessage()
                msg["Subject"] = bill_subject
                msg["From"] = from_address
                msg["To"] = resident.email
                msg.set_content(f"A new bill has been generated for your apartment. Please log in to view it.")
                msg.add_alternative(personalized_html, subtype="html")

                server.send_message(msg)

                # Successful send
                logger.info("Email sent to %s. Log SMTP response", resident.email)
                log = EmailLog(
                    recipient_email=resident.email,
                    resident_id=resident.id,
                    bill_id=bill.id,
                    expenditure_id=expenditure.id if expenditure else None,
                    status="success",
                    message_id=None,
                    sent_at=datetime.utcnow()
                )
                db.session.add(log)
                email_results.append({"resident": resident.name, "email_sent": True})

            except Exception as send_exc:
                logger.error("Failed to send email to %s: %s", resident.email, send_exc)
                log = EmailLog(
                    recipient_email=resident.email,
                    resident_id=resident.id,
                    bill_id=bill.id,
                    expenditure_id=expenditure.id if expenditure else None,
                    status="failed",
                    failure_reason=str(send_exc),
                    sent_at=datetime.utcnow()
                )
                db.session.add(log)
                email_results.append({"resident": resident.name, "email_sent": False})

        # Commit all logs
        try:
            db.session.commit()
        except Exception as commit_exc:
            logger.error("Failed to commit batch email logs: %s", commit_exc)
            db.session.rollback()

    return email_results
