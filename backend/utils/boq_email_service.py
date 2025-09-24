"""
BOQ Email Service Utility
Handles all BOQ-related email notifications
"""
from typing import List, Dict
from datetime import datetime
from utils.email_service import EmailService
from config.logging import get_logger

log = get_logger()

class BOQEmailService:
    def __init__(self):
        self.email_service = EmailService()

    def send_boq_created_notification(self, boq_data: Dict, items_data: List[Dict],
                                    project_info: Dict, creator_info: Dict) -> bool:
        """Send BOQ created notification to procurement team"""
        try:
            recipients = self.email_service.get_procurement_team_emails()
            if not recipients:
                log.warning("No procurement team emails found")
                return False

            subject = f"New BOQ Created - {boq_data.get('title', 'Untitled BOQ')} (#{boq_data.get('boq_id')})"

            html_content = self._generate_boq_notification_html(boq_data, items_data, project_info, creator_info)
            text_content = self._generate_boq_notification_text(boq_data, items_data, project_info, creator_info)

            success = self.email_service._send_email(recipients, subject, html_content, text_content)
            if success:
                log.info(f"BOQ notification sent to {len(recipients)} procurement member(s)")
            return success

        except Exception as e:
            log.error(f"Error sending BOQ created notification: {str(e)}")
            return False

    def send_boq_updated_notification(self, boq_data: Dict, items_data: List[Dict],
                                    project_info: Dict, updater_info: Dict, changes_summary: Dict) -> bool:
        """Send BOQ updated notification to procurement team"""
        try:
            recipients = self.email_service.get_procurement_team_emails()
            if not recipients:
                log.warning("No procurement team emails found")
                return False

            subject = f"BOQ Updated - {boq_data.get('title', 'Untitled BOQ')} (#{boq_data.get('boq_id')})"

            html_content = self._generate_boq_update_notification_html(boq_data, items_data, project_info, updater_info, changes_summary)
            text_content = self._generate_boq_update_notification_text(boq_data, items_data, project_info, updater_info, changes_summary)

            success = self.email_service._send_email(recipients, subject, html_content, text_content)
            if success:
                log.info(f"BOQ update notification sent to {len(recipients)} procurement member(s)")
            return success

        except Exception as e:
            log.error(f"Error sending BOQ update notification: {str(e)}")
            return False

    def _generate_boq_notification_html(self, boq_data: Dict, items_data: List[Dict],
                                      project_info: Dict, creator_info: Dict) -> str:
        """Generate HTML email content for BOQ created notification"""

        # Calculate summary statistics
        total_items = len(items_data)
        total_amount = boq_data.get('total_amount', 0)
        categories = list(set([item.get('category', 'Unknown') for item in items_data]))

        # Generate items table
        items_html = ""
        for idx, item in enumerate(items_data[:10], 1):  # Show first 10 items
            items_html += f"""
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px; text-align: center;">{item.get('item_no', f'Item {idx}')}</td>
                    <td style="padding: 8px;">{item.get('category', 'N/A')}</td>
                    <td style="padding: 8px;">{item.get('description', 'N/A')}</td>
                    <td style="padding: 8px; text-align: center;">{item.get('quantity', 0)}</td>
                    <td style="padding: 8px; text-align: center;">{item.get('unit', 'N/A')}</td>
                    <td style="padding: 8px; text-align: right;">AED {item.get('rate', 0):,.2f}</td>
                    <td style="padding: 8px; text-align: right; font-weight: bold;">AED {item.get('amount', 0):,.2f}</td>
                </tr>
            """

        if total_items > 10:
            items_html += f"""
                <tr style="background-color: #f9fafb;">
                    <td colspan="7" style="padding: 12px; text-align: center; font-style: italic; color: #6b7280;">
                        ... and {total_items - 10} more items
                    </td>
                </tr>
            """

        return f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; }}
                .container {{ max-width: 800px; margin: 0 auto; background-color: #ffffff; }}
                .header {{ background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .highlight-box {{ background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border-left: 4px solid #1e40af; padding: 20px; margin: 20px 0; border-radius: 8px; }}
                .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }}
                .info-card {{ background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }}
                .label {{ font-weight: 600; color: #475569; display: inline-block; min-width: 120px; }}
                .value {{ color: #1e293b; }}
                .amount {{ font-size: 1.25em; font-weight: bold; color: #059669; }}
                .table {{ width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
                .table th {{ background-color: #1e40af; color: white; padding: 12px; text-align: left; font-weight: 600; }}
                .footer {{ background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; }}
                .urgent {{ background-color: #fef2f2; border-left-color: #dc2626; }}
                .categories {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }}
                .category-tag {{ background-color: #1e40af; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.875em; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">📋 New BOQ Created</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Requires Procurement Review & Processing</p>
                </div>

                <div class="content">
                    <div class="highlight-box urgent">
                        <h2 style="margin: 0 0 15px 0; color: #dc2626;">🚨 Action Required</h2>
                        <p style="margin: 0; font-size: 16px;">A new Bill of Quantities (BOQ) has been created and is now ready for procurement review. Please process this request according to your workflow procedures.</p>
                    </div>

                    <div class="info-grid">
                        <div class="info-card">
                            <h3 style="margin: 0 0 15px 0; color: #1e40af;">BOQ Details</h3>
                            <p><span class="label">BOQ ID:</span> <span class="value">#{boq_data.get('boq_id')}</span></p>
                            <p><span class="label">Title:</span> <span class="value">{boq_data.get('title', 'Untitled BOQ')}</span></p>
                            <p><span class="label">Status:</span> <span class="value" style="color: #d97706; font-weight: 600;">{boq_data.get('status', 'Draft').title()}</span></p>
                            <p><span class="label">Created Date:</span> <span class="value">{datetime.now().strftime('%d %B %Y at %I:%M %p')}</span></p>
                        </div>

                        <div class="info-card">
                            <h3 style="margin: 0 0 15px 0; color: #1e40af;">Project Information</h3>
                            <p><span class="label">Project ID:</span> <span class="value">{project_info.get('project_id', 'N/A')}</span></p>
                            <p><span class="label">Project Name:</span> <span class="value">{project_info.get('project_name', 'Not specified')}</span></p>
                            <p><span class="label">Created By:</span> <span class="value">{creator_info.get('full_name', 'N/A')}</span></p>
                            <p><span class="label">Department:</span> <span class="value">{creator_info.get('department', 'N/A')}</span></p>
                        </div>
                    </div>

                    <div class="highlight-box">
                        <h3 style="margin: 0 0 15px 0; color: #1e40af;">📊 BOQ Summary</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                            <div>
                                <div style="font-size: 24px; font-weight: bold; color: #1e40af;">{total_items}</div>
                                <div style="color: #64748b;">Total Items</div>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: bold; color: #1e40af;">{len(categories)}</div>
                                <div style="color: #64748b;">Categories</div>
                            </div>
                            <div>
                                <div class="amount" style="font-size: 24px;">AED {total_amount:,.2f}</div>
                                <div style="color: #64748b;">Total Value</div>
                            </div>
                        </div>

                        <div>
                            <p style="margin: 15px 0 5px 0; font-weight: 600; color: #475569;">Categories Included:</p>
                            <div class="categories">
                                {"".join([f'<span class="category-tag">{cat}</span>' for cat in categories[:8]])}
                                {f'<span class="category-tag">+{len(categories)-8} more</span>' if len(categories) > 8 else ''}
                            </div>
                        </div>
                    </div>

                    <h3 style="color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📋 BOQ Items</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Item No.</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th>Rate</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #1e40af; color: white; font-weight: bold;">
                                <td colspan="6" style="padding: 12px; text-align: right;">TOTAL BOQ VALUE:</td>
                                <td style="padding: 12px; text-align: right; font-size: 1.1em;">AED {total_amount:,.2f}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="highlight-box">
                        <h3 style="margin: 0 0 15px 0; color: #dc2626;">🎯 Next Steps for Procurement</h3>
                        <ol style="margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Review all BOQ items and specifications</li>
                            <li style="margin-bottom: 8px;">Verify quantities and rates for accuracy</li>
                            <li style="margin-bottom: 8px;">Source vendors and obtain competitive quotations</li>
                            <li style="margin-bottom: 8px;">Update BOQ status once processing begins</li>
                            <li style="margin-bottom: 8px;">Coordinate with Project Manager for approvals</li>
                        </ol>
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 0 0 10px 0;">This is an automated notification from MeterSquare ERP System</p>
                    <img src="cid:logo" alt="Meter Square" style="max-width: 120px; height: auto;">
                    <p style="margin: 10px 0 0 0; font-size: 12px;">© 2025 Meter Square. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _generate_boq_notification_text(self, boq_data: Dict, items_data: List[Dict],
                                      project_info: Dict, creator_info: Dict) -> str:
        """Generate text email content for BOQ created notification"""

        total_items = len(items_data)
        total_amount = boq_data.get('total_amount', 0)
        categories = list(set([item.get('category', 'Unknown') for item in items_data]))

        items_text = ""
        for idx, item in enumerate(items_data[:10], 1):
            items_text += f"""
{idx:2d}. {item.get('item_no', f'Item {idx}'):8} | {item.get('category', 'N/A'):12} | {item.get('description', 'N/A'):30} | {item.get('quantity', 0):6} {item.get('unit', 'N/A'):4} | AED {item.get('rate', 0):8.2f} | AED {item.get('amount', 0):10.2f}"""

        if total_items > 10:
            items_text += f"\n... and {total_items - 10} more items"

        return f"""
🔔 NEW BOQ CREATED - ACTION REQUIRED

═══════════════════════════════════════════════════════════════════

BOQ DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOQ ID          : #{boq_data.get('boq_id')}
Title           : {boq_data.get('title', 'Untitled BOQ')}
Status          : {boq_data.get('status', 'Draft').title()}
Created Date    : {datetime.now().strftime('%d %B %Y at %I:%M %p')}

PROJECT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project ID      : {project_info.get('project_id', 'N/A')}
Project Name    : {project_info.get('project_name', 'Not specified')}
Created By      : {creator_info.get('full_name', 'N/A')}
Department      : {creator_info.get('department', 'N/A')}

BOQ SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Items     : {total_items}
Categories      : {len(categories)} ({', '.join(categories[:5])}{"..." if len(categories) > 5 else ""})
Total Value     : AED {total_amount:,.2f}

BOQ ITEMS PREVIEW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{"Item#":8} | {"Category":12} | {"Description":30} | {"Qty":6} {"Unit":4} | {"Rate":12} | {"Amount":15}
{"-"*8}━┿━{"-"*12}━┿━{"-"*30}━┿━{"-"*6}━{"-"*4}━┿━{"-"*12}━┿━{"-"*15}
{items_text}
{"-"*95}
{"TOTAL BOQ VALUE":80} : AED {total_amount:10.2f}

NEXT STEPS FOR PROCUREMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review all BOQ items and specifications
2. Verify quantities and rates for accuracy
3. Source vendors and obtain competitive quotations
4. Update BOQ status once processing begins
5. Coordinate with Project Manager for approvals

═══════════════════════════════════════════════════════════════════

This is an automated notification from MeterSquare ERP System.
Please log into the system to process this BOQ request.

© 2025 Meter Square. All rights reserved.
        """

    def _generate_boq_update_notification_html(self, boq_data: Dict, items_data: List[Dict],
                                             project_info: Dict, updater_info: Dict, changes_summary: Dict) -> str:
        """Generate HTML email content for BOQ update notification"""

        total_items = len(items_data)
        total_amount = boq_data.get('total_amount', 0)

        changes_html = ""
        for change_type, count in changes_summary.items():
            if count > 0:
                changes_html += f"<li style='margin-bottom: 5px;'>{change_type.title()}: {count} items</li>"

        return f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; }}
                .container {{ max-width: 800px; margin: 0 auto; background-color: #ffffff; }}
                .header {{ background: linear-gradient(135deg, #d97706 0%, #92400e 100%); color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 30px; }}
                .highlight-box {{ background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #d97706; padding: 20px; margin: 20px 0; border-radius: 8px; }}
                .info-card {{ background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px; }}
                .label {{ font-weight: 600; color: #475569; display: inline-block; min-width: 120px; }}
                .value {{ color: #1e293b; }}
                .footer {{ background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">📝 BOQ Updated</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Changes Made to Existing BOQ</p>
                </div>

                <div class="content">
                    <div class="highlight-box">
                        <h2 style="margin: 0 0 15px 0; color: #92400e;">📋 BOQ Update Summary</h2>
                        <p style="margin: 0; font-size: 16px;">BOQ #{boq_data.get('boq_id')} - {boq_data.get('title', 'Untitled BOQ')} has been updated.</p>
                    </div>

                    <div class="info-card">
                        <h3 style="margin: 0 0 15px 0; color: #d97706;">Changes Made:</h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            {changes_html}
                        </ul>
                    </div>

                    <div class="info-card">
                        <h3 style="margin: 0 0 15px 0; color: #d97706;">Current BOQ Status:</h3>
                        <p><span class="label">Total Items:</span> <span class="value">{total_items}</span></p>
                        <p><span class="label">Total Value:</span> <span class="value">AED {total_amount:,.2f}</span></p>
                        <p><span class="label">Updated By:</span> <span class="value">{updater_info.get('full_name', 'N/A')}</span></p>
                        <p><span class="label">Update Date:</span> <span class="value">{datetime.now().strftime('%d %B %Y at %I:%M %p')}</span></p>
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 0 0 10px 0;">This is an automated notification from MeterSquare ERP System</p>
                    <img src="cid:logo" alt="Meter Square" style="max-width: 120px; height: auto;">
                </div>
            </div>
        </body>
        </html>
        """

    def _generate_boq_update_notification_text(self, boq_data: Dict, items_data: List[Dict],
                                             project_info: Dict, updater_info: Dict, changes_summary: Dict) -> str:
        """Generate text email content for BOQ update notification"""

        total_items = len(items_data)
        total_amount = boq_data.get('total_amount', 0)

        changes_text = ""
        for change_type, count in changes_summary.items():
            if count > 0:
                changes_text += f"- {change_type.title()}: {count} items\n"

        return f"""
📝 BOQ UPDATED - NOTIFICATION

═══════════════════════════════════════════════════════════════════

BOQ UPDATE SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOQ ID          : #{boq_data.get('boq_id')}
Title           : {boq_data.get('title', 'Untitled BOQ')}
Update Date     : {datetime.now().strftime('%d %B %Y at %I:%M %p')}
Updated By      : {updater_info.get('full_name', 'N/A')}

CHANGES MADE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{changes_text}

CURRENT BOQ STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Items     : {total_items}
Total Value     : AED {total_amount:,.2f}

═══════════════════════════════════════════════════════════════════

This is an automated notification from MeterSquare ERP System.

© 2025 Meter Square. All rights reserved.
        """