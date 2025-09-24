import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email import encoders
from email.header import Header
from email.utils import formataddr
from datetime import datetime
from typing import List, Dict

from models.project import Project
from config.logging import get_logger
from models.user import User
from models.role import Role

log = get_logger()

class EmailService:
    def __init__(self):
        self.sender_email = os.getenv("SENDER_EMAIL")
        self.sender_password = os.getenv("SENDER_EMAIL_PASSWORD")
        # Prefer EMAIL_SENDER_NAME, fallback to SENDER_NAME, then default
        self.sender_name = os.getenv("EMAIL_SENDER_NAME") or os.getenv("SENDER_NAME") or "Meter Square"
        
        # Get SMTP configuration from environment variables
        self.smtp_server = os.getenv("EMAIL_HOST", "smtp.office365.com")
        self.smtp_port = int(os.getenv("EMAIL_PORT", "587"))
        self.use_tls = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"

        if not self.sender_email or not self.sender_password:
            raise ValueError("Email service not properly configured")

    def _create_connection(self):
        """Create secure SMTP connection with proper error handling"""
        try:
            if self.use_tls:
                # Use STARTTLS (for Office365, Gmail with port 587)
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30)
                server.ehlo()
                server.starttls()
                server.ehlo()
            else:
                # Use direct SSL (for Gmail with port 465)
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=30)
            
            # Set debug level for troubleshooting (remove in production)
            # server.set_debuglevel(1)
            
            server.login(self.sender_email, self.sender_password)
            return server
        except smtplib.SMTPAuthenticationError as e:
            log.error(f"SMTP Authentication failed: {str(e)}")
            raise Exception("Email authentication failed. Check credentials.")
        except smtplib.SMTPConnectError as e:
            log.error(f"SMTP Connection failed: {str(e)}")
            raise Exception("Failed to connect to email server. Check server and port settings.")
        except smtplib.SMTPException as e:
            log.error(f"SMTP error: {str(e)}")
            raise Exception("Failed to connect to email server.")
        except Exception as e:
            log.error(f"Unexpected email connection error: {str(e)}")
            raise Exception("Email service unavailable.")

    def _send_email(self, to_emails: List[str], subject: str, html_content: str,
                    text_content: str = None, attachments: List[Dict] = None) -> bool:
        """Send email with error handling and logging"""
        try:
            # Use 'related' type to support embedded images
            msg = MIMEMultipart('related')
            # Include display name "Meter Square" in From header with proper formatting
            msg['From'] = formataddr((str(Header(self.sender_name, 'utf-8')), self.sender_email))
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            msg['Date'] = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S +0000')
            
            # Create alternative part for text and HTML
            msg_alternative = MIMEMultipart('alternative')
            msg.attach(msg_alternative)

            if text_content:
                msg_alternative.attach(MIMEText(text_content, 'plain', 'utf-8'))

            msg_alternative.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # Attach logo image
            logo_attached = False
            try:
                logo_paths = [
                    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logo.png'),
                    os.path.join(os.getcwd(), 'logo.png'),
                    'C:\\Users\\developer\\Documents\\metersquare-ERP\\logo.png'
                ]
                
                for logo_path in logo_paths:
                    if os.path.exists(logo_path):
                        with open(logo_path, 'rb') as f:
                            logo_data = f.read()
                            logo = MIMEImage(logo_data, _subtype='png')
                            logo.add_header('Content-ID', '<logo>')
                            logo.add_header('Content-Disposition', 'inline', filename='logo.png')
                            msg.attach(logo)
                            logo_attached = True
                            break
                
                if not logo_attached:
                    log.warning("Logo file not found for email")
                    
            except Exception as e:
                log.error(f"Error attaching logo: {e}")

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
            return True
        except smtplib.SMTPRecipientsRefused as e:
            log.error(f"Recipients refused: {str(e)}")
            return False
        except smtplib.SMTPSenderRefused as e:
            log.error(f"Sender refused: {str(e)}")
            return False
        except smtplib.SMTPDataError as e:
            log.error(f"SMTP data error: {str(e)}")
            return False
        except Exception as e:
            log.error(f"Failed to send email to {to_emails}: {str(e)}")
            return False

    def _prepare_attachments(self, attachments: List) -> List[Dict]:
        """Normalize attachments into [{'filename': str, 'content': bytes}] from file paths or dicts.

        Acceptable forms per element:
        - str: treated as file path on the server
        - {'path': str, 'filename'?: str}
        - {'filename': str, 'content': bytes}
        """
        if not attachments:
            return None

        normalized: List[Dict] = []
        for item in attachments:
            try:
                # If dict with direct content
                if isinstance(item, dict) and 'content' in item and 'filename' in item:
                    normalized.append({'filename': item['filename'], 'content': item['content']})
                    continue

                # If dict specifying a path
                if isinstance(item, dict) and 'path' in item:
                    path = item.get('path')
                    if not path or not os.path.isfile(path):
                        continue
                    filename = item.get('filename') or os.path.basename(path)
                    with open(path, 'rb') as f:
                        content = f.read()
                    normalized.append({'filename': filename, 'content': content})
                    continue

                # If plain string path
                if isinstance(item, str):
                    path = item
                    if not os.path.isfile(path):
                        continue
                    filename = os.path.basename(path)
                    with open(path, 'rb') as f:
                        content = f.read()
                    normalized.append({'filename': filename, 'content': content})
                    continue

            except Exception as e:
                log.warning(f"Failed to load attachment {item}: {str(e)}")

        return normalized if normalized else None

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
        user_id = purchase_data.get('user_id')
        project = Project.query.filter_by(project_id=purchase_data['project_id']).first()
        user = None
        if user_id:
            user = User.query.filter_by(user_id=user_id).first()
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
                    <td>{qty}</td>
                    <td>{m.get('unit', '')}</td>
                    <td>{cost:.2f}</td>
                    <td>{total_cost:.2f}</td>
                </tr>
            """

        # Prepare variables for template
        project_name = project.project_name if project else 'N/A'
        return f"""
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="format-detection" content="telephone=no">
                <style>
                /* Base styles - Clean Blue and White Theme */
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
                    background-color: #f5f5f5 !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    color: #333333 !important;
                    width: 100% !important;
                    -webkit-text-size-adjust: 100% !important;
                    -ms-text-size-adjust: 100% !important;
                }}
                .email-container {{
                    max-width: 600px !important;
                    margin: 0 auto !important;
                    background: #ffffff !important;
                    border-radius: 8px !important;
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
                    width: 100% !important;
                }}
                .header {{
                    background: #4285f4 !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                    border-bottom: none !important;
                }}
                .header h2 {{
                    margin: 0 !important;
                    font-size: 18px !important;
                    font-weight: 600 !important;
                    color: #ffffff !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                }}
                .content {{
                    padding: 24px !important;
                    background: #ffffff !important;
                }}
                .content p {{
                    font-size: 14px !important;
                    margin: 8px 0 !important;
                    line-height: 1.5 !important;
                    word-wrap: break-word !important;
                    color: #333333 !important;
                }}
                .label {{
                    font-weight: 600 !important;
                    color: #333333 !important;
                    display: inline-block !important;
                    min-width: 110px !important;
                }}
                h3 {{
                    margin-top: 24px !important;
                    margin-bottom: 16px !important;
                    color: #333333 !important;
                    font-size: 16px !important;
                    font-weight: 600 !important;
                    border: none !important;
                    padding: 0 !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    margin-top: 10px !important;
                    margin-bottom: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                    border: 1px solid #e0e0e0 !important;
                    border-radius: 4px !important;
                    position: relative !important;
                    max-width: 100% !important;
                }}
                .table-scroll-wrapper {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                    scrollbar-width: thin !important;
                    scrollbar-color: #d1d5db #f3f4f6 !important;
                    max-width: 100% !important;
                }}
                .table-scroll-wrapper::-webkit-scrollbar {{
                    height: 6px !important;
                }}
                .table-scroll-wrapper::-webkit-scrollbar-track {{
                    background: #f3f4f6 !important;
                    border-radius: 3px !important;
                }}
                .table-scroll-wrapper::-webkit-scrollbar-thumb {{
                    background: #d1d5db !important;
                    border-radius: 3px !important;
                }}
                .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {{
                    background: #9ca3af !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    min-width: 500px !important;
                    background: #ffffff !important;
                    margin: 0 !important;
                }}
                table th {{
                    background: #4285f4 !important;
                    color: #ffffff !important;
                    padding: 10px 12px !important;
                    text-align: left !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    border: none !important;
                }}
                table td {{
                    padding: 10px 12px !important;
                    border-bottom: 1px solid #e0e0e0 !important;
                    font-size: 13px !important;
                    word-wrap: break-word !important;
                    background: #ffffff !important;
                    color: #333333 !important;
                }}
                table tr:last-child td {{
                    border-bottom: none !important;
                }}
                .total-cost {{
                    margin-top: 20px !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    background: #ffffff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 4px !important;
                    color: #243d8a !important;
                    padding: 10px !important;
                    background: #f5f9ff !important;
                    border-radius: 4px !important;
                }}
                .signature {{
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f8f9fa !important;
                    padding: 20px !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .company {{
                    color: #243d8a !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{
                        padding: 0 !important;
                        margin: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 15px 10px !important;
                    }}
                    .header h2 {{
                        font-size: 18px !important;
                    }}
                    .content {{
                        padding: 15px 10px !important;
                    }}
                    .content p {{
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                    }}
                    h3 {{
                        font-size: 15px !important;
                        margin-top: 20px !important;
                        margin-bottom: 10px !important;
                    }}
                    .table-container {{
                        margin-left: -10px !important;
                        margin-right: -10px !important;
                        padding: 0 !important;
                        border-radius: 0 !important;
                        border-left: none !important;
                        border-right: none !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        -webkit-overflow-scrolling: touch !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    .table-scroll-wrapper {{
                        min-width: 100% !important;
                        overflow-x: visible !important;
                    }}
                    .table-container::after {{
                        content: "← Swipe to see more →" !important;
                        display: block !important;
                        text-align: center !important;
                        font-size: 11px !important;
                        color: #666666 !important;
                        padding: 5px !important;
                        background: #f8f9fa !important;
                        position: sticky !important;
                        left: 0 !important;
                        right: 0 !important;
                    }}
                    table {{
                        min-width: 500px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                    }}
                    .total-cost {{
                        font-size: 14px !important;
                        padding: 10px !important;
                        margin: 10px !important;
                    }}
                    .signature {{
                        font-size: 13px !important;
                        margin-top: 20px !important;
                    }}
                    .footer {{
                        padding: 15px 10px !important;
                        font-size: 12px !important;
                    }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    body {{
                        padding: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 12px 8px !important;
                    }}
                    .header h2 {{
                        font-size: 16px !important;
                    }}
                    .content {{
                        padding: 12px 8px !important;
                    }}
                    .content p {{
                        font-size: 13px !important;
                        line-height: 1.5 !important;
                    }}
                    h3 {{
                        font-size: 14px !important;
                        margin-top: 16px !important;
                        margin-bottom: 8px !important;
                    }}
                    .table-container {{
                        margin-left: -8px !important;
                        margin-right: -8px !important;
                    }}
                    table {{
                        min-width: 450px !important;
                        font-size: 11px !important;
                    }}
                    table th {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                    }}
                    table td {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                        word-break: break-word !important;
                    }}
                    .total-cost {{
                        font-size: 13px !important;
                        padding: 8px !important;
                        margin: 8px !important;
                    }}
                    .signature {{
                        font-size: 12px !important;
                        margin-top: 16px !important;
                    }}
                    .footer {{
                        padding: 12px 8px !important;
                        font-size: 11px !important;
                    }}
                }}
                
                /* Additional mobile fixes for very small screens */
                @media only screen and (max-width: 320px) {{
                    .table-container {{
                        margin-left: -5px !important;
                        margin-right: -5px !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    table {{
                        min-width: 400px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                    }}
                    .header h2 {{
                        font-size: 14px !important;
                    }}
                    .content p {{
                        font-size: 12px !important;
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
                        <p><span class="label">Project Name:</span> {project_name}</p>
                        <p><span class="label">Site Location:</span> {purchase_data['site_location']}</p>
                        <p><span class="label">Date:</span> {purchase_data['date']}</p>
                        <p><span class="label">Requested By:</span> {requester_info['full_name']} ({requester_info['role']})</p>

                        <h3>Materials Requested</h3>
                        <div class="table-container">
                            <div class="table-scroll-wrapper">
                                <table>
                            <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Cost</th>
                                    <th>Total Cost</th>
                            </tr>
                            {material_rows}
                                </table>
                            </div>
                        </div>
                        
                        <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                            <span style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                            <span style="color: rgb(22, 163, 74) !important; font-size: 18px; font-weight: 700;">{overall_total:.2f}</span>
                        </div>

                        <div class="signature">
                            <p>Best regards,</p>
                            <strong>{user.full_name if user else requester_info['full_name']} Team</strong>
                        </div>
                    </div>
                    <div class="footer">
                        <p style="margin-bottom: 10px;">Thank you for using</p>
                        <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
                f"{idx:<5} | {m.get('category','N/A'):<12} |"
                f" | {qty:<8} | {m.get('unit',''):<6} | {cost:<10.2f} | {total_cost:<12.2f}"
            )

        # Table header
        header = (
            f"{'S.No':<5} | {'Category':<12} | "
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
                return []
            users = User.query.filter_by(
                role_id=pm_role.role_id,
                is_deleted=False,
                is_active=True
            ).all()
            emails = [u.email for u in users if u.email]
            if not emails:
                return []
            return emails
        except Exception as e:
            log.error(f"Error fetching project manager emails: {str(e)}", exc_info=True)
            return []

    def send_procurement_to_project_manager_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                                        requester_info: Dict, procurement_info: Dict) -> bool:
        """Send notification from procurement to project manager only"""
        try:
            recipients = self.get_project_manager_emails()
            if not recipients:
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
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
                    width: 100% !important;
                }}
                .header {{
                    background: #4285f4 !important;
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
                    color: #333333 !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #333333 !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #4285f4 !important;
                    display: inline-block !important;
                    padding-bottom: 4px !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    margin-top: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                    max-width: 100% !important;
                    position: relative !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    min-width: 600px !important;
                }}
                table th {{
                    background: #4285f4 !important;
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
                    margin-top: 20px !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    background: #ffffff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 4px !important;
                    color: #333333 !important;
                    padding: 10px !important;
                    background: #f5f9ff !important;
                    border-radius: 4px !important;
                }}
                .signature {{
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f8f9fa !important;
                    padding: 20px !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .company {{
                    color: #333333 !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                .approval-section {{
                    background: #e6f3ff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 6px !important;
                    padding: 15px !important;
                    margin: 20px 0 !important;
                }}
                .approval-section p {{
                    margin: 8px 0 !important;
                    color: #333333 !important;
                    font-size: 14px !important;
                }}
                .approval-section strong {{
                    color: #333333 !important;
                    font-weight: 600 !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{
                        padding: 0 !important;
                        margin: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 15px 10px !important;
                    }}
                    .header h2 {{
                        font-size: 18px !important;
                    }}
                    .content {{
                        padding: 15px 10px !important;
                    }}
                    .content p {{
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                    }}
                    h3 {{
                        font-size: 15px !important;
                        margin-top: 20px !important;
                        margin-bottom: 10px !important;
                    }}
                    .table-container {{
                        margin-left: -10px !important;
                        margin-right: -10px !important;
                        padding: 0 !important;
                        border-radius: 0 !important;
                        border-left: none !important;
                        border-right: none !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        -webkit-overflow-scrolling: touch !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    .table-scroll-wrapper {{
                        min-width: 100% !important;
                        overflow-x: visible !important;
                    }}
                    .table-container::after {{
                        content: "← Swipe to see more →" !important;
                        display: block !important;
                        text-align: center !important;
                        font-size: 11px !important;
                        color: #666666 !important;
                        padding: 5px !important;
                        background: #f8f9fa !important;
                        position: sticky !important;
                        left: 0 !important;
                        right: 0 !important;
                    }}
                    table {{
                        min-width: 500px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                    }}
                    .total-cost {{
                        font-size: 14px !important;
                        padding: 10px !important;
                        margin: 10px !important;
                    }}
                    .signature {{
                        font-size: 13px !important;
                        margin-top: 20px !important;
                    }}
                    .footer {{
                        padding: 15px 10px !important;
                        font-size: 12px !important;
                    }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    body {{
                        padding: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 12px 8px !important;
                    }}
                    .header h2 {{
                        font-size: 16px !important;
                    }}
                    .content {{
                        padding: 12px 8px !important;
                    }}
                    .content p {{
                        font-size: 13px !important;
                        line-height: 1.5 !important;
                    }}
                    h3 {{
                        font-size: 14px !important;
                        margin-top: 16px !important;
                        margin-bottom: 8px !important;
                    }}
                    .table-container {{
                        margin-left: -8px !important;
                        margin-right: -8px !important;
                    }}
                    table {{
                        min-width: 450px !important;
                        font-size: 11px !important;
                    }}
                    table th {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                    }}
                    table td {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                        word-break: break-word !important;
                    }}
                    .total-cost {{
                        font-size: 13px !important;
                        padding: 8px !important;
                        margin: 8px !important;
                    }}
                    .signature {{
                        font-size: 12px !important;
                        margin-top: 16px !important;
                    }}
                    .footer {{
                        padding: 12px 8px !important;
                        font-size: 11px !important;
                    }}
                }}
                
                /* Additional mobile fixes for very small screens */
                @media only screen and (max-width: 320px) {{
                    .table-container {{
                        margin-left: -5px !important;
                        margin-right: -5px !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    table {{
                        min-width: 400px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                    }}
                    .header h2 {{
                        font-size: 14px !important;
                    }}
                    .content p {{
                        font-size: 12px !important;
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
                            <div class="table-scroll-wrapper">
                                <table>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Cost</th>
                                    <th>Total Cost</th>
                                </tr>
                                {material_rows}
                                    </table>
                            </div>
                        </div>
                        
                        <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                            <span class="label" style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                            <span class="amount" style="color: rgb(22, 163, 74) !important; font-size: 18px; font-weight: 700;">{overall_total:.2f}</span>
                        </div>

                        <div class="signature">
                            <p>Please review and approve this purchase request.</p>
                            <p>Best regards,</p>
                            <strong>Procurement Team</strong>
                        </div>
                    </div>
                    <div class="footer">
                        <p style="margin-bottom: 10px;">Thank you for using</p>
                        <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
                f"{idx:<5} | {m.get('category','N/A'):<12} |"
                f" | {qty:<8} | {m.get('unit',''):<6} | {cost:<10.2f} | {total_cost:<12.2f}"
            )

        # Table header
        header = (
            f"{'S.No':<5} | {'Category':<12} | "
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
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
                    width: 100% !important;
                }}
                .header {{
                    background: #4285f4 !important;
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
                    color: #333333 !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #333333 !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #4285f4 !important;
                    display: inline-block !important;
                    padding-bottom: 4px !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    margin-top: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                    max-width: 100% !important;
                    position: relative !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    min-width: 600px !important;
                }}
                table th {{
                    background: #4285f4 !important;
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
                    margin-top: 20px !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    background: #ffffff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 4px !important;
                    color: #333333 !important;
                    padding: 10px !important;
                    background: #f5f9ff !important;
                    border-radius: 4px !important;
                }}
                .signature {{
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f8f9fa !important;
                    padding: 20px !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .company {{
                    color: #333333 !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                .approval-section {{
                    background: #e6f3ff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 6px !important;
                    padding: 15px !important;
                    margin: 20px 0 !important;
                }}
                .approval-section p {{
                    margin: 8px 0 !important;
                    color: #333333 !important;
                    font-size: 14px !important;
                }}
                .approval-section strong {{
                    color: #333333 !important;
                    font-weight: 600 !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{
                        padding: 0 !important;
                        margin: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 15px 10px !important;
                    }}
                    .header h2 {{
                        font-size: 18px !important;
                    }}
                    .content {{
                        padding: 15px 10px !important;
                    }}
                    .content p {{
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                    }}
                    h3 {{
                        font-size: 15px !important;
                        margin-top: 20px !important;
                        margin-bottom: 10px !important;
                    }}
                    .table-container {{
                        margin-left: -10px !important;
                        margin-right: -10px !important;
                        padding: 0 !important;
                        border-radius: 0 !important;
                        border-left: none !important;
                        border-right: none !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        -webkit-overflow-scrolling: touch !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    .table-scroll-wrapper {{
                        min-width: 100% !important;
                        overflow-x: visible !important;
                    }}
                    .table-container::after {{
                        content: "← Swipe to see more →" !important;
                        display: block !important;
                        text-align: center !important;
                        font-size: 11px !important;
                        color: #666666 !important;
                        padding: 5px !important;
                        background: #f8f9fa !important;
                        position: sticky !important;
                        left: 0 !important;
                        right: 0 !important;
                    }}
                    table {{
                        min-width: 500px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                    }}
                    .total-cost {{
                        font-size: 14px !important;
                        padding: 10px !important;
                        margin: 10px !important;
                    }}
                    .signature {{
                        font-size: 13px !important;
                        margin-top: 20px !important;
                    }}
                    .footer {{
                        padding: 15px 10px !important;
                        font-size: 12px !important;
                    }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    body {{
                        padding: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 12px 8px !important;
                    }}
                    .header h2 {{
                        font-size: 16px !important;
                    }}
                    .content {{
                        padding: 12px 8px !important;
                    }}
                    .content p {{
                        font-size: 13px !important;
                        line-height: 1.5 !important;
                    }}
                    h3 {{
                        font-size: 14px !important;
                        margin-top: 16px !important;
                        margin-bottom: 8px !important;
                    }}
                    .table-container {{
                        margin-left: -8px !important;
                        margin-right: -8px !important;
                    }}
                    table {{
                        min-width: 450px !important;
                        font-size: 11px !important;
                    }}
                    table th {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                    }}
                    table td {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                        word-break: break-word !important;
                    }}
                    .total-cost {{
                        font-size: 13px !important;
                        padding: 8px !important;
                        margin: 8px !important;
                    }}
                    .signature {{
                        font-size: 12px !important;
                        margin-top: 16px !important;
                    }}
                    .footer {{
                        padding: 12px 8px !important;
                        font-size: 11px !important;
                    }}
                }}
                
                /* Additional mobile fixes for very small screens */
                @media only screen and (max-width: 320px) {{
                    .table-container {{
                        margin-left: -5px !important;
                        margin-right: -5px !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    table {{
                        min-width: 400px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                    }}
                    .header h2 {{
                        font-size: 14px !important;
                    }}
                    .content p {{
                        font-size: 12px !important;
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
                            <div class="table-scroll-wrapper">
                                <table>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Cost</th>
                                    <th>Total Cost</th>
                                </tr>
                                {material_rows}
                                    </table>
                            </div>
                        </div>
                        
                        <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                            <span class="label" style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                            <span class="amount" style="color: rgb(22, 163, 74) !important; font-size: 18px; font-weight: 700;">{overall_total:.2f}</span>
                        </div>

                        <div class="signature">
                            <p>Please proceed with cost estimation for this purchase request.</p>
                            <p>Best regards,</p>
                            <strong>Project Manager</strong>
                        </div>
                    </div>
                    <div class="footer">
                        <p style="margin-bottom: 10px;">Thank you for using</p>
                        <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
                f"{idx:<5} | {m.get('category','N/A'):<12} |"
                f" | {qty:<8} | {m.get('unit',''):<6} | {cost:<10.2f} | {total_cost:<12.2f}"
            )

        # Table header
        header = (
            f"{'S.No':<5} | {'Category':<12} | "
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
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
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
                    color: #333333 !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #333333 !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #333333 !important;
                    display: inline-block !important;
                    padding-bottom: 4px !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    margin-top: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                    max-width: 100% !important;
                    position: relative !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    min-width: 600px !important;
                }}
                table th {{
                    background: #dc2626 !important;
                    color: white !important;
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
                    margin-top: 20px !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    background: #ffffff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 4px !important;
                    color: #333333 !important;
                    padding: 10px !important;
                    background: #f5f9ff !important;
                    border-radius: 4px !important;
                }}
                .signature {{
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f8f9fa !important;
                    padding: 20px !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .company {{
                    color: #333333 !important;
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
                .rejection-section p {{
                    color: #333333 !important;
                    margin: 8px 0 !important;
                }}
                .rejection-section strong {{
                    color: #333333 !important;
                }}
                
                /* Mobile Responsive - Enhanced */
                @media only screen and (max-width: 600px) {{
                    body {{
                        padding: 0 !important;
                        margin: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 15px 10px !important;
                    }}
                    .header h2 {{
                        font-size: 18px !important;
                    }}
                    .content {{
                        padding: 15px 10px !important;
                    }}
                    .content p {{
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                    }}
                    h3 {{
                        font-size: 15px !important;
                        margin-top: 20px !important;
                        margin-bottom: 10px !important;
                    }}
                    .table-container {{
                        margin-left: -10px !important;
                        margin-right: -10px !important;
                        padding: 0 !important;
                        border-radius: 0 !important;
                        border-left: none !important;
                        border-right: none !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        -webkit-overflow-scrolling: touch !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    .table-scroll-wrapper {{
                        min-width: 100% !important;
                        overflow-x: visible !important;
                    }}
                    .table-container::after {{
                        content: "← Swipe to see more →" !important;
                        display: block !important;
                        text-align: center !important;
                        font-size: 11px !important;
                        color: #666666 !important;
                        padding: 5px !important;
                        background: #f8f9fa !important;
                        position: sticky !important;
                        left: 0 !important;
                        right: 0 !important;
                    }}
                    table {{
                        min-width: 500px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 8px 6px !important;
                        font-size: 12px !important;
                    }}
                    .total-cost {{
                        font-size: 14px !important;
                        padding: 10px !important;
                        margin: 10px !important;
                    }}
                    .signature {{
                        font-size: 13px !important;
                        margin-top: 20px !important;
                    }}
                    .footer {{
                        padding: 15px 10px !important;
                        font-size: 12px !important;
                    }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    body {{
                        padding: 0 !important;
                    }}
                    .email-container {{
                        margin: 0 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }}
                    .header {{
                        padding: 12px 8px !important;
                    }}
                    .header h2 {{
                        font-size: 16px !important;
                    }}
                    .content {{
                        padding: 12px 8px !important;
                    }}
                    .content p {{
                        font-size: 13px !important;
                        line-height: 1.5 !important;
                    }}
                    h3 {{
                        font-size: 14px !important;
                        margin-top: 16px !important;
                        margin-bottom: 8px !important;
                    }}
                    .table-container {{
                        margin-left: -8px !important;
                        margin-right: -8px !important;
                    }}
                    table {{
                        min-width: 450px !important;
                        font-size: 11px !important;
                    }}
                    table th {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                    }}
                    table td {{
                        padding: 6px 4px !important;
                        font-size: 11px !important;
                        word-break: break-word !important;
                    }}
                    .total-cost {{
                        font-size: 13px !important;
                        padding: 8px !important;
                        margin: 8px !important;
                    }}
                    .signature {{
                        font-size: 12px !important;
                        margin-top: 16px !important;
                    }}
                    .footer {{
                        padding: 12px 8px !important;
                        font-size: 11px !important;
                    }}
                }}
                
                /* Additional mobile fixes for very small screens */
                @media only screen and (max-width: 320px) {{
                    .table-container {{
                        margin-left: -5px !important;
                        margin-right: -5px !important;
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        max-width: calc(100vw - 0px) !important;
                    }}
                    table {{
                        min-width: 400px !important;
                        table-layout: auto !important;
                    }}
                    table th {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                        white-space: nowrap !important;
                    }}
                    table td {{
                        padding: 5px 3px !important;
                        font-size: 10px !important;
                    }}
                    .header h2 {{
                        font-size: 14px !important;
                    }}
                    .content p {{
                        font-size: 12px !important;
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
                            <p><strong style="color: #333333 !important;">✗ Project Manager Rejection</strong></p>
                            <p><strong>Rejection Reason:</strong> {rejection_reason}</p>
                            <p>This purchase request has been reviewed and rejected by the Project Manager. Please revise the request based on the feedback provided and resubmit.</p>
                        </div>

                        <h3>Materials Requiring Revision</h3>
                        <div class="table-container">
                            <div class="table-scroll-wrapper">
                                <table>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Cost</th>
                                    <th>Total Cost</th>
                                </tr>
                                {material_rows}
                                    </table>
                            </div>
                        </div>
                        
                        <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                            <span class="label" style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                            <span class="amount" style="color: rgb(255, 0, 0) !important; font-size: 18px; font-weight: 700;">{overall_total:.2f}</span>
                        </div>

                        <div class="signature">
                            <p>Please review the rejection reason and revise the purchase request accordingly.</p>
                            <p>Best regards,</p>
                            <strong>Project Manager</strong>
                        </div>
                    </div>
                    <div class="footer">
                        <p style="margin-bottom: 10px;">Thank you for using</p>
                        <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
                f"{idx:<5} | {m.get('category','N/A'):<12} |"
                f" | {qty:<8} | {m.get('unit',''):<6} | {cost:<10.2f} | {total_cost:<12.2f}"
            )

        # Table header
        header = (
            f"{'S.No':<5} | {'Category':<12} | "
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

<span style="color: #333333 !important;">✗ PROJECT MANAGER REJECTION</span>
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
            pm_role = Role.query.filter_by(role='estimation', is_deleted=False).first()
            if not pm_role:
                return None
            
            users = User.query.filter_by(
                role_id=pm_role.role_id,
                is_deleted=False,
                is_active=True
            ).all()

            emails = [u.email for u in users if u.email]
            return emails if emails else None
        except Exception as e:
            log.error(f"Error fetching estimation team emails: {str(e)}")
            return None

    def send_pm_to_estimation_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                          requester_info: Dict, pm_info: Dict) -> bool:
        """Send notification from Project Manager to Estimation team"""
        try:
            recipients = self.get_estimation_team_emails()
            if not recipients:
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
            recipients = self.get_procurement_team_emails()
            if not recipients:
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
            if not recipients:
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
            
            if not recipients:
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
            if not recipients:
                from models.user import User
                from models.role import Role

                pm_role = Role.query.filter_by(role='projectManager', is_deleted=False).first()
                if pm_role:
                    # Try to find any PM user even if not active
                    any_pm = User.query.filter_by(role_id=pm_role.role_id, is_deleted=False).first()
                    if any_pm and any_pm.email:
                        recipients = [any_pm.email]
                    else:
                        return False
                else:
                    return False

            subject = f"Purchase Request Rejected by Estimation (PM Flag) - Requires PM Review - #{purchase_data.get('purchase_id')}"
            html_content = self._generate_estimation_pm_flag_rejection_email_html(purchase_data, materials_data, requester_info, estimation_info, rejection_reason)
            text_content = self._generate_estimation_pm_flag_rejection_email_text(purchase_data, materials_data, requester_info, estimation_info, rejection_reason)

            success = self._send_email(recipients, subject, html_content, text_content)
            if success:
                log.info(f"PM flag rejection email sent successfully to {len(recipients)} project manager(s)")
            else:
                log.error("Failed to send PM flag rejection email")
            return success
        except Exception as e:
            log.error(f"Error sending estimation PM flag rejection to PM: {str(e)}", exc_info=True)
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
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
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
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
                }}
                .header {{
                    background-color: #4285f4 !important;
                    color: white !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                }}
                .header h2 {{
                    margin: 0 !important;
                    font-size: 18px !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                }}
                .content {{
                    padding: 24px !important;
                    background: #ffffff !important;
                }}
                .content p {{
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    margin: 8px 0 !important;
                    color: #333333 !important;
                }}
                h3 {{
                    color: #333333 !important;
                    font-size: 16px !important;
                    margin-top: 24px !important;
                    margin-bottom: 16px !important;
                    font-weight: 600 !important;
                    border-bottom: 2px solid #4285f4 !important;
                    display: inline-block !important;
                    padding-bottom: 4px !important;
                }}
                .info-section {{
                    background: #ffffff !important;
                    padding: 16px !important;
                    margin: 16px 0 !important;
                }}
                .info-section p {{
                    margin: 4px 0 !important;
                    color: #333333 !important;
                }}
                .info-section .label {{
                    font-weight: 600 !important;
                    color: #333333 !important;
                    display: inline-block !important;
                    min-width: 120px !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin: 16px 0 !important;
                    font-size: 13px !important;
                    background: #ffffff !important;
                    border: 1px solid #e0e0e0 !important;
                }}
                table th {{
                    background-color: #4285f4 !important;
                    color: white !important;
                    padding: 10px 12px !important;
                    text-align: left !important;
                    font-weight: 600 !important;
                    border: none !important;
                }}
                table td {{
                    padding: 10px 12px !important;
                    border-bottom: 1px solid #e0e0e0 !important;
                    text-align: left !important;
                    background: #ffffff !important;
                    color: #333333 !important;
                }}
                table tr:last-child td {{
                    border-bottom: none !important;
                }}
                .total-cost {{
                    background-color: #ffffff !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 4px !important;
                    margin: 20px 0 !important;
                    color: #333333 !important;
                }}
                .total-cost .label {{
                    color: #000000 !important;
                    font-size: 18px !important;
                }}
                .approval-box {{
                    background: #e6f3ff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 4px !important;
                    padding: 16px !important;
                    margin: 20px 0 !important;
                }}
                .approval-box p {{
                    margin: 8px 0 !important;
                    color: #333333 !important;
                }}
                .signature {{
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f8f9fa !important;
                    padding: 20px !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                    margin-top: 0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .company {{
                    color: #333333 !important;
                    font-weight: bold !important;
                    margin-top: 5px !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                    max-width: 100% !important;
                    position: relative !important;
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
                    table {{ min-width: 340px !important; }}
                    table th, table td {{ padding: 6px 4px !important; font-size: 11px !important; }}
                    .total-cost {{ font-size: 13px !important; padding: 8px !important; }}
                    .signature {{ font-size: 13px !important; margin-top: 15px !important; }}
                    .footer {{ padding: 8px !important; font-size: 11px !important; }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    .header h2 {{ font-size: 14px !important; }}
                    .content p {{ font-size: 12px !important; }}
                    h3 {{ font-size: 13px !important; }}
                    table {{ min-width: 340px !important; }}
                    table th, table td {{ padding: 4px 2px !important; font-size: 10px !important; }}
                    .total-cost {{ font-size: 12px !important; padding: 6px !important; }}
                }}
                
                @media only screen and (max-width: 320px) {{
                    .table-container {{
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        max-width: calc(100vw - 10px) !important;
                    }}
                    table {{ min-width: 340px !important; table-layout: auto !important; }}
                    table th, table td {{ padding: 3px 1px !important; font-size: 9px !important; white-space: nowrap !important; }}
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h2>Purchase Request Approved by Estimation Team</h2>
                </div>
                <div class="content">
                    <p style="color: #333333;">Dear Technical Director,</p>
                    <p style="color: #333333;">The Estimation team has approved the following purchase request and it is now ready for your technical review:</p>
                    
                    <div class="info-section" style="background: #ffffff; padding: 16px; margin: 16px 0;">
                        <h3 style="margin-top: 0;">Purchase Request Details</h3>
                        <p><span class="label" style="font-weight: 600; color: #333333; display: inline-block; min-width: 120px;">Request ID:</span> #{purchase_data.get('purchase_id')}</p>
                        <p><span class="label" style="font-weight: 600; color: #333333; display: inline-block; min-width: 120px;">Requested By:</span> {requester_info.get('full_name', 'N/A')}</p>
                        <p><span class="label" style="font-weight: 600; color: #333333; display: inline-block; min-width: 120px;">Site Location:</span> {purchase_data.get('site_location', 'N/A')}</p>
                        <p><span class="label" style="font-weight: 600; color: #333333; display: inline-block; min-width: 120px;">Date:</span> {purchase_data.get('date', 'N/A')}</p>
                        <p><span class="label" style="font-weight: 600; color: #333333; display: inline-block; min-width: 120px;">Project Name:</span> {project.project_name if project else 'N/A'}</p>
                        <p><span class="label" style="font-weight: 600; color: #333333; display: inline-block; min-width: 120px;">Purpose:</span> {purchase_data.get('purpose', 'N/A')}</p>
                    </div>
                    
                    <h3>Materials List</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Category</th>
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
                    
                    <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                        <span class="label" style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                        <span class="amount" style="color: rgb(22, 163, 74) !important; font-size: 18px; font-weight: 700;">{total_cost:.2f}</span>
                    </div>
                    
                    <div class="approval-box" style="background: #e6f3ff; border: 1px solid #4285f4; border-radius: 4px; padding: 16px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333333;">Estimation Team Approval</h3>
                        <p><span style="font-weight: 600; color: #333333;">Approved By:</span> {estimation_info.get('full_name', 'N/A')}</p>
                        <p><span style="font-weight: 600; color: #333333;">Role:</span> {estimation_info.get('role', 'N/A')}</p>
                    </div>
                    
                    <p style="color: #333333; margin-top: 20px;">Please review this purchase request and provide your technical approval.</p>
                    
                    <div class="signature">
                        <p>Best regards,<br>
                        Estimation Team</p>
                    </div>
                </div>
                <div class="footer">
                    <p style="margin-bottom: 10px;">Thank you for using</p>
                    <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
            materials_text += f"{i}. {mat.get('category', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: {mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: {(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
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

Overall Total Cost: {total_cost:.2f}

Estimation Team Approval:
- Approved By: {estimation_info.get('full_name', 'N/A')}
- Role: {estimation_info.get('role', 'N/A')}

Please review this purchase request and provide your technical approval.

Best regards,
Estimation Team
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
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
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
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
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
                    color: #333333 !important;
                    font-size: 18px !important;
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                }}
                .rejection-reason {{
                    background-color: #f8d7da !important;
                    border: 1px solid #f5c6cb !important;
                    color: #333333 !important;
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
                    background-color: #dc2626 !important;
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
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    background-color: #f8f9fa !important;
                    padding: 20px !important;
                    text-align: center !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                    margin-top: 0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                    max-width: 100% !important;
                    position: relative !important;
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
                    table {{ min-width: 340px !important; }}
                    table th, table td {{ padding: 6px 4px !important; font-size: 11px !important; }}
                    .total-cost {{ font-size: 13px !important; padding: 8px !important; }}
                    .signature {{ font-size: 13px !important; margin-top: 15px !important; }}
                    .footer {{ padding: 8px !important; font-size: 11px !important; }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    .header h2 {{ font-size: 14px !important; }}
                    .content p {{ font-size: 12px !important; }}
                    h3 {{ font-size: 13px !important; }}
                    table {{ min-width: 340px !important; }}
                    table th, table td {{ padding: 4px 2px !important; font-size: 10px !important; }}
                    .total-cost {{ font-size: 12px !important; padding: 6px !important; }}
                }}
                
                @media only screen and (max-width: 320px) {{
                    .table-container {{
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        max-width: calc(100vw - 10px) !important;
                    }}
                    table {{ min-width: 340px !important; table-layout: auto !important; }}
                    table th, table td {{ padding: 3px 1px !important; font-size: 9px !important; white-space: nowrap !important; }}
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
                    
                    <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                        <span class="label" style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                        <span class="amount" style="color: rgb(255, 0, 0) !important; font-size: 18px; font-weight: 700;">{total_cost:.2f}</span>
                    </div>
                    
                    <h3>Estimation Team Decision</h3>
                    <p><strong>Rejected By:</strong> {estimation_info.get('full_name', 'N/A')}</p>
                    <p><strong>Role:</strong> {estimation_info.get('role', 'N/A')}</p>
                    
                    <p>Please review the cost-related issues and revise the purchase request accordingly.</p>
                    
                    <div class="signature">
                        <p>Best regards,<br>
                        Estimation Team</p>
                    </div>
                </div>
                <div class="footer">
                    <p style="margin-bottom: 10px;">Thank you for using</p>
                    <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
            materials_text += f"{i}. {mat.get('category', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: {mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: {(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
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

Overall Total Cost: {total_cost:.2f}

Estimation Team Decision:
- Rejected By: {estimation_info.get('full_name', 'N/A')}
- Role: {estimation_info.get('role', 'N/A')}

Please review the cost-related issues and revise the purchase request accordingly.

Best regards,
Estimation Team
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
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
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
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
                }}
                .header {{
                    background-color: #dc2626 !important;
                    color: #ffffff !important;
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
                    color: #333333 !important;
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
                    background-color: #dc2626 !important;
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
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    background-color: #f8f9fa !important;
                    padding: 20px !important;
                    text-align: center !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                    margin-top: 0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                    max-width: 100% !important;
                    position: relative !important;
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
                    table {{ min-width: 340px !important; }}
                    table th, table td {{ padding: 6px 4px !important; font-size: 11px !important; }}
                    .total-cost {{ font-size: 13px !important; padding: 8px !important; }}
                    .signature {{ font-size: 13px !important; margin-top: 15px !important; }}
                    .footer {{ padding: 8px !important; font-size: 11px !important; }}
                }}
                
                @media only screen and (max-width: 480px) {{
                    .header h2 {{ font-size: 14px !important; }}
                    .content p {{ font-size: 12px !important; }}
                    h3 {{ font-size: 13px !important; }}
                    table {{ min-width: 340px !important; }}
                    table th, table td {{ padding: 4px 2px !important; font-size: 10px !important; }}
                    .total-cost {{ font-size: 12px !important; padding: 6px !important; }}
                }}
                
                @media only screen and (max-width: 320px) {{
                    .table-container {{
                        overflow-x: scroll !important;
                        overflow-y: visible !important;
                        max-width: calc(100vw - 10px) !important;
                    }}
                    table {{ min-width: 340px !important; table-layout: auto !important; }}
                    table th, table td {{ padding: 3px 1px !important; font-size: 9px !important; white-space: nowrap !important; }}
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
                    
                    <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
                        <span class="label" style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                        <span class="amount" style="color: rgb(255, 0, 0) !important; font-size: 18px; font-weight: 700;">{total_cost:.2f}</span>
                    </div>
                    
                    <h3>Estimation Team Decision</h3>
                    <p><strong>Flagged By:</strong> {estimation_info.get('full_name', 'N/A')}</p>
                    <p><strong>Role:</strong> {estimation_info.get('role', 'N/A')}</p>
                    
                    <p>Please review the flagged issues and provide your guidance.</p>
                    
                    <div class="signature">
                        <p>Best regards,<br>
                        Estimation Team</p>
                    </div>
                </div>
                <div class="footer">
                    <p style="margin-bottom: 10px;">Thank you for using</p>
                    <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
            materials_text += f"{i}. {mat.get('category', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: {mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: {(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
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

Overall Total Cost: {total_cost:.2f}

Estimation Team Decision:
- Flagged By: {estimation_info.get('full_name', 'N/A')}
- Role: {estimation_info.get('role', 'N/A')}

Please review the flagged issues and provide your guidance.

Best regards,
Estimation Team
    """

    def send_technical_director_to_accounts_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                                       requester_info: Dict, technical_director_info: Dict) -> bool:
        """Send notification from Technical Director to Accounts department"""
        try:
            # Get accounts team emails
            recipients = self.get_accounts_team_emails()
            
            if not recipients:
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
            recipients = self.get_estimation_team_emails()
            if not recipients:
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
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
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
                    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15) !important;
                    overflow: hidden !important;
                    border: 2px solid #a8c5f0 !important;
                    width: 100% !important;
                }}
                .header {{
                    background: #4285f4 !important;
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
                    color: #333333 !important;
                }}
                h3 {{
                    margin-top: 20px !important;
                    margin-bottom: 10px !important;
                    color: #333333 !important;
                    font-size: 16px !important;
                    border-bottom: 2px solid #4285f4 !important;
                    display: inline-block !important;
                    padding-bottom: 4px !important;
                }}
                .table-container {{
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    margin-top: 10px !important;
                    -webkit-overflow-scrolling: touch !important;
                    max-width: 100% !important;
                    position: relative !important;
                }}
                table {{
                    width: 100% !important;
                    border-collapse: collapse !important;
                    min-width: 600px !important;
                }}
                table th {{
                    background: #4285f4 !important;
                    color: #ffffff !important;
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
                    margin-top: 20px !important;
                    padding: 16px 20px !important;
                    text-align: center !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    background: #ffffff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 4px !important;
                    color: #333333 !important;
                    padding: 10px !important;
                    background: #f5f9ff !important;
                    border-radius: 4px !important;
                }}
                .signature {{
                    margin-top: 24px !important;
                    padding-top: 0 !important;
                    border: none !important;
                    font-size: 14px !important;
                    color: #333333 !important;
                }}
                .signature strong {{
                    color: #4285f4 !important;
                    font-weight: 600 !important;
                }}
                .footer {{
                    text-align: center !important;
                    background: #f8f9fa !important;
                    padding: 20px !important;
                    font-size: 13px !important;
                    color: #666666 !important;
                    border-top: 1px solid #e0e0e0 !important;
                }}
                .footer img {{
                    display: block !important;
                    margin: 12px auto !important;
                    max-width: 150px !important;
                    height: auto !important;
                }}
                .approval-section {{
                    background: #e6f3ff !important;
                    border: 1px solid #4285f4 !important;
                    border-radius: 6px !important;
                    padding: 15px !important;
                    margin: 20px 0 !important;
                }}
                .approval-section p {{
                    margin: 8px 0 !important;
                    color: #333333 !important;
                    font-size: 14px !important;
                }}
                .approval-section strong {{
                    color: #333333 !important;
                    font-weight: 600 !important;
                }}
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h2>Purchase Request Approved by Technical Director</h2>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Ready for Payment Processing</p>
                    </div>
                    <div class="content">
                        <p><span class="label">Project Name:</span> {project.project_name if project else 'N/A'}</p>
                        <p><span class="label">Site Location:</span> {purchase_data.get('site_location', 'N/A')}</p>
                        <p><span class="label">Date:</span> {purchase_data.get('date', 'N/A')}</p>
                        <p><span class="label">Requested By:</span> {requester_info.get('full_name', 'N/A')}</p>
                        <p><span class="label">Approved By:</span> {technical_director_info.get('full_name', 'Technical Director')} (Technical Director)</p>

                        <div class="approval-section">
                            <p><strong>✅ Technical Director Approval Complete</strong></p>
                            <p>This purchase request has been approved by the Technical Director and is ready for payment processing.</p>
                        </div>

                        <h3>Materials List</h3>
                        <div class="table-container">
                            <div class="table-scroll-wrapper">
                                <table>
                                <tr>
                                    <th>#</th>
                                    <th>Category</th>
                                    <th>Quantity</th>
                                    <th>Unit</th>
                                    <th>Unit Cost</th>
                                    <th>Total Cost</th>
                                </tr>
                                {materials_table}
                                    </table>
                            </div>
                        </div>
                        
                        <div class="total-cost">
                            <span style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                            <span style="color: rgb(22, 163, 74) !important; font-size: 18px; font-weight: 700;">{total_cost:.2f}</span>
                        </div>

                        <div class="signature">
                            <p>Please process the payment for this approved purchase request. All technical requirements have been verified and approved.</p>
                            <p>Best regards,</p>
                            <strong>Technical Director</strong>
                        </div>
                    </div>
                    <div class="footer">
                        <p style="margin-bottom: 10px;">Thank you for using</p>
                        <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
                    </div>
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
            materials_text += f"{i}. {mat.get('category', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: {mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: {(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
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

Overall Total Cost: {total_cost:.2f}

Next Steps:
Please process the payment for this approved purchase request. All technical requirements have been verified and approved.

Best regards,
Technical Director
Thank you for using
Meter Square
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
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">{mat.get('quantity', 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{mat.get('unit', 'N/A')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{mat.get('cost', 0):.2f}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}</td>
            </tr>
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Purchase Request Rejected by Technical Director</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f9ff; border: 2px solid #a8c5f0; border-radius: 8px;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #a8c5f0;">
                <h1 style="margin: 0; font-size: 24px;">Purchase Request Rejected by Technical Director</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Requires Estimation Review</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #495057; margin-top: 0;">Purchase Request Details</h2>
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table style="width: 100%; border-collapse: collapse; min-width: 300px;">
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
            </div>

            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #333333; margin-top: 0;">Technical Director Rejection</h2>
                <p style="margin: 0; font-weight: bold; color: #333333 !important;">✗ This purchase request has been rejected by the Technical Director.</p>
                <p style="margin: 10px 0 0 0;"><strong>Rejected By:</strong> {technical_director_info.get('full_name', 'N/A')}</p>
                <p style="margin: 5px 0 0 0;"><strong>Role:</strong> {technical_director_info.get('role', 'N/A')}</p>
                <p style="margin: 10px 0 0 0;"><strong>Rejection Reason:</strong> {rejection_reason}</p>
            </div>

            <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #495057; margin-top: 0;">Materials List</h2>
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; min-width: 450px;">
                    <thead>
                        <tr style="background: #dc2626; color: white;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">#</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Category</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                            <th style="padding: 12px; border: 1px solid #ddd;">Unit</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Unit Cost</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials_table}
                    </tbody>
                </table>
                </div>
            </div>

            <div class="total-cost" style="margin: 20px 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #d1d5db;">
                <span class="label" style="color: #000000; font-weight: 600; font-size: 16px;">Overall Total Cost: </span>
                <span class="amount" style="color: rgb(255, 0, 0) !important; font-size: 18px; font-weight: 700;">{total_cost:.2f}</span>
            </div>

            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; margin-top: 0;">Next Steps</h3>
                <p style="margin: 0; color: #856404;">Please review the rejection reason and make necessary corrections to the purchase request before resubmitting.</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Thank you for using</p>
                <img src="cid:logo" alt="Meter Square" style="display: block; max-width: 150px; height: auto; margin: 0 auto;">
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
            materials_text += f"{i}. {mat.get('category', 'N/A')}\n"
            materials_text += f"   Quantity: {mat.get('quantity', 0)} {mat.get('unit', 'N/A')}\n"
            materials_text += f"   Unit Cost: {mat.get('cost', 0):.2f}\n"
            materials_text += f"   Total Cost: {(mat.get('quantity', 0) * mat.get('cost', 0)):.2f}\n\n"
        
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

Overall Total Cost: {total_cost:.2f}

Next Steps:
Please review the rejection reason and make necessary corrections to the purchase request before resubmitting.

Best regards,
Technical Director
Thank you for using
Meter Square
    """

    def send_purchase_request_notification(self, purchase_data: Dict, materials_data: List[Dict],
                                           requester_info: Dict) -> bool:
        """Send purchase request email to procurement team"""
        try:
            recipients = self.get_procurement_team_emails()

            if not recipients:
                return False

            subject = f"New Purchase Request"
            html_content = self._generate_purchase_request_email_html(purchase_data, materials_data, requester_info)
            text_content = self._generate_purchase_request_email_text(purchase_data, materials_data, requester_info)

            return self._send_email(recipients, subject, html_content, text_content)
        except Exception as e:
            log.error(f"Error sending purchase request notification: {str(e)}")
            return False

    def send_payment_processing_notification(self, purchase_id: int, amount: float, 
                                           payment_method: str, processed_by: str, attachments: List = None) -> bool:
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

            prepared_attachments = self._prepare_attachments(attachments)
            return self._send_email(recipients, subject, html_content, text_content, prepared_attachments)
        except Exception as e:
            log.error(f"Error sending payment processing notification: {str(e)}")
            return False

    def send_payment_approved_notification(self, purchase_id: int, transaction_id: int, 
                                         amount: float, approved_by: str, attachments: List = None) -> bool:
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

            prepared_attachments = self._prepare_attachments(attachments)
            return self._send_email(recipients, subject, html_content, text_content, prepared_attachments)
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

    def send_acknowledgement_to_stakeholders(self, purchase_id: int, acknowledgement_type: str,
                                            acknowledged_by: str, message: str, attachments: List = None) -> bool:
        """Send acknowledgement notification to Technical Director, Procurement, and Project Manager"""
        try:
            td_emails = self.get_technical_director_emails() or []
            pm_emails = self.get_project_manager_emails() or []
            pr_emails = self.get_procurement_team_emails() or []

            recipients = list({*(td_emails + pm_emails + pr_emails)})
            if not recipients:
                return False

            subject = f"Acknowledgement Received - Purchase Request #{purchase_id}"

            html_content = f"""
            <html>
            <body>
                <h2>Acknowledgement Received</h2>
                <p>An acknowledgement has been recorded for the following purchase request:</p>
                <div style="background-color: #eef2ff; padding: 12px; border-radius: 6px; border-left: 4px solid #243d8a;">
                    <p><strong>Purchase Request ID:</strong> {purchase_id}</p>
                    <p><strong>Acknowledgement Type:</strong> {acknowledgement_type}</p>
                    <p><strong>Acknowledged By:</strong> {acknowledged_by}</p>
                    <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    <p><strong>Message:</strong> {message}</p>
                </div>
                <p>Best regards,<br/>
                <img src="cid:logo" alt="Meter Square" style="display: inline-block; max-width: 120px; height: auto; margin-top: 10px;"></p>
            </body>
            </html>
            """

            text_content = f"""
            Acknowledgement Received

            Purchase Request ID: {purchase_id}
            Acknowledgement Type: {acknowledgement_type}
            Acknowledged By: {acknowledged_by}
            Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            Message: {message}

            Meter Square
            """

            prepared_attachments = self._prepare_attachments(attachments)
            return self._send_email(recipients, subject, html_content, text_content, prepared_attachments)
        except Exception as e:
            log.error(f"Error sending acknowledgement notification to stakeholders: {str(e)}")
            return False


