import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from typing import List, Dict
from flask import jsonify, g
from sqlalchemy import and_

from models.project import Project
from config.logging import get_logger
from models.user import User
from models.role import Role
from models.purchase import Purchase
from models.material import Material

log = get_logger()


class EmailService:
    def __init__(self):
        self.sender_email = os.getenv("SENDER_EMAIL")
        self.sender_password = os.getenv("SENDER_EMAIL_PASSWORD")
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 465

        if not self.sender_email or not self.sender_password:
            log.error("Email credentials not configured. Set SENDER_EMAIL and SENDER_EMAIL_PASSWORD environment variables.")
            raise ValueError("Email service not properly configured")

    def _create_connection(self):
        """Create secure SMTP connection with proper error handling"""
        try:
            server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            server.login(self.sender_email, self.sender_password)
            return server
        except smtplib.SMTPAuthenticationError as e:
            log.error(f"SMTP Authentication failed: {str(e)}")
            raise Exception("Email authentication failed. Check credentials.")
        except smtplib.SMTPException as e:
            log.error(f"SMTP connection error: {str(e)}")
            raise Exception("Failed to connect to email server.")
        except Exception as e:
            log.error(f"Unexpected email connection error: {str(e)}")
            raise Exception("Email service unavailable.")

    def _send_email(self, to_emails: List[str], subject: str, html_content: str,
                    text_content: str = None, attachments: List[Dict] = None) -> bool:
        """Send email with error handling and logging"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.sender_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            msg['Date'] = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S +0000')

            if text_content:
                msg.attach(MIMEText(text_content, 'plain', 'utf-8'))

            msg.attach(MIMEText(html_content, 'html', 'utf-8'))

            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename={attachment["filename"]}'
                    )
                    msg.attach(part)

            server = self._create_connection()
            server.send_message(msg)
            server.quit()

            log.info(f"Email sent successfully to {to_emails} with subject: {subject}")
            return True
        except Exception as e:
            log.error(f"Failed to send email to {to_emails}: {str(e)}")
            return False

    def get_procurement_team_emails(self) -> List[str]:
        """Fetch procurement team emails from DB"""
        try:
            procurement_role = Role.query.filter_by(role='procurement', is_deleted=False).first()
            if not procurement_role:
                return None
            users = User.query.filter_by(
                role_id=procurement_role.role_id,
                is_deleted=False,
                is_active=True
            ).all()

            emails = [u.email for u in users if u.email]
            return emails if emails else None
        except Exception as e:
            log.error(f"Error fetching procurement team emails: {str(e)}")
            return None

    def _generate_purchase_request_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                              requester_info: Dict) -> str:
        """Generate HTML email content for purchase request"""
        project=Project.query.filter_by(project_id=purchase_data['project_id']).first()
        
        # Calculate total cost for each material and overall total
        material_rows = ""
        overall_total = 0
        
        for idx, m in enumerate(materials_data, start=1):
            qty = float(m.get("quantity", 0))
            cost = float(m.get("cost", 0))
            total_cost = qty * cost
            overall_total += total_cost
            
            material_rows += f"""
                <tr>
                    <td>{idx}</td>
                    <td>{m.get('category', 'N/A')}</td>
                    <td>{m.get('description', 'N/A')}</td>
                    <td>{qty}</td>
                    <td>{m.get('unit', '')}</td>
                    <td>{cost:.2f}</td>
                    <td>{total_cost:.2f}</td>
                </tr>
            """
        return f"""
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                body {{
                    font-family: Arial, sans-serif;
                    background-color: #f5f9ff;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                }}
                .email-container {{
                    max-width: 650px;
                    margin: auto;
                    background: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    overflow: hidden;
                    border: 1px solid #d0e2ff;
                }}
                .header {{
                    background: #243d8a;
                    color: #ffffff;
                    padding: 20px;
                    text-align: center;
                }}
                .header h2 {{
                    margin: 0;
                    font-size: 22px;
                    font-weight: bold;
                }}
                .content {{
                    padding: 25px 20px;
                }}
                .content p {{
                    font-size: 14px;
                    margin: 8px 0;
                    line-height: 1.6;
                }}
                .label {{
                    font-weight: bold;
                    color: #243d8a;
                }}
                h3 {{
                    margin-top: 25px;
                    margin-bottom: 15px;
                    color: #243d8a;
                    font-size: 18px;
                    border-bottom: 2px solid #243d8a;
                    display: inline-block;
                    padding-bottom: 4px;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }}
                table th {{
                    background: #243d8a;
                    color: #fff;
                    padding: 10px;
                    text-align: left;
                    font-size: 14px;
                }}
                table td {{
                    padding: 10px;
                    border: 1px solid #d0e2ff;
                    font-size: 14px;
                }}
                .signature {{
                    margin-top: 25px;
                    font-size: 14px;
                    color: #333;
                }}
                .footer {{
                    text-align: center;
                    background: #f5f9ff;
                    padding: 15px;
                    font-size: 13px;
                    color: #666;
                    border-top: 1px solid #d0e2ff;
                }}
                .company {{
                    color: #243d8a;
                    font-weight: bold;
                    margin-top: 5px;
                }}
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h2>New Purchase Request</h2>
                    </div>
                    <div class="content">
                        <p><span class="label">Project Name:</span> {project.project_name}</p>
                        <p><span class="label">Site Location:</span> {purchase_data['site_location']}</p>
                        <p><span class="label">Date:</span> {purchase_data['date']}</p>
                        <p><span class="label">Requested By:</span> {requester_info['full_name']} ({requester_info['role']})</p>

                        <h3>Materials Requested</h3>
                        <table>
                            <tr>
                                <th>S.No</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Cost</th>
                                <th>Total Cost</th>
                            </tr>
                            {material_rows}
                        </table>
                        
                        <div style="margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; color: #243d8a;">
                            Overall Total Cost: {overall_total:.2f}
                        </div>

                        <div class="signature">
                            <p>Best regards,</p>
                            <strong>Redlitmus Team</strong>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Thank you for using</p>
                        <p class="company">ERP System</p>
                    </div>
                </div>
            </body>
            </html>
            """

    def _generate_purchase_request_email_text(
        self, purchase_data: Dict, materials_data: List[Dict], requester_info: Dict
    ) -> str:
        """Generate plain-text email content for purchase request"""

        # Build table rows
        table_rows = []
        overall_total = 0

        for idx, m in enumerate(materials_data, start=1):
            qty = float(m.get("quantity", 0))
            cost = float(m.get("cost", 0))
            total_cost = qty * cost
            overall_total += total_cost

            table_rows.append(
                f"{idx:<5} | {m.get('category','N/A'):<12} | {m.get('description','N/A'):<25}"
                f" | {qty:<8} | {m.get('unit',''):<6} | {cost:<10.2f} | {total_cost:<12.2f}"
            )

        # Table header
        header = (
            f"{'S.No':<5} | {'Category':<12} | {'Description':<25} | "
            f"{'Quantity':<8} | {'Unit':<6} | {'Cost':<10} | {'Total Cost':<12}\n"
            + "-" * 100
        )

        materials_text = "\n".join(table_rows)

        # Return plain text format (no HTML tags)
        return f"""
New Purchase Request
---------------------
Purchase ID   : {purchase_data['purchase_id']}
Site Location : {purchase_data['site_location']}
Date          : {purchase_data['date']}
Requested By  : {requester_info['full_name']} ({requester_info['role']})

Materials:
{header}
{materials_text}

Overall Total Cost: {overall_total:.2f}
"""

    def send_purchase_request_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                           requester_info: Dict) -> bool:
        """Send purchase request email to procurement team"""
        try:
            recipients = self.get_procurement_team_emails()
            subject = f"New Purchase Request"
            html_content = self._generate_purchase_request_email_html(purchase_data, materials_data, requester_info)
            text_content = self._generate_purchase_request_email_text(purchase_data, materials_data, requester_info)

            return self._send_email(recipients, subject, html_content, text_content)
        except Exception as e:
            log.error(f"Error sending purchase request notification: {str(e)}")
            return False
