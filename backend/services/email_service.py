"""
Email Alert Service — sends real emails via Gmail SMTP.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GMAIL_USER = os.environ.get("GMAIL_USER", "vinaykumarpersonal99@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")


def send_email(to_email, subject, html_body):
    if not GMAIL_APP_PASSWORD:
        print("GMAIL_APP_PASSWORD not set — skipping email")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"AI ICU Guardian <{GMAIL_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())

        print(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False


def send_critical_alert(patient_name, patient_id, vital_details, contact_name, contact_email, dashboard_url=""):
    subject = f"CRITICAL ALERT: {patient_name} (ICU-{patient_id}) — AI ICU Guardian"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #DC2626; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">CRITICAL PATIENT ALERT</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">AI ICU Guardian — Immediate Attention Required</p>
        </div>
        <div style="background: #FEF2F2; padding: 20px; border: 1px solid #FECACA;">
            <p style="margin: 0 0 10px;">Dear <strong>{contact_name}</strong>,</p>
            <p style="margin: 0 0 15px; font-size: 16px;">
                Patient <strong>{patient_name}</strong> (ICU-{patient_id}) has entered <span style="color: #DC2626; font-weight: bold;">CRITICAL</span> status.
            </p>
            <div style="background: white; border-left: 4px solid #DC2626; padding: 12px 16px; margin: 15px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">Alert Details</p>
                <p style="margin: 5px 0 0; font-size: 16px; font-weight: bold; color: #DC2626;">{vital_details}</p>
            </div>
            {f'<p><a href="{dashboard_url}" style="display: inline-block; background: #2563EB; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Patient Dashboard</a></p>' if dashboard_url else ''}
            <p style="margin: 15px 0 0; font-size: 12px; color: #999;">
                This is an automated alert from AI ICU Guardian Patient Monitoring System.
            </p>
        </div>
    </div>
    """
    return send_email(contact_email, subject, html)


def send_status_update(patient_name, patient_id, new_status, contact_name, contact_email, dashboard_url=""):
    subject = f"Status Update: {patient_name} (ICU-{patient_id}) — {new_status.title()}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16A34A; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">PATIENT STATUS IMPROVED</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">AI ICU Guardian</p>
        </div>
        <div style="background: #F0FDF4; padding: 20px; border: 1px solid #BBF7D0;">
            <p style="margin: 0 0 10px;">Dear <strong>{contact_name}</strong>,</p>
            <p style="margin: 0 0 15px; font-size: 16px;">
                Patient <strong>{patient_name}</strong> (ICU-{patient_id}) has improved to
                <span style="color: #16A34A; font-weight: bold;">{new_status.upper()}</span> status.
            </p>
            {f'<p><a href="{dashboard_url}" style="display: inline-block; background: #2563EB; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Patient Dashboard</a></p>' if dashboard_url else ''}
        </div>
    </div>
    """
    return send_email(contact_email, subject, html)
