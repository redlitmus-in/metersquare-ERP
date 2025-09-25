from flask import g, request, jsonify
from datetime import datetime, timedelta
import os
import tempfile
from werkzeug.utils import secure_filename

from sqlalchemy import and_, or_, func, distinct
from config.db import db
from config.logging import get_logger
from models.role import Role
from models.boq import BOQ, BOQItem, BOQSection
from models.boq_history import BOQSummary, BOQTerm
from models.project import Project
from models.vendor import Vendor
from utils.pdf_extractor import PDFExtractor, extract_boq_from_pdf

log = get_logger()

def get_estimator_dashboard():
    """Get estimator dashboard data with BOQ metrics"""
    try:
        current_user = g.user

        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Estimator
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'estimator':
            return jsonify({'error': 'Only Estimator can access this dashboard'}), 403

        # Get BOQ metrics
        total_boqs = BOQ.query.filter_by(is_deleted=False).count()

        # BOQs by status
        draft_boqs = BOQ.query.filter_by(status='draft', is_deleted=False).count()
        pending_boqs = BOQ.query.filter_by(status='pending', is_deleted=False).count()
        approved_boqs = BOQ.query.filter_by(status='approved', is_deleted=False).count()
        sent_boqs = BOQ.query.filter_by(status='sent', is_deleted=False).count()

        # Recent BOQs (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_boqs = BOQ.query.filter(
            and_(
                BOQ.created_at >= seven_days_ago,
                BOQ.is_deleted == False
            )
        ).all()

        # Calculate total project value
        total_value = db.session.query(func.sum(BOQSummary.sub_total)).join(
            BOQ, BOQ.boq_id == BOQSummary.boq_id
        ).filter(BOQ.is_deleted == False).scalar() or 0

        # Get projects with BOQs
        projects_with_boqs = db.session.query(distinct(BOQ.project_id)).filter(
            BOQ.is_deleted == False
        ).count()

        # Format recent BOQs for response
        recent_boqs_data = []
        for boq in recent_boqs[:10]:  # Limit to 10 most recent
            summary = BOQSummary.query.filter_by(boq_id=boq.boq_id).first()
            recent_boqs_data.append({
                'boq_id': boq.boq_id,
                'title': boq.title,
                'status': boq.status,
                'created_at': boq.created_at.strftime('%Y-%m-%d %H:%M:%S') if boq.created_at else None,
                'total_amount': summary.sub_total if summary else 0,
                'project_id': boq.project_id
            })

        # Get monthly trend data (last 6 months)
        trend_data = []
        for i in range(5, -1, -1):
            month_start = datetime.now().replace(day=1) - timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)

            month_count = BOQ.query.filter(
                and_(
                    BOQ.created_at >= month_start,
                    BOQ.created_at < month_end,
                    BOQ.is_deleted == False
                )
            ).count()

            month_value = db.session.query(func.sum(BOQSummary.sub_total)).join(
                BOQ, BOQ.boq_id == BOQSummary.boq_id
            ).filter(
                and_(
                    BOQ.created_at >= month_start,
                    BOQ.created_at < month_end,
                    BOQ.is_deleted == False
                )
            ).scalar() or 0

            trend_data.append({
                'month': month_start.strftime('%B'),
                'count': month_count,
                'value': float(month_value)
            })

        dashboard_data = {
            'metrics': {
                'total_boqs': total_boqs,
                'draft_boqs': draft_boqs,
                'pending_boqs': pending_boqs,
                'approved_boqs': approved_boqs,
                'sent_boqs': sent_boqs,
                'total_value': float(total_value),
                'active_projects': projects_with_boqs
            },
            'recent_boqs': recent_boqs_data,
            'trend_data': trend_data,
            'user_info': {
                'name': current_user['full_name'],
                'role': 'Estimator',
                'email': current_user.get('email', '')
            }
        }

        return jsonify(dashboard_data), 200

    except Exception as e:
        log.error(f"Error getting estimator dashboard: {str(e)}")
        return jsonify({'error': str(e)}), 500

def upload_and_extract_boq_pdf():
    """Upload PDF and extract BOQ data"""
    try:
        current_user = g.user

        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Estimator
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'estimator':
            return jsonify({'error': 'Only Estimator can upload BOQ PDFs'}), 403

        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files are allowed'}), 400

        # Save file temporarily
        temp_dir = tempfile.gettempdir()
        filename = secure_filename(file.filename)
        temp_path = os.path.join(temp_dir, filename)
        file.save(temp_path)

        try:
            # Extract BOQ data from PDF
            extracted_data = extract_boq_from_pdf(temp_path)

            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

            # Return extracted data for preview
            return jsonify({
                'success': True,
                'message': 'PDF extracted successfully',
                'data': extracted_data,
                'filename': filename
            }), 200

        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    except Exception as e:
        log.error(f"Error extracting BOQ from PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500

def confirm_extracted_boq():
    """Confirm and save extracted BOQ data"""
    try:
        current_user = g.user

        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Estimator
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'estimator':
            return jsonify({'error': 'Only Estimator can confirm BOQ data'}), 403

        data = request.json

        # Create main BOQ record
        new_boq = BOQ(
            project_id=data.get('project_id'),
            title=data.get('title'),
            raised_by=current_user['full_name'],
            user_id=current_user.get('user_id', 1),
            status='pending',  # Set to pending after confirmation
            created_by=current_user['full_name']
        )
        db.session.add(new_boq)
        db.session.flush()  # Get the boq_id

        new_boq_id = new_boq.boq_id
        total_amount = 0

        # Process sections and items
        sections = data.get('sections', [])
        for section_data in sections:
            # Create or find section
            section = BOQSection.query.filter_by(
                section_name=section_data.get('name'),
                category=section_data.get('category', 'General')
            ).first()

            if not section:
                section = BOQSection(
                    section_name=section_data.get('name'),
                    category=section_data.get('category', 'General'),
                    section_code=section_data.get('code', 'G'),
                    created_by=current_user['full_name']
                )
                db.session.add(section)
                db.session.flush()

            section_id = section.section_id

            # Add items for this section
            items = section_data.get('items', [])
            for item in items:
                item_amount = float(item.get('quantity', 0)) * float(item.get('rate', 0))
                total_amount += item_amount

                new_item = BOQItem(
                    boq_id=new_boq_id,
                    category=section_data.get('category', 'General'),
                    section_id=section_id,
                    item_no=item.get('item_no'),
                    description=item.get('description'),
                    unit=item.get('unit'),
                    quantity=float(item.get('quantity', 0)),
                    rate=float(item.get('rate', 0)),
                    amount=item_amount,
                    created_by=current_user['full_name']
                )
                db.session.add(new_item)

        # Create BOQ summary
        boq_summary = BOQSummary(
            boq_id=new_boq_id,
            sub_total=total_amount,
            created_by=current_user['full_name']
        )
        db.session.add(boq_summary)

        # Add terms if provided
        terms = data.get('terms', [])
        if terms:
            boq_term = BOQTerm(
                boq_id=new_boq_id,
                term=terms if isinstance(terms, list) else [terms],
                created_by=current_user['full_name']
            )
            db.session.add(boq_term)

        # Commit all changes
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'BOQ saved successfully',
            'boq_id': new_boq_id,
            'total_amount': total_amount,
            'status': 'pending'
        }), 201

    except Exception as e:
        db.session.rollback()
        log.error(f"Error confirming BOQ: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_estimator_dropdown_data():
    """Get dropdown data for estimator forms"""
    try:
        current_user = g.user

        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Get projects
        projects = Project.query.filter_by(is_deleted=False).all()
        project_list = [{
            'id': p.project_id,
            'name': p.project_name,
            'client': p.client_name
        } for p in projects]

        # Get unique categories from BOQ sections
        categories = db.session.query(distinct(BOQSection.category)).filter(
            BOQSection.category.isnot(None)
        ).all()
        category_list = [c[0] for c in categories if c[0]]

        # Add default categories if not present
        default_categories = ['Civil', 'Architecture', 'Mechanical', 'Electrical',
                            'Plumbing', 'HVAC', 'Interior', 'Landscape', 'MEP']
        for cat in default_categories:
            if cat not in category_list:
                category_list.append(cat)

        # Get unique units from BOQ items
        units = db.session.query(distinct(BOQItem.unit)).filter(
            BOQItem.unit.isnot(None)
        ).all()
        unit_list = [u[0] for u in units if u[0]]

        # Add default units if not present
        default_units = ['Nos', 'Sqm', 'Cum', 'Kg', 'MT', 'L', 'RM', 'Set', 'LS']
        for unit in default_units:
            if unit not in unit_list:
                unit_list.append(unit)

        # Get vendors/clients
        vendors = Vendor.query.filter_by(is_deleted=False).all()
        client_list = [{
            'id': v.vendor_id,
            'name': v.vendor_name,
            'type': v.vendor_type
        } for v in vendors]

        return jsonify({
            'projects': project_list,
            'categories': sorted(category_list),
            'units': sorted(unit_list),
            'clients': client_list
        }), 200

    except Exception as e:
        log.error(f"Error getting dropdown data: {str(e)}")
        return jsonify({'error': str(e)}), 500