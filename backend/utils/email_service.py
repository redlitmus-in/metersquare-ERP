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
                            <strong>Site Supervisor Team</strong>
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
                            <strong>Procurement Team</strong>
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

    def _generate_pm_to_estimation_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                             requester_info: Dict, pm_info: Dict) -> str:
        """Generate HTML email for PM to Estimation notification"""
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
                    background: #7c3aed !important;
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
                    color: #7c3aed !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #7c3aed !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #7c3aed !important;
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
                    background: #7c3aed !important;
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
                    color: #7c3aed !important;
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
                    color: #7c3aed !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                .approval-section {{
                    background: #f3e8ff !important;
                    border: 1px solid #c4b5fd !important;
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
                        <h2>Purchase Request Approved by PM - Ready for Estimation</h2>
                    </div>
                    <div class="content">
                        <p><span class="label">Project Name:</span> {project.project_name if project else 'N/A'}</p>
                        <p><span class="label">Site Location:</span> {purchase_data['site_location']}</p>
                        <p><span class="label">Date:</span> {purchase_data['date']}</p>
                        <p><span class="label">Requested By:</span> {requester_info['full_name']} ({requester_info['role']})</p>
                        <p><span class="label">Approved By:</span> {pm_info.get('full_name', 'Project Manager')} (Project Manager)</p>

                        <div class="approval-section">
                            <p><strong>✅ Project Manager Approval Complete</strong></p>
                            <p>This purchase request has been reviewed and approved by the Project Manager. Quantity and specifications have been verified. It is now ready for cost estimation.</p>
                        </div>

                        <h3>Materials Approved for Estimation</h3>
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
                            <p>Please proceed with cost estimation for this purchase request.</p>
                            <p>Best regards,</p>
                            <strong>Project Manager</strong>
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

    def _generate_pm_to_estimation_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                             requester_info: Dict, pm_info: Dict) -> str:
        """Generate text email for PM to Estimation notification"""
        
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
Purchase Request Approved by PM - Ready for Estimation
-----------------------------------------------------
Purchase ID   : {purchase_data['purchase_id']}
Site Location : {purchase_data['site_location']}
Date          : {purchase_data['date']}
Requested By  : {requester_info['full_name']} ({requester_info['role']})
Approved By   : {pm_info.get('full_name', 'Project Manager')} (Project Manager)

✅ PROJECT MANAGER APPROVAL COMPLETE
This purchase request has been reviewed and approved by the Project Manager.
Quantity and specifications have been verified. It is now ready for cost estimation.

Materials Approved for Estimation:
{header}
{materials_text}

Overall Total Cost: {overall_total:.2f}

Please proceed with cost estimation for this purchase request.

Best regards,
Project Manager
        """

    def _generate_pm_rejection_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                         requester_info: Dict, pm_info: Dict, rejection_reason: str) -> str:
        """Generate HTML email for PM rejection notification"""
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
                    background: #dc2626 !important;
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
                    color: #dc2626 !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #dc2626 !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #dc2626 !important;
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
                    background: #dc2626 !important;
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
                    color: #dc2626 !important;
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
                    color: #dc2626 !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                .rejection-section {{
                    background: #fef2f2 !important;
                    border: 1px solid #fecaca !important;
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
                        <h2>Purchase Request Rejected by PM - Requires Revision</h2>
                    </div>
                    <div class="content">
                        <p><span class="label">Project Name:</span> {project.project_name if project else 'N/A'}</p>
                        <p><span class="label">Site Location:</span> {purchase_data['site_location']}</p>
                        <p><span class="label">Date:</span> {purchase_data['date']}</p>
                        <p><span class="label">Requested By:</span> {requester_info['full_name']} ({requester_info['role']})</p>
                        <p><span class="label">Rejected By:</span> {pm_info.get('full_name', 'Project Manager')} (Project Manager)</p>

                        <div class="rejection-section">
                            <p><strong>❌ Project Manager Rejection</strong></p>
                            <p><strong>Rejection Reason:</strong> {rejection_reason}</p>
                            <p>This purchase request has been reviewed and rejected by the Project Manager. Please revise the request based on the feedback provided and resubmit.</p>
                        </div>

                        <h3>Materials Requiring Revision</h3>
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
                            <p>Please review the rejection reason and revise the purchase request accordingly.</p>
                            <p>Best regards,</p>
                            <strong>Project Manager</strong>
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

    def _generate_pm_rejection_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                         requester_info: Dict, pm_info: Dict, rejection_reason: str) -> str:
        """Generate text email for PM rejection notification"""
        
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
Purchase Request Rejected by PM - Requires Revision
--------------------------------------------------
Purchase ID   : {purchase_data['purchase_id']}
Site Location : {purchase_data['site_location']}
Date          : {purchase_data['date']}
Requested By  : {requester_info['full_name']} ({requester_info['role']})
Rejected By   : {pm_info.get('full_name', 'Project Manager')} (Project Manager)

❌ PROJECT MANAGER REJECTION
Rejection Reason: {rejection_reason}

This purchase request has been reviewed and rejected by the Project Manager.
Please revise the request based on the feedback provided and resubmit.

Materials Requiring Revision:
{header}
{materials_text}

Overall Total Cost: {overall_total:.2f}

Please review the rejection reason and revise the purchase request accordingly.

Best regards,
Project Manager
        """

    def get_estimation_team_emails(self) -> List[str]:
        """Fetch estimation team emails from DB"""
        try:
            estimation_role = Role.query.filter_by(role='estimation', is_deleted=False).first()
            if not estimation_role:
                return None
            
            users = User.query.filter_by(
                role_id=estimation_role.role_id,
                is_deleted=False,
                is_active=True
            ).all()

            emails = [u.email for u in users if u.email]
            print("estimation team emails:", emails)
            return emails if emails else None
        except Exception as e:
            log.error(f"Error fetching estimation team emails: {str(e)}")
            return None

    def send_pm_to_estimation_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                          requester_info: Dict, pm_info: Dict) -> bool:
        """Send notification from Project Manager to Estimation team"""
        try:
            # Get estimation team emails
            recipients = self.get_estimation_team_emails()
            print("estimation team recipients:", recipients)
            
            if not recipients:
                log.error("No estimation team emails found")
                return False
            
            subject = f"Purchase Request Approved by PM - Ready for Estimation - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_pm_to_estimation_email_html(purchase_data, materials_data, requester_info, pm_info)
            text_content = self._generate_pm_to_estimation_email_text(purchase_data, materials_data, requester_info, pm_info)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"Email sent to {len(recipients)} estimation team member(s)")
            return success
        except Exception as e:
            log.error(f"Error sending PM to estimation notification: {str(e)}")
            return False

    def send_pm_rejection_to_procurement(self, purchase_data: Dict, materials_data: List[Dict],
                                        requester_info: Dict, pm_info: Dict, rejection_reason: str) -> bool:
        """Send rejection notification from Project Manager back to Procurement"""
        try:
            # Get procurement team emails
            recipients = self.get_procurement_team_emails()
            print("procurement recipients for rejection:", recipients)
            
            if not recipients:
                log.error("No procurement team emails found")
                return False
            
            subject = f"Purchase Request Rejected by PM - Requires Revision - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_pm_rejection_email_html(purchase_data, materials_data, requester_info, pm_info, rejection_reason)
            text_content = self._generate_pm_rejection_email_text(purchase_data, materials_data, requester_info, pm_info, rejection_reason)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"Rejection email sent to {len(recipients)} procurement member(s)")
            return success
        except Exception as e:
            log.error(f"Error sending PM rejection to procurement: {str(e)}")
            return False

    def send_estimation_to_technical_director_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                                          requester_info: Dict, estimation_info: Dict) -> bool:
        """Send notification from Estimation team to Technical Director"""
        try:
            # Get technical director emails
            recipients = self.get_technical_director_emails()
            print("technical director recipients:", recipients)
            
            if not recipients:
                log.error("No technical director emails found")
                return False
            
            subject = f"Purchase Request Approved by Estimation - Ready for Technical Review - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_estimation_to_td_email_html(purchase_data, materials_data, requester_info, estimation_info)
            text_content = self._generate_estimation_to_td_email_text(purchase_data, materials_data, requester_info, estimation_info)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"Email sent to {len(recipients)} technical director(s)")
            return success
        except Exception as e:
            log.error(f"Error sending estimation to technical director notification: {str(e)}")
            return False

    def send_estimation_cost_rejection_to_procurement(self, purchase_data: Dict, materials_data: List[Dict],
                                                     requester_info: Dict, estimation_info: Dict, rejection_reason: str) -> bool:
        """Send cost rejection notification from Estimation team back to Procurement"""
        try:
            # Get procurement team emails
            recipients = self.get_procurement_team_emails()
            print("procurement recipients for cost rejection:", recipients)
            
            if not recipients:
                log.error("No procurement team emails found")
                return False
            
            subject = f"Purchase Request Rejected by Estimation (Cost) - Requires Cost Revision - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_estimation_cost_rejection_email_html(purchase_data, materials_data, requester_info, estimation_info, rejection_reason)
            text_content = self._generate_estimation_cost_rejection_email_text(purchase_data, materials_data, requester_info, estimation_info, rejection_reason)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"Cost rejection email sent to {len(recipients)} procurement member(s)")
            return success
        except Exception as e:
            log.error(f"Error sending estimation cost rejection to procurement: {str(e)}")
            return False

    def send_estimation_pm_flag_rejection_to_pm(self, purchase_data: Dict, materials_data: List[Dict],
                                               requester_info: Dict, estimation_info: Dict, rejection_reason: str) -> bool:
        """Send PM flag rejection notification from Estimation team back to Project Manager"""
        try:
            # Get project manager emails
            recipients = self.get_project_manager_emails()
            print("project manager recipients for PM flag rejection:", recipients)
            
            if not recipients:
                log.error("No project manager emails found")
                return False
            
            subject = f"Purchase Request Rejected by Estimation (PM Flag) - Requires PM Review - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_estimation_pm_flag_rejection_email_html(purchase_data, materials_data, requester_info, estimation_info, rejection_reason)
            text_content = self._generate_estimation_pm_flag_rejection_email_text(purchase_data, materials_data, requester_info, estimation_info, rejection_reason)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"PM flag rejection email sent to {len(recipients)} project manager(s)")
            return success
        except Exception as e:
            log.error(f"Error sending estimation PM flag rejection to PM: {str(e)}")
            return False

    def get_technical_director_emails(self) -> List[str]:
        """Get all technical director email addresses"""
        try:
            from models.user import User
            from models.role import Role
            
            td_role = Role.query.filter_by(role='technicalDirector', is_deleted=False).first()
            if not td_role:
                return None
            
            users = User.query.filter_by(
                role_id=td_role.role_id,
                is_deleted=False,
                is_active=True
            ).all()

            emails = [u.email for u in users if u.email]
            print("technical director emails:", emails)
            return emails if emails else None
        except Exception as e:
            log.error(f"Error fetching technical director emails: {str(e)}")
            return None

    def _generate_estimation_to_td_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                             requester_info: Dict, estimation_info: Dict) -> str:
        """Generate HTML email content for estimation to technical director notification"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_table = ""
        for i, mat in enumerate(materials_data, 1):
            materials_table += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{i}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('category', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('description', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('specification', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
            </tr>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="format-detection" content="telephone=no">
            <title>Purchase Request Approved by Estimation</title>
            <style>
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
                    max-width: 800px !important;
                    margin: 0 auto !important;
                    background-color: #ffffff !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                    overflow: hidden !important;
                }}
                .header {{
                    background-color: #243d8a !important;
                    color: white !important;
                    padding: 20px !important;
                    text-align: center !important;
                }}
                .header h2 {{
                    margin: 0 !important;
                    font-size: 24px !important;
                    font-weight: bold !important;
                }}
                .content {{
                    padding: 20px !important;
                }}
                .content p {{
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                    margin-bottom: 15px !important;
                }}
                h3 {{
                    color: #243d8a !important;
                    font-size: 18px !important;
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 15px 0 !important;
                    font-size: 12px !important;
                }}
                table th {{
                    background-color: #243d8a !important;
                    color: white !important;
                    padding: 10px 8px !important;
                    text-align: left !important;
                    font-weight: bold !important;
                    border: 1px solid #ddd !important;
                }}
                table td {{
                    padding: 8px !important;
                    border: 1px solid #ddd !important;
                    text-align: left !important;
                }}
                .total-cost {{
                    background-color: #f0f4ff !important;
                    font-weight: bold !important;
                    font-size: 16px !important;
                    padding: 15px !important;
                    text-align: center !important;
                    border: 2px solid #243d8a !important;
                    margin: 20px 0 !important;
                }}
                .signature {{
                    margin-top: 20px !important;
                    font-size: 14px !important;
                    color: #666 !important;
                }}
                .footer {{
                    background-color: #f8f9fa !important;
                    padding: 15px !important;
                    text-align: center !important;
                    font-size: 12px !important;
                    color: #666 !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{ padding: 5px !important; }}
                    .email-container {{ margin: 0 !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; }}
                    .header {{ padding: 10px !important; }}
                    .header h2 {{ font-size: 16px !important; }}
                    .content {{ padding: 10px !important; }}
                    .content p {{ font-size: 13px !important; }}
                    h3 {{ font-size: 14px !important; margin-top: 15px !important; margin-bottom: 8px !important; }}
                    table {{ min-width: 500px !important; }}
                    table th, table td {{ padding: 6px 4px !important; font-size: 11px !important; }}
                    .total-cost {{ font-size: 13px !important; padding: 8px !important; }}
                    .signature {{ font-size: 13px !important; margin-top: 15px !important; }}
                    .footer {{ padding: 8px !important; font-size: 11px !important; }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    .header h2 {{ font-size: 14px !important; }}
                    .content p {{ font-size: 12px !important; }}
                    h3 {{ font-size: 13px !important; }}
                    table {{ min-width: 400px !important; }}
                    table th, table td {{ padding: 4px 2px !important; font-size: 10px !important; }}
                    .total-cost {{ font-size: 12px !important; padding: 6px !important; }}
                }}
                
                @media only screen and (max-width: 320px) {{
                    table {{ min-width: 300px !important; }}
                    table th, table td {{ padding: 3px 1px !important; font-size: 9px !important; }}
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h2>Purchase Request Approved by Estimation Team</h2>
                </div>
                <div class="content">
                    <p>Dear Technical Director,</p>
                    <p>The Estimation team has approved the following purchase request and it is now ready for your technical review:</p>
                    
                    <h3>Purchase Request Details</h3>
                    <p><strong>Request ID:</strong> #{purchase_data.get('purchase_id')}</p>
                    <p><strong>Requested By:</strong> {requester_info.get('full_name', 'N/A')}</p>
                    <p><strong>Site Location:</strong> {purchase_data.get('site_location', 'N/A')}</p>
                    <p><strong>Date:</strong> {purchase_data.get('date', 'N/A')}</p>
                    <p><strong>Project Name:</strong> {project.project_name if project else 'N/A'}</p>
                    <p><strong>Purpose:</strong> {purchase_data.get('purpose', 'N/A')}</p>
                    
                    <h3>Materials List</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Specification</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Unit Cost</th>
                                    <th>Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials_table}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="total-cost">
                        <strong>Overall Total Cost: ${total_cost:.2f}</strong>
                    </div>
                    
                    <h3>Estimation Team Approval</h3>
                    <p><strong>Approved By:</strong> {estimation_info.get('full_name', 'N/A')}</p>
                    <p><strong>Role:</strong> {estimation_info.get('role', 'N/A')}</p>
                    
                    <p>Please review this purchase request and provide your technical approval.</p>
                    
                    <div class="signature">
                        <p>Best regards,<br>
                        Estimation Team<br>
                        ERP System</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated email from the ERP system. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _generate_estimation_to_td_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                             requester_info: Dict, estimation_info: Dict) -> str:
        """Generate text email content for estimation to technical director notification"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_text = ""
        for i, mat in enumerate(materials_data, 1):
            materials_text += f"{i}. {mat.get('category', 'N/A')} - {mat.get('description', 'N/A')}\n"
            materials_text += f"   Specification: {mat.get('specification', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: ${mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: ${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
        return f"""
Purchase Request Approved by Estimation Team

Dear Technical Director,

The Estimation team has approved the following purchase request and it is now ready for your technical review:

Purchase Request Details:
- Request ID: #{purchase_data.get('purchase_id')}
- Requested By: {requester_info.get('full_name', 'N/A')}
- Site Location: {purchase_data.get('site_location', 'N/A')}
- Date: {purchase_data.get('date', 'N/A')}
- Project Name: {project.project_name if project else 'N/A'}
- Purpose: {purchase_data.get('purpose', 'N/A')}

Materials List:
{materials_text}

Overall Total Cost: ${total_cost:.2f}

Estimation Team Approval:
- Approved By: {estimation_info.get('full_name', 'N/A')}
- Role: {estimation_info.get('role', 'N/A')}

Please review this purchase request and provide your technical approval.

Best regards,
Estimation Team
ERP System

This is an automated email from the ERP system.
        """

    def _generate_estimation_cost_rejection_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                                      requester_info: Dict, estimation_info: Dict, rejection_reason: str) -> str:
        """Generate HTML email content for estimation cost rejection to procurement"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        
        materials_table = ""
        for i, mat in enumerate(materials_data, 1):
            materials_table += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{i}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('category', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('description', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('specification', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
            </tr>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="format-detection" content="telephone=no">
            <title>Purchase Request Rejected by Estimation (Cost)</title>
            <style>
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
                    max-width: 800px !important;
                    margin: 0 auto !important;
                    background-color: #ffffff !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                    overflow: hidden !important;
                }}
                .header {{
                    background-color: #dc3545 !important;
                    color: white !important;
                    padding: 20px !important;
                    text-align: center !important;
                }}
                .header h2 {{
                    margin: 0 !important;
                    font-size: 24px !important;
                    font-weight: bold !important;
                }}
                .content {{
                    padding: 20px !important;
                }}
                .content p {{
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                    margin-bottom: 15px !important;
                }}
                h3 {{
                    color: #dc3545 !important;
                    font-size: 18px !important;
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                }}
                .rejection-reason {{
                    background-color: #f8d7da !important;
                    border: 1px solid #f5c6cb !important;
                    color: #721c24 !important;
                    padding: 15px !important;
                    border-radius: 5px !important;
                    margin: 15px 0 !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 15px 0 !important;
                    font-size: 12px !important;
                }}
                table th {{
                    background-color: #243d8a !important;
                    color: white !important;
                    padding: 10px 8px !important;
                    text-align: left !important;
                    font-weight: bold !important;
                    border: 1px solid #ddd !important;
                }}
                table td {{
                    padding: 8px !important;
                    border: 1px solid #ddd !important;
                    text-align: left !important;
                }}
                .total-cost {{
                    background-color: #f0f4ff !important;
                    font-weight: bold !important;
                    font-size: 16px !important;
                    padding: 15px !important;
                    text-align: center !important;
                    border: 2px solid #243d8a !important;
                    margin: 20px 0 !important;
                }}
                .signature {{
                    margin-top: 20px !important;
                    font-size: 14px !important;
                    color: #666 !important;
                }}
                .footer {{
                    background-color: #f8f9fa !important;
                    padding: 15px !important;
                    text-align: center !important;
                    font-size: 12px !important;
                    color: #666 !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{ padding: 5px !important; }}
                    .email-container {{ margin: 0 !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; }}
                    .header {{ padding: 10px !important; }}
                    .header h2 {{ font-size: 16px !important; }}
                    .content {{ padding: 10px !important; }}
                    .content p {{ font-size: 13px !important; }}
                    h3 {{ font-size: 14px !important; margin-top: 15px !important; margin-bottom: 8px !important; }}
                    table {{ min-width: 500px !important; }}
                    table th, table td {{ padding: 6px 4px !important; font-size: 11px !important; }}
                    .total-cost {{ font-size: 13px !important; padding: 8px !important; }}
                    .signature {{ font-size: 13px !important; margin-top: 15px !important; }}
                    .footer {{ padding: 8px !important; font-size: 11px !important; }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    .header h2 {{ font-size: 14px !important; }}
                    .content p {{ font-size: 12px !important; }}
                    h3 {{ font-size: 13px !important; }}
                    table {{ min-width: 400px !important; }}
                    table th, table td {{ padding: 4px 2px !important; font-size: 10px !important; }}
                    .total-cost {{ font-size: 12px !important; padding: 6px !important; }}
                }}
                
                @media only screen and (max-width: 320px) {{
                    table {{ min-width: 300px !important; }}
                    table th, table td {{ padding: 3px 1px !important; font-size: 9px !important; }}
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h2>Purchase Request Rejected by Estimation (Cost)</h2>
                </div>
                <div class="content">
                    <p>Dear Procurement Team,</p>
                    <p>The Estimation team has rejected the following purchase request due to cost-related issues:</p>
                    
                    <h3>Purchase Request Details</h3>
                    <p><strong>Request ID:</strong> #{purchase_data.get('purchase_id')}</p>
                    <p><strong>Requested By:</strong> {requester_info.get('full_name', 'N/A')}</p>
                    <p><strong>Site Location:</strong> {purchase_data.get('site_location', 'N/A')}</p>
                    <p><strong>Date:</strong> {purchase_data.get('date', 'N/A')}</p>
                    <p><strong>Project ID:</strong> {purchase_data.get('project_id', 'N/A')}</p>
                    <p><strong>Purpose:</strong> {purchase_data.get('purpose', 'N/A')}</p>
                    
                    <h3>Cost Rejection Reason</h3>
                    <div class="rejection-reason">
                        <strong>Rejection Type:</strong> Cost Rejection<br>
                        <strong>Reason:</strong> {rejection_reason}
                    </div>
                    
                    <h3>Materials List</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Specification</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Unit Cost</th>
                                    <th>Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials_table}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="total-cost">
                        <strong>Overall Total Cost: ${total_cost:.2f}</strong>
                    </div>
                    
                    <h3>Estimation Team Decision</h3>
                    <p><strong>Rejected By:</strong> {estimation_info.get('full_name', 'N/A')}</p>
                    <p><strong>Role:</strong> {estimation_info.get('role', 'N/A')}</p>
                    
                    <p>Please review the cost-related issues and revise the purchase request accordingly.</p>
                    
                    <div class="signature">
                        <p>Best regards,<br>
                        Estimation Team<br>
                        ERP System</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated email from the ERP system. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _generate_estimation_cost_rejection_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                                      requester_info: Dict, estimation_info: Dict, rejection_reason: str) -> str:
        """Generate text email content for estimation cost rejection to procurement"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        
        materials_text = ""
        for i, mat in enumerate(materials_data, 1):
            materials_text += f"{i}. {mat.get('category', 'N/A')} - {mat.get('description', 'N/A')}\n"
            materials_text += f"   Specification: {mat.get('specification', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: ${mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: ${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
        return f"""
Purchase Request Rejected by Estimation (Cost)

Dear Procurement Team,

The Estimation team has rejected the following purchase request due to cost-related issues:

Purchase Request Details:
- Request ID: #{purchase_data.get('purchase_id')}
- Requested By: {requester_info.get('full_name', 'N/A')}
- Site Location: {purchase_data.get('site_location', 'N/A')}
- Date: {purchase_data.get('date', 'N/A')}
- Project ID: {purchase_data.get('project_id', 'N/A')}
- Purpose: {purchase_data.get('purpose', 'N/A')}

Cost Rejection Reason:
- Rejection Type: Cost Rejection
- Reason: {rejection_reason}

Materials List:
{materials_text}

Overall Total Cost: ${total_cost:.2f}

Estimation Team Decision:
- Rejected By: {estimation_info.get('full_name', 'N/A')}
- Role: {estimation_info.get('role', 'N/A')}

Please review the cost-related issues and revise the purchase request accordingly.

Best regards,
Estimation Team
ERP System

This is an automated email from the ERP system.
        """

    def _generate_estimation_pm_flag_rejection_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                                         requester_info: Dict, estimation_info: Dict, rejection_reason: str) -> str:
        """Generate HTML email content for estimation PM flag rejection to project manager"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_table = ""
        for i, mat in enumerate(materials_data, 1):
            materials_table += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{i}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('category', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('description', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('specification', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
            </tr>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="format-detection" content="telephone=no">
            <title>Purchase Request Rejected by Estimation (PM Flag)</title>
            <style>
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
                    max-width: 800px !important;
                    margin: 0 auto !important;
                    background-color: #ffffff !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                    overflow: hidden !important;
                }}
                .header {{
                    background-color: #ffc107 !important;
                    color: #212529 !important;
                    padding: 20px !important;
                    text-align: center !important;
                }}
                .header h2 {{
                    margin: 0 !important;
                    font-size: 24px !important;
                    font-weight: bold !important;
                }}
                .content {{
                    padding: 20px !important;
                }}
                .content p {{
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                    margin-bottom: 15px !important;
                }}
                h3 {{
                    color: #ffc107 !important;
                    font-size: 18px !important;
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                }}
                .rejection-reason {{
                    background-color: #fff3cd !important;
                    border: 1px solid #ffeaa7 !important;
                    color: #856404 !important;
                    padding: 15px !important;
                    border-radius: 5px !important;
                    margin: 15px 0 !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 15px 0 !important;
                    font-size: 12px !important;
                }}
                table th {{
                    background-color: #243d8a !important;
                    color: white !important;
                    padding: 10px 8px !important;
                    text-align: left !important;
                    font-weight: bold !important;
                    border: 1px solid #ddd !important;
                }}
                table td {{
                    padding: 8px !important;
                    border: 1px solid #ddd !important;
                    text-align: left !important;
                }}
                .total-cost {{
                    background-color: #f0f4ff !important;
                    font-weight: bold !important;
                    font-size: 16px !important;
                    padding: 15px !important;
                    text-align: center !important;
                    border: 2px solid #243d8a !important;
                    margin: 20px 0 !important;
                }}
                .signature {{
                    margin-top: 20px !important;
                    font-size: 14px !important;
                    color: #666 !important;
                }}
                .footer {{
                    background-color: #f8f9fa !important;
                    padding: 15px !important;
                    text-align: center !important;
                    font-size: 12px !important;
                    color: #666 !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{ padding: 5px !important; }}
                    .email-container {{ margin: 0 !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; }}
                    .header {{ padding: 10px !important; }}
                    .header h2 {{ font-size: 16px !important; }}
                    .content {{ padding: 10px !important; }}
                    .content p {{ font-size: 13px !important; }}
                    h3 {{ font-size: 14px !important; margin-top: 15px !important; margin-bottom: 8px !important; }}
                    table {{ min-width: 500px !important; }}
                    table th, table td {{ padding: 6px 4px !important; font-size: 11px !important; }}
                    .total-cost {{ font-size: 13px !important; padding: 8px !important; }}
                    .signature {{ font-size: 13px !important; margin-top: 15px !important; }}
                    .footer {{ padding: 8px !important; font-size: 11px !important; }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    .header h2 {{ font-size: 14px !important; }}
                    .content p {{ font-size: 12px !important; }}
                    h3 {{ font-size: 13px !important; }}
                    table {{ min-width: 400px !important; }}
                    table th, table td {{ padding: 4px 2px !important; font-size: 10px !important; }}
                    .total-cost {{ font-size: 12px !important; padding: 6px !important; }}
                }}
                
                @media only screen and (max-width: 320px) {{
                    table {{ min-width: 300px !important; }}
                    table th, table td {{ padding: 3px 1px !important; font-size: 9px !important; }}
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h2>Purchase Request Rejected by Estimation (PM Flag)</h2>
                </div>
                <div class="content">
                    <p>Dear Project Manager,</p>
                    <p>The Estimation team has flagged the following purchase request for your review:</p>
                    
                    <h3>Purchase Request Details</h3>
                    <p><strong>Request ID:</strong> #{purchase_data.get('purchase_id')}</p>
                    <p><strong>Requested By:</strong> {requester_info.get('full_name', 'N/A')}</p>
                    <p><strong>Site Location:</strong> {purchase_data.get('site_location', 'N/A')}</p>
                    <p><strong>Date:</strong> {purchase_data.get('date', 'N/A')}</p>
                    <p><strong>Project Name:</strong> {project.project_name if project else 'N/A'}</p>
                    <p><strong>Purpose:</strong> {purchase_data.get('purpose', 'N/A')}</p>
                    
                    <h3>PM Flag Reason</h3>
                    <div class="rejection-reason">
                        <strong>Rejection Type:</strong> PM Flag<br>
                        <strong>Reason:</strong> {rejection_reason}
                    </div>
                    
                    <h3>Materials List</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Specification</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Unit Cost</th>
                                    <th>Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials_table}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="total-cost">
                        <strong>Overall Total Cost: ${total_cost:.2f}</strong>
                    </div>
                    
                    <h3>Estimation Team Decision</h3>
                    <p><strong>Flagged By:</strong> {estimation_info.get('full_name', 'N/A')}</p>
                    <p><strong>Role:</strong> {estimation_info.get('role', 'N/A')}</p>
                    
                    <p>Please review the flagged issues and provide your guidance.</p>
                    
                    <div class="signature">
                        <p>Best regards,<br>
                        Estimation Team<br>
                        ERP System</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated email from the ERP system. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _generate_estimation_pm_flag_rejection_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                                         requester_info: Dict, estimation_info: Dict, rejection_reason: str) -> str:
        """Generate text email content for estimation PM flag rejection to project manager"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_text = ""
        for i, mat in enumerate(materials_data, 1):
            materials_text += f"{i}. {mat.get('category', 'N/A')} - {mat.get('description', 'N/A')}\n"
            materials_text += f"   Specification: {mat.get('specification', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: ${mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: ${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
        return f"""
Purchase Request Rejected by Estimation (PM Flag)

Dear Project Manager,

The Estimation team has flagged the following purchase request for your review:

Purchase Request Details:
- Request ID: #{purchase_data.get('purchase_id')}
- Requested By: {requester_info.get('full_name', 'N/A')}
- Site Location: {purchase_data.get('site_location', 'N/A')}
- Date: {purchase_data.get('date', 'N/A')}
- Project Name: {project.project_name if project else 'N/A'}
- Purpose: {purchase_data.get('purpose', 'N/A')}

PM Flag Reason:
- Rejection Type: PM Flag
- Reason: {rejection_reason}

Materials List:
{materials_text}

Overall Total Cost: ${total_cost:.2f}

Estimation Team Decision:
- Flagged By: {estimation_info.get('full_name', 'N/A')}
- Role: {estimation_info.get('role', 'N/A')}

Please review the flagged issues and provide your guidance.

Best regards,
Estimation Team
ERP System

This is an automated email from the ERP system.
    """

    def send_technical_director_to_accounts_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                                       requester_info: Dict, technical_director_info: Dict) -> bool:
        """Send notification from Technical Director to Accounts department"""
        try:
            # Get accounts team emails
            recipients = self.get_accounts_team_emails()
            print("accounts recipients:", recipients)
            
            if not recipients:
                log.error("No accounts team emails found")
                return False
            
            subject = f"Purchase Request Approved by Technical Director - Ready for Payment Processing - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_technical_director_to_accounts_email_html(purchase_data, materials_data, requester_info, technical_director_info)
            text_content = self._generate_technical_director_to_accounts_email_text(purchase_data, materials_data, requester_info, technical_director_info)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"Email sent to {len(recipients)} accounts member(s)")
            return success
        except Exception as e:
            log.error(f"Error sending technical director to accounts notification: {str(e)}")
            return False

    def send_technical_director_rejection_to_estimation(self, purchase_data: Dict, materials_data: List[Dict],
                                                      requester_info: Dict, technical_director_info: Dict, rejection_reason: str) -> bool:
        """Send rejection notification from Technical Director back to Estimation team"""
        try:
            # Get estimation team emails
            recipients = self.get_estimation_team_emails()
            print("estimation recipients for technical director rejection:", recipients)
            
            if not recipients:
                log.error("No estimation team emails found")
                return False
            
            subject = f"Purchase Request Rejected by Technical Director - Requires Estimation Review - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_technical_director_rejection_email_html(purchase_data, materials_data, requester_info, technical_director_info, rejection_reason)
            text_content = self._generate_technical_director_rejection_email_text(purchase_data, materials_data, requester_info, technical_director_info, rejection_reason)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                print(f"Technical director rejection email sent to {len(recipients)} estimation member(s)")
            return success
        except Exception as e:
            log.error(f"Error sending technical director rejection to estimation: {str(e)}")
            return False

    def get_accounts_team_emails(self) -> List[str]:
        """Get all accounts team email addresses"""
        try:
            from models.user import User
            from models.role import Role
            
            accounts_role = Role.query.filter_by(role='accounts', is_deleted=False).first()
            if not accounts_role:
                return None
            
            users = User.query.filter_by(
                role_id=accounts_role.role_id,
                is_deleted=False,
                is_active=True
            ).all()

            emails = [u.email for u in users if u.email]
            print("accounts team emails:", emails)
            return emails if emails else None
        except Exception as e:
            log.error(f"Error fetching accounts team emails: {str(e)}")
            return None

    def _generate_technical_director_to_accounts_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                                          requester_info: Dict, technical_director_info: Dict) -> str:
        """Generate HTML email content for technical director to accounts notification"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_table = ""
        for i, mat in enumerate(materials_data, 1):
            materials_table += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{i}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('category', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('description', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('specification', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
            </tr>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Purchase Request Approved by Technical Director</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px;">Purchase Request Approved by Technical Director</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Ready for Payment Processing</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #495057; margin-top: 0;">Purchase Request Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; font-weight: bold; width: 30%;">Request ID:</td>
                        <td style="padding: 8px;">#{purchase_data.get('purchase_id')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Requested By:</td>
                        <td style="padding: 8px;">{requester_info.get('full_name', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Site Location:</td>
                        <td style="padding: 8px;">{purchase_data.get('site_location', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Date:</td>
                        <td style="padding: 8px;">{purchase_data.get('date', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Project Name:</td>
                        <td style="padding: 8px;">{project.project_name if project else 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Purpose:</td>
                        <td style="padding: 8px;">{purchase_data.get('purpose', 'N/A')}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #2d5a2d; margin-top: 0;">Technical Director Approval</h2>
                <p style="margin: 0; font-weight: bold;">✅ This purchase request has been approved by the Technical Director and is ready for payment processing.</p>
                <p style="margin: 10px 0 0 0;"><strong>Approved By:</strong> {technical_director_info.get('full_name', 'N/A')}</p>
                <p style="margin: 5px 0 0 0;"><strong>Role:</strong> {technical_director_info.get('role', 'N/A')}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #495057; margin-top: 0;">Materials List</h2>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">#</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Category</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Description</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Specification</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Unit</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Unit Cost</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials_table}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8f9fa; font-weight: bold;">
                            <td colspan="7" style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Cost:</td>
                            <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${total_cost:.2f}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; margin-top: 0;">Next Steps</h3>
                <p style="margin: 0; color: #856404;">Please process the payment for this approved purchase request. All technical requirements have been verified and approved.</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">This is an automated email from the ERP system.</p>
                <p style="color: #666; font-size: 14px;">Please do not reply to this email.</p>
            </div>
        </body>
        </html>
        """

    def _generate_technical_director_to_accounts_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                                          requester_info: Dict, technical_director_info: Dict) -> str:
        """Generate text email content for technical director to accounts notification"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_text = ""
        for i, mat in enumerate(materials_data, 1):
            materials_text += f"{i}. {mat.get('category', 'N/A')} - {mat.get('description', 'N/A')}\n"
            materials_text += f"   Specification: {mat.get('specification', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: ${mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: ${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
        return f"""
Purchase Request Approved by Technical Director

Dear Accounts Team,

The following purchase request has been approved by the Technical Director and is ready for payment processing:

Purchase Request Details:
- Request ID: #{purchase_data.get('purchase_id')}
- Requested By: {requester_info.get('full_name', 'N/A')}
- Site Location: {purchase_data.get('site_location', 'N/A')}
- Date: {purchase_data.get('date', 'N/A')}
- Project Name: {project.project_name if project else 'N/A'}
- Purpose: {purchase_data.get('purpose', 'N/A')}

Technical Director Approval:
- Approved By: {technical_director_info.get('full_name', 'N/A')}
- Role: {technical_director_info.get('role', 'N/A')}

Materials List:
{materials_text}

Overall Total Cost: ${total_cost:.2f}

Next Steps:
Please process the payment for this approved purchase request. All technical requirements have been verified and approved.

Best regards,
Technical Director
ERP System

This is an automated email from the ERP system.
    """

    def _generate_technical_director_rejection_email_html(self, purchase_data: Dict, materials_data: List[Dict],
                                                        requester_info: Dict, technical_director_info: Dict, rejection_reason: str) -> str:
        """Generate HTML email content for technical director rejection to estimation"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_table = ""
        for i, mat in enumerate(materials_data, 1):
            materials_table += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{i}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('category', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('description', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('specification', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
            </tr>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Purchase Request Rejected by Technical Director</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px;">Purchase Request Rejected by Technical Director</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Requires Estimation Review</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #495057; margin-top: 0;">Purchase Request Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; font-weight: bold; width: 30%;">Request ID:</td>
                        <td style="padding: 8px;">#{purchase_data.get('purchase_id')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Requested By:</td>
                        <td style="padding: 8px;">{requester_info.get('full_name', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Site Location:</td>
                        <td style="padding: 8px;">{purchase_data.get('site_location', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Date:</td>
                        <td style="padding: 8px;">{purchase_data.get('date', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Project Name:</td>
                        <td style="padding: 8px;">{project.project_name if project else 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Purpose:</td>
                        <td style="padding: 8px;">{purchase_data.get('purpose', 'N/A')}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #721c24; margin-top: 0;">Technical Director Rejection</h2>
                <p style="margin: 0; font-weight: bold;">❌ This purchase request has been rejected by the Technical Director.</p>
                <p style="margin: 10px 0 0 0;"><strong>Rejected By:</strong> {technical_director_info.get('full_name', 'N/A')}</p>
                <p style="margin: 5px 0 0 0;"><strong>Role:</strong> {technical_director_info.get('role', 'N/A')}</p>
                <p style="margin: 10px 0 0 0;"><strong>Rejection Reason:</strong> {rejection_reason}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #495057; margin-top: 0;">Materials List</h2>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">#</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Category</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Description</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Specification</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Unit</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Unit Cost</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials_table}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8f9fa; font-weight: bold;">
                            <td colspan="7" style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Cost:</td>
                            <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${total_cost:.2f}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; margin-top: 0;">Next Steps</h3>
                <p style="margin: 0; color: #856404;">Please review the rejection reason and make necessary corrections to the purchase request before resubmitting.</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">This is an automated email from the ERP system.</p>
                <p style="color: #666; font-size: 14px;">Please do not reply to this email.</p>
            </div>
        </body>
        </html>
        """

    def _generate_technical_director_rejection_email_text(self, purchase_data: Dict, materials_data: List[Dict],
                                                        requester_info: Dict, technical_director_info: Dict, rejection_reason: str) -> str:
        """Generate text email content for technical director rejection to estimation"""
        total_cost = sum((mat.get('quantity', 0) * mat.get('cost', 0)) for mat in materials_data)
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        materials_text = ""
        for i, mat in enumerate(materials_data, 1):
            materials_text += f"{i}. {mat.get('category', 'N/A')} - {mat.get('description', 'N/A')}\n"
            materials_text += f"   Specification: {mat.get('specification', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: ${mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: ${(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
        return f"""
Purchase Request Rejected by Technical Director

Dear Estimation Team,

The following purchase request has been rejected by the Technical Director and requires your review:

Purchase Request Details:
- Request ID: #{purchase_data.get('purchase_id')}
- Requested By: {requester_info.get('full_name', 'N/A')}
- Site Location: {purchase_data.get('site_location', 'N/A')}
- Date: {purchase_data.get('date', 'N/A')}
- Project Name: {project.project_name if project else 'N/A'}
- Purpose: {purchase_data.get('purpose', 'N/A')}

Technical Director Rejection:
- Rejected By: {technical_director_info.get('full_name', 'N/A')}
- Role: {technical_director_info.get('role', 'N/A')}
- Rejection Reason: {rejection_reason}

Materials List:
{materials_text}

Overall Total Cost: ${total_cost:.2f}

Next Steps:
Please review the rejection reason and make necessary corrections to the purchase request before resubmitting.

Best regards,
Technical Director
ERP System

This is an automated email from the ERP system.
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

    def send_payment_processing_notification(self, purchase_id: int, amount: float, 
                                           payment_method: str, processed_by: str) -> bool:
        """Send notification when payment processing starts"""
        try:
            # Get technical director emails
            recipients = self.get_technical_director_emails()
            subject = f"Payment Processing Started - Purchase Request #{purchase_id}"
            
            html_content = f"""
            <html>
            <body>
                <h2>Payment Processing Notification</h2>
                <p>Payment processing has been initiated for the following purchase request:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                    <p><strong>Purchase Request ID:</strong> {purchase_id}</p>
                    <p><strong>Amount:</strong> AED {amount:,.2f}</p>
                    <p><strong>Payment Method:</strong> {payment_method}</p>
                    <p><strong>Processed By:</strong> {processed_by}</p>
                    <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <p>Please monitor the payment status and ensure all approvals are in place.</p>
                
                <p>Best regards,<br>Accounts Department</p>
            </body>
            </html>
            """
            
            text_content = f"""
            Payment Processing Notification
            
            Payment processing has been initiated for Purchase Request #{purchase_id}:
            
            Amount: AED {amount:,.2f}
            Payment Method: {payment_method}
            Processed By: {processed_by}
            Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            Please monitor the payment status and ensure all approvals are in place.
            
            Best regards,
            Accounts Department
            """

            return self._send_email(recipients, subject, html_content, text_content)
        except Exception as e:
            log.error(f"Error sending payment processing notification: {str(e)}")
            return False

    def send_payment_approved_notification(self, purchase_id: int, transaction_id: int, 
                                         amount: float, approved_by: str) -> bool:
        """Send notification when payment is approved and processed"""
        try:
            # Get all relevant stakeholders
            recipients = self.get_technical_director_emails() + self.get_procurement_team_emails()
            subject = f"Payment Approved and Processed - Purchase Request #{purchase_id}"
            
            html_content = f"""
            <html>
            <body>
                <h2>Payment Approved and Processed</h2>
                <p>The following payment has been approved and processed:</p>
                
                <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #28a745;">
                    <p><strong>Purchase Request ID:</strong> {purchase_id}</p>
                    <p><strong>Transaction ID:</strong> {transaction_id}</p>
                    <p><strong>Amount:</strong> AED {amount:,.2f}</p>
                    <p><strong>Approved By:</strong> {approved_by}</p>
                    <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>
                
                <p>The payment transaction is now complete and ready for acknowledgement.</p>
                
                <p>Best regards,<br>Accounts Department</p>
            </body>
            </html>
            """
            
            text_content = f"""
            Payment Approved and Processed
            
            The following payment has been approved and processed:
            
            Purchase Request ID: {purchase_id}
            Transaction ID: {transaction_id}
            Amount: AED {amount:,.2f}
            Approved By: {approved_by}
            Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            
            The payment transaction is now complete and ready for acknowledgement.
            
            Best regards,
            Accounts Department
            """

            return self._send_email(recipients, subject, html_content, text_content)
        except Exception as e:
            log.error(f"Error sending payment approved notification: {str(e)}")
            return False

    def send_acknowledgement_notification(self, purchase_id: int, acknowledgement_type: str,
                                        acknowledged_by: str, message: str) -> bool:
        """Send notification when acknowledgement is received"""
        try:
            # Get accounts team emails
            recipients = self.get_accounts_team_emails()
            subject = f"Acknowledgement Received - Purchase Request #{purchase_id}"
            
            html_content = f"""
            <html>
            <body>
                <h2>Acknowledgement Received</h2>
                <p>An acknowledgement has been received for the following purchase request:</p>
                
                <div style="background-color: #cce5ff; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #007bff;">
                    <p><strong>Purchase Request ID:</strong> {purchase_id}</p>
                    <p><strong>Acknowledgement Type:</strong> {acknowledgement_type}</p>
                    <p><strong>Acknowledged By:</strong> {acknowledged_by}</p>
                    <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    <p><strong>Message:</strong> {message}</p>
                </div>
                
                <p>This completes the payment workflow for this purchase request.</p>
                
                <p>Best regards,<br>System Notification</p>
            </body>
            </html>
            """
            
            text_content = f"""
            Acknowledgement Received
            
            An acknowledgement has been received for Purchase Request #{purchase_id}:
            
            Acknowledgement Type: {acknowledgement_type}
            Acknowledged By: {acknowledged_by}
            Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            Message: {message}
            
            This completes the payment workflow for this purchase request.
            
            Best regards,
            System Notification
            """

            return self._send_email(recipients, subject, html_content, text_content)
        except Exception as e:
            log.error(f"Error sending acknowledgement notification: {str(e)}")
            return False

    def get_accounts_team_emails(self) -> List[str]:
        """Get emails of all accounts team members"""
        try:
            accounts_role = Role.query.filter_by(role='accounts', is_deleted=False).first()
            if not accounts_role:
                return []
            
            accounts_users = User.query.filter_by(
                role_id=accounts_role.role_id, 
                is_active=True, 
                is_deleted=False
            ).all()
            
            return [user.email for user in accounts_users if user.email]
        except Exception as e:
            log.error(f"Error getting accounts team emails: {str(e)}")
            return []
