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
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="format-detection" content="telephone=no">
                <style>
                /* Base styles */
                body {{
                    font-family: Arial, sans-serif !important;
                    background-color: #f5f9ff !important;
                    margin: 0 !important;
                    padding: 10px !important;
                    color: #333 !important;
                    width: 100% !important;
                    -webkit-text-size-adjust: 100% !important;
                    -ms-text-size-adjust: 100% !important;
                }}
                .email-container {{
                    max-width: 650px !important;
                    margin: 0 auto !important;
                    background: #ffffff !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                    overflow: hidden !important;
                    border: 1px solid #d0e2ff !important;
                    width: 100% !important;
                }}
                .header {{
                    background: #243d8a !important;
                    color: #ffffff !important;
                    padding: 15px !important;
                    text-align: center !important;
                }}
                .header h2 {{
                    margin: 0 !important;
                    font-size: 18px !important;
                    font-weight: bold !important;
                }}
                .content {{
                    padding: 15px !important;
                }}
                .content p {{
                    font-size: 14px !important;
                    margin: 8px 0 !important;
                    line-height: 1.6 !important;
                    word-wrap: break-word !important;
                }}
                .label {{
                    font-weight: bold !important;
                    color: #243d8a !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #243d8a !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #243d8a !important;
                    display: inline-block !important;
                    padding-bottom: 4px !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    margin-top: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    min-width: 600px !important;
                }}
                table th {{
                    background: #243d8a !important;
                    color: #fff !important;
                    padding: 8px 6px !important;
                    text-align: left !important;
                    font-size: 12px !important;
                    white-space: nowrap !important;
                }}
                table td {{
                    padding: 8px 6px !important;
                    border: 1px solid #d0e2ff !important;
                    font-size: 12px !important;
                    word-wrap: break-word !important;
                }}
                .total-cost {{
                    margin-top: 15px !important;
                    text-align: right !important;
                    font-weight: bold !important;
                    font-size: 14px !important;
                    color: #243d8a !important;
                    padding: 10px !important;
                    background: #f5f9ff !important;
                    border-radius: 4px !important;
                }}
                .signature {{
                    margin-top: 20px !important;
                    font-size: 14px !important;
                    color: #333 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f5f9ff !important;
                    padding: 10px !important;
                    font-size: 12px !important;
                    color: #666 !important;
                    border-top: 1px solid #d0e2ff !important;
                }}
                .company {{
                    color: #243d8a !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{
                        padding: 5px !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 10px !important;
                    }}
                    .header h2 {{
                        font-size: 16px !important;
                    }}
                    .content {{
                        padding: 10px !important;
                    }}
                    .content p {{
                        font-size: 13px !important;
                    }}
                    h3 {{
                        font-size: 14px !important;
                        margin-top: 15px !important;
                        margin-bottom: 8px !important;
                    }}
                    table {{
                        min-width: 500px !important;
                    }}
                    table th, table td {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                    }}
                    .total-cost {{
                        font-size: 13px !important;
                        padding: 8px !important;
                    }}
                    .signature {{
                        font-size: 13px !important;
                        margin-top: 15px !important;
                    }}
                    .footer {{
                        padding: 8px !important;
                        font-size: 11px !important;
                    }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    body {{
                        padding: 2px !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 8px !important;
                    }}
                    .header h2 {{
                        font-size: 14px !important;
                    }}
                    .content {{
                        padding: 8px !important;
                    }}
                    .content p {{
                        font-size: 12px !important;
                    }}
                    h3 {{
                        font-size: 13px !important;
                        margin-top: 12px !important;
                        margin-bottom: 6px !important;
                    }}
                    table {{
                        min-width: 400px !important;
                    }}
                    table th, table td {{
                        padding: 4px 2px !important;
                        font-size: 10px !important;
                    }}
                    .total-cost {{
                        font-size: 12px !important;
                        padding: 6px !important;
                    }}
                    .signature {{
                        font-size: 12px !important;
                        margin-top: 12px !important;
                    }}
                    .footer {{
                        padding: 6px !important;
                        font-size: 10px !important;
                    }}
                }}
                
                /* Additional mobile fixes */
                @media only screen and (max-width: 320px) {{
                    table {{
                        min-width: 300px !important;
                    }}
                    table th, table td {{
                        padding: 3px 1px !important;
                        font-size: 9px !important;
                    }}
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
                        <div class="table-container">
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
                        </div>
                        
                        <div class="total-cost">
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



    def get_project_manager_emails(self) -> List[str]:
        """Fetch project manager emails from DB"""
        try:
            pm_role = Role.query.filter_by(role='projectManager', is_deleted=False).first()
            if not pm_role:
                return None
            
            users = User.query.filter_by(
                role_id=pm_role.role_id,
                is_deleted=False,
                is_active=True
            ).all()

            emails = [u.email for u in users if u.email]
            print("project manager emails:", emails)
            return emails if emails else None
        except Exception as e:
            log.error(f"Error fetching project manager emails: {str(e)}")
            return None



    def send_procurement_to_project_manager_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                                        requester_info: Dict, procurement_info: Dict) -> bool:
        """Send notification from procurement to project manager only"""
        try:
            # Get project manager emails only
            recipients = self.get_project_manager_emails()
            print("project manager recipients:", recipients)
            
            if not recipients:
                log.error("No project manager emails found")
                return False
            
            subject = f"Purchase Request Ready for PM Approval - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_procurement_to_pm_email_html(purchase_data, materials_data, requester_info, procurement_info)
            text_content = self._generate_procurement_to_pm_email_text(purchase_data, materials_data, requester_info, procurement_info)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"Email sent to {len(recipients)} project manager(s)")
            return success
        except Exception as e:
            log.error(f"Error sending procurement to PM notification: {str(e)}")
            return False

    def _generate_procurement_to_pm_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                              requester_info: Dict, procurement_info: Dict) -> str:
        """Generate HTML email for procurement to PM notification"""
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        
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
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="format-detection" content="telephone=no">
                <style>
                /* Base styles */
                body {{
                    font-family: Arial, sans-serif !important;
                    background-color: #f5f9ff !important;
                    margin: 0 !important;
                    padding: 10px !important;
                    color: #333 !important;
                    width: 100% !important;
                    -webkit-text-size-adjust: 100% !important;
                    -ms-text-size-adjust: 100% !important;
                }}
                .email-container {{
                    max-width: 650px !important;
                    margin: 0 auto !important;
                    background: #ffffff !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                    overflow: hidden !important;
                    border: 1px solid #d0e2ff !important;
                    width: 100% !important;
                }}
                .header {{
                    background: #059669 !important;
                    color: #ffffff !important;
                    padding: 15px !important;
                    text-align: center !important;
                }}
                .header h2 {{
                    margin: 0 !important;
                    font-size: 18px !important;
                    font-weight: bold !important;
                }}
                .content {{
                    padding: 15px !important;
                }}
                .content p {{
                    font-size: 14px !important;
                    margin: 8px 0 !important;
                    line-height: 1.6 !important;
                    word-wrap: break-word !important;
                }}
                .label {{
                    font-weight: bold !important;
                    color: #059669 !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #059669 !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #059669 !important;
                    display: inline-block !important;
                    padding-bottom: 4px !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    margin-top: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    min-width: 600px !important;
                }}
                table th {{
                    background: #059669 !important;
                    color: #fff !important;
                    padding: 8px 6px !important;
                    text-align: left !important;
                    font-size: 12px !important;
                    white-space: nowrap !important;
                }}
                table td {{
                    padding: 8px 6px !important;
                    border: 1px solid #d0e2ff !important;
                    font-size: 12px !important;
                    word-wrap: break-word !important;
                }}
                .total-cost {{
                    margin-top: 15px !important;
                    text-align: right !important;
                    font-weight: bold !important;
                    font-size: 14px !important;
                    color: #059669 !important;
                    padding: 10px !important;
                    background: #f5f9ff !important;
                    border-radius: 4px !important;
                }}
                .signature {{
                    margin-top: 20px !important;
                    font-size: 14px !important;
                    color: #333 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f5f9ff !important;
                    padding: 10px !important;
                    font-size: 12px !important;
                    color: #666 !important;
                    border-top: 1px solid #d0e2ff !important;
                }}
                .company {{
                    color: #059669 !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                .approval-section {{
                    background: #f0fdf4 !important;
                    border: 1px solid #bbf7d0 !important;
                    border-radius: 6px !important;
                    padding: 15px !important;
                    margin: 20px 0 !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{
                        padding: 5px !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 10px !important;
                    }}
                    .header h2 {{
                        font-size: 16px !important;
                    }}
                    .content {{
                        padding: 10px !important;
                    }}
                    .content p {{
                        font-size: 13px !important;
                    }}
                    h3 {{
                        font-size: 14px !important;
                        margin-top: 15px !important;
                        margin-bottom: 8px !important;
                    }}
                    table {{
                        min-width: 500px !important;
                    }}
                    table th, table td {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                    }}
                    .total-cost {{
                        font-size: 13px !important;
                        padding: 8px !important;
                    }}
                    .signature {{
                        font-size: 13px !important;
                        margin-top: 15px !important;
                    }}
                    .footer {{
                        padding: 8px !important;
                        font-size: 11px !important;
                    }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    body {{
                        padding: 2px !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 8px !important;
                    }}
                    .header h2 {{
                        font-size: 14px !important;
                    }}
                    .content {{
                        padding: 8px !important;
                    }}
                    .content p {{
                        font-size: 12px !important;
                    }}
                    h3 {{
                        font-size: 13px !important;
                        margin-top: 12px !important;
                        margin-bottom: 6px !important;
                    }}
                    table {{
                        min-width: 400px !important;
                    }}
                    table th, table td {{
                        padding: 4px 2px !important;
                        font-size: 10px !important;
                    }}
                    .total-cost {{
                        font-size: 12px !important;
                        padding: 6px !important;
                    }}
                    .signature {{
                        font-size: 12px !important;
                        margin-top: 12px !important;
                    }}
                    .footer {{
                        padding: 6px !important;
                        font-size: 10px !important;
                    }}
                }}
                
                /* Additional mobile fixes */
                @media only screen and (max-width: 320px) {{
                    table {{
                        min-width: 300px !important;
                    }}
                    table th, table td {{
                        padding: 3px 1px !important;
                        font-size: 9px !important;
                    }}
                }}
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h2>Purchase Request Ready for PM Approval</h2>
                    </div>
                    <div class="content">
                        <p><span class="label">Project Name:</span> {project.project_name if project else 'N/A'}</p>
                        <p><span class="label">Site Location:</span> {purchase_data['site_location']}</p>
                        <p><span class="label">Date:</span> {purchase_data['date']}</p>
                        <p><span class="label">Requested By:</span> {requester_info['full_name']} ({requester_info['role']})</p>
                        <p><span class="label">Processed By:</span> {procurement_info.get('full_name', 'Procurement Team')} (Procurement)</p>

                        <div class="approval-section">
                            <p><strong>✅ Procurement Review Complete</strong></p>
                            <p>This purchase request has been reviewed and approved by the procurement team. It is now ready for your approval as Project Manager.</p>
                        </div>

                        <h3>Materials Requested</h3>
                        <div class="table-container">
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
                        </div>
                        
                        <div class="total-cost">
                            Overall Total Cost: {overall_total:.2f}
                        </div>

                        <div class="signature">
                            <p>Please review and approve this purchase request.</p>
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

    def _generate_procurement_to_pm_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                              requester_info: Dict, procurement_info: Dict) -> str:
        """Generate text email for procurement to PM notification"""
        
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

        return f"""
Purchase Request Ready for PM Approval
---------------------------------------
Purchase ID   : {purchase_data['purchase_id']}
Site Location : {purchase_data['site_location']}
Date          : {purchase_data['date']}
Requested By  : {requester_info['full_name']} ({requester_info['role']})
Processed By  : {procurement_info.get('full_name', 'Procurement Team')} (Procurement)

✅ PROCUREMENT REVIEW COMPLETE
This purchase request has been reviewed and approved by the procurement team.
It is now ready for your approval as Project Manager.

Materials:
{header}
{materials_text}

Overall Total Cost: {overall_total:.2f}

Please review and approve this purchase request.

Best regards,
Procurement Team
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
