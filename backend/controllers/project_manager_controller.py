from flask import g, request, jsonify
from datetime import datetime

from sqlalchemy import and_
from models.purchase_status import PurchaseStatus
from models.material import Material
from utils.email_service import EmailService
from config.logging import get_logger

from config.db import db
from models.role import Role
from models.purchase import Purchase 

log = get_logger()

def pm_approval_workflow():
    """Project Manager approval workflow - approve/reject with email notifications"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Project Manager
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'projectManager':
            return jsonify({'error': 'Only Project Manager can approve/reject purchase requests'}), 403

        data = request.get_json()
        purchase_id = data.get('purchase_id')
        purchase_status = data.get('purchase_status', '').lower()
        rejection_reason = data.get('rejection_reason', '')
        comments = data.get('comments', '')
        
        # Validate purchase_status
        if purchase_status not in ['approved', 'rejected']:
            return jsonify({'error': 'purchase_status must be either "approved" or "rejected"'}), 400
        
        # If rejecting, require rejection reason
        if purchase_status == 'rejected' and (not rejection_reason or rejection_reason.strip() == ''):
            return jsonify({'error': 'rejection_reason is required when purchase_status is "rejected"'}), 400

        # Get purchase request
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Check if PM already made a decision, but allow resubmission
        existing_pm_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'projectManager')
        log.info(f"Existing PM status for purchase #{purchase_id}: {existing_pm_status.status if existing_pm_status else 'None'}")
        
        if existing_pm_status and existing_pm_status.status in ['approved', 'rejected']:
            # Check if there's a more recent procurement status that indicates resubmission
            latest_procurement_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'procurement')
            log.info(f"Latest procurement status for purchase #{purchase_id}: {latest_procurement_status.status if latest_procurement_status else 'None'}")
            
            # Also check if the purchase was modified after the PM's last decision
            purchase_modified_after_pm = purchase.last_modified_at and existing_pm_status.created_at and purchase.last_modified_at > existing_pm_status.created_at
            
            if latest_procurement_status:
                log.info(f"PM status created at: {existing_pm_status.created_at}")
                log.info(f"Procurement status created at: {latest_procurement_status.created_at}")
                log.info(f"Procurement is newer: {latest_procurement_status.created_at > existing_pm_status.created_at}")
            
            log.info(f"Purchase modified after PM decision: {purchase_modified_after_pm}")
            if purchase.last_modified_at and existing_pm_status.created_at:
                log.info(f"Purchase last modified at: {purchase.last_modified_at}")
                log.info(f"PM status created at: {existing_pm_status.created_at}")
            
            # 2. The purchase was modified after the PM's last decision
            if (latest_procurement_status and latest_procurement_status.created_at > existing_pm_status.created_at) or purchase_modified_after_pm:
                # Allow PM to make a new decision since procurement has resubmitted or purchase was modified
                log.info(f"Allowing PM to make new decision for purchase #{purchase_id} - resubmission detected")
            else:
                log.warning(f"Blocking PM decision for purchase #{purchase_id} - no resubmission detected")
                return jsonify({'error': f'Project Manager has already {existing_pm_status.status} this purchase request'}), 400

        # Get materials for email
        materials = []
        if purchase.material_ids:
            material_objects = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids)
                )
            ).all()
            for mat in material_objects:
                materials.append({
                    'description': mat.description,
                    'specification': mat.specification,
                    'unit': mat.unit,
                    'quantity': mat.quantity,
                    'category': mat.category,
                    'cost': mat.cost,
                    'priority': mat.priority,
                    'design_reference': mat.design_reference
                })

        purchase_data = {
            'purchase_id': purchase.purchase_id,
            'site_location': purchase.site_location,
            'date': purchase.date,
            'project_id': purchase.project_id,
            'purpose': purchase.purpose,
            'file_path': purchase.file_path
        }

        requester_info = {
            'full_name': purchase.requested_by,
            'email': current_user.get('email', ''),
            'role': 'requester'
        }

        pm_info = {
            'full_name': user_name,
            'user_id': user_id,
            'email': current_user.get('email', ''),
            'role': role.role
        }

        # Create status entry in database
        try:
            # Determine receiver role based on decision
            if purchase_status == 'approved':
                receiver_role = 'estimation'
            else:  # rejected
                receiver_role = 'procurement'
            
            new_status = PurchaseStatus.create_new_status(
                purchase_id=purchase_id,
                sender_role='projectManager',
                receiver_role=receiver_role,
                status='approved' if purchase_status == 'approved' else 'rejected',
                decision_by_user_id=user_id,
                rejection_reason=rejection_reason if purchase_status == 'rejected' else None,
                comments=comments,
                created_by=user_name
            )
            
            # Update purchase last_modified fields
            purchase.last_modified_at = datetime.utcnow()
            purchase.last_modified_by = user_name
            
            db.session.commit()
            log.info(f"Purchase request #{purchase_id} {new_status.status} by Project Manager {user_name}")
        except Exception as e:
            db.session.rollback()
            log.error(f"Error updating purchase status in database: {str(e)}")
            return jsonify({'error': 'Failed to update purchase status in database'}), 500

        # Send appropriate email based on decision
        email_service = EmailService()
        email_success = False
        message = ""
        
        # Check if this is a resubmission
        is_resubmission = existing_pm_status and existing_pm_status.status == 'rejected' and ((latest_procurement_status and latest_procurement_status.created_at > existing_pm_status.created_at) or purchase_modified_after_pm)
        
        if purchase_status == 'approved':
            # PM approves - send to Estimation team
            email_success = email_service.send_pm_to_estimation_notification(
                purchase_data, materials, requester_info, pm_info
            )
            if is_resubmission:
                message = f'Purchase request #{purchase_id} approved by Project Manager (resubmission) and sent to Estimation team'
            else:
                message = f'Purchase request #{purchase_id} approved by Project Manager and sent to Estimation team'
        else:
            # PM rejects - send back to Procurement team
            email_success = email_service.send_pm_rejection_to_procurement(
                purchase_data, materials, requester_info, pm_info, rejection_reason
            )
            if is_resubmission:
                message = f'Purchase request #{purchase_id} rejected by Project Manager (resubmission) and sent back to Procurement team'
            else:
                message = f'Purchase request #{purchase_id} rejected by Project Manager and sent back to Procurement team'

        # Return response
        response_data = {
            'success': True,
            'message': message,
            'purchase_id': purchase_id,
            'pm_status': new_status.status,
            'decision_date': new_status.decision_date.isoformat(),
            'decision_by': new_status.created_by,
            'comments': new_status.comments
        }
        
        if purchase_status == 'rejected':
            response_data['rejection_reason'] = new_status.rejection_reason
        
        if not email_success:
            response_data['email_warning'] = 'Status updated but email notification failed'
            log.warning(f"Purchase status updated but email failed for purchase #{purchase_id}")
        else:
            # Create email notification status entry
            try:
                email_status = PurchaseStatus.create_email_notification_status(
                    purchase_id=purchase_id,
                    sender_role='projectManager',
                    receiver_role=receiver_role,
                    email_type='pm_notification',
                    decision_by_user_id=user_id,
                    comments=f'Email notification sent from project manager to {receiver_role}',
                    created_by=user_name
                )
                db.session.add(email_status)
                db.session.commit()
                log.info(f"Created email notification status for purchase #{purchase_id}")
            except Exception as e:
                db.session.rollback()
                log.error(f"Error creating email notification status: {str(e)}")

        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error in pm_approval_workflow: {str(e)}")
        return jsonify({'error': str(e)}), 500

def _calculate_material_summary(materials):
    """Helper: Calculate material summary from materials list"""
    return {
        'total_materials': len(materials),
        'total_quantity': sum(m.quantity or 0 for m in materials),
        'total_cost': round(sum((m.cost or 0) * (m.quantity or 0) for m in materials), 2),
        'categories': list({m.category for m in materials if m.category})
    }

def _format_status_dict(status):
    """Helper: Format status to dictionary"""
    return {
        'status_id': status.status_id,
        'status': status.status,
        'sender': status.sender,
        'receiver': status.receiver,
        'date': status.created_at.isoformat() if status.created_at else None,
        'decision_by_user_id': status.decision_by_user_id,
        'decision_by': status.created_by,
        'comments': status.comments,
        'rejection_reason': status.rejection_reason,
        'reject_category': status.reject_category,
        'decision_date': status.decision_date.isoformat() if status.decision_date else None
    }

def _get_purchase_materials(purchase):
    """Helper: Get materials for a purchase"""
    if not purchase.material_ids:
        return []
    return Material.query.filter(
        and_(Material.is_deleted == False, Material.material_id.in_(purchase.material_ids))
    ).all()

def _determine_workflow_status(latest_status, pm_status):
    """Helper: Determine current workflow status"""
    if latest_status and latest_status.sender == 'estimation' and latest_status.receiver == 'projectManager' and latest_status.status == 'rejected':
        return None  # Skip this item
    
    # If the latest status is procurement sending to PM, it's pending PM review
    if latest_status and latest_status.sender == 'procurement' and latest_status.receiver == 'projectManager':
        return 'pending_pm_review'
    
    if pm_status:
        return 'pm_approved' if pm_status.status == 'approved' else 'pm_rejected'
    elif latest_status and latest_status.sender == 'estimation':
        return 'estimation_review'
    elif latest_status and latest_status.sender == 'technicalDirector':
        return 'technical_director_review'
    elif latest_status and latest_status.sender == 'accounts':
        return 'accounts_processing'
    return 'pending_pm_review'

def _build_purchase_item(purchase, material_summary, current_workflow_status, procurement_approved_status, pm_status, status_history, latest_status_dt):
    """Helper: Build purchase item dictionary"""
    return {
        'purchase_id': purchase.purchase_id,
        'site_location': purchase.site_location,
        'purpose': purchase.purpose,
        'date': purchase.date,
        'email_sent': purchase.email_sent,
        'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
        'materials_summary': material_summary,
        'current_workflow_status': current_workflow_status,
        'procurement_status': procurement_approved_status.status,
        'procurement_status_date': procurement_approved_status.created_at.isoformat() if procurement_approved_status.created_at else None,
        'procurement_comments': procurement_approved_status.comments,
        'pm_status': pm_status.status if pm_status else 'pending',
        'pm_status_date': pm_status.created_at.isoformat() if pm_status and pm_status.created_at else None,
        'pm_comments': pm_status.comments if pm_status else None,
        'pm_rejection_reason': pm_status.rejection_reason if pm_status else None,
        'status_history': status_history,
        'latest_status_date': latest_status_dt.isoformat() if latest_status_dt else None
    }

def _ensure_uniqueness_by_purchase_id(items):
    """Helper: Ensure uniqueness by purchase_id, keep most recent"""
    if not items:
        return items
    
    def _parse_dt_for_item(item):
        dt = item.get('latest_status_date') or item.get('procurement_status_date') or item.get('created_at')
        try:
            return datetime.fromisoformat(dt) if dt else datetime.min
        except Exception:
            return datetime.min

    unique_by_purchase = {}
    for item in items:
        pid = item.get('purchase_id')
        if pid not in unique_by_purchase or _parse_dt_for_item(item) > _parse_dt_for_item(unique_by_purchase[pid]):
            unique_by_purchase[pid] = item
    
    return [item for item in unique_by_purchase.values() if item.get('current_workflow_status') != 'estimation_rejected_to_pm']

def _process_estimation_rejections(estimation_pm_rejection_statuses):
    """Helper: Process estimation PM rejections"""
    estimation_pm_rejected_purchase_ids = list({s.purchase_id for s in estimation_pm_rejection_statuses})
    estimation_pm_rejections = []
    pm_status = 'pending'
    for purchase_id in estimation_pm_rejected_purchase_ids:
        absolute_latest_status = PurchaseStatus.query.filter_by(purchase_id=purchase_id).order_by(PurchaseStatus.created_at.desc()).first()
        rejected_status = next((s for s in estimation_pm_rejection_statuses if s.purchase_id == purchase_id), None)
        
        if not rejected_status:
            continue
        
        # Skip this rejection if there exists ANY PM approval after the rejection timestamp
        pm_approval_after_rejection = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.status == 'approved',
                PurchaseStatus.created_at > rejected_status.created_at
            )
        ).first()
        if pm_approval_after_rejection:
            continue

        # Also skip if the absolute latest status is an approval that clearly supersedes the rejection
        if absolute_latest_status and absolute_latest_status.status_id != rejected_status.status_id:
            if absolute_latest_status.status == 'approved' and (
                absolute_latest_status.sender in ['projectManager', 'technicalDirector', 'accounts'] or
                absolute_latest_status.receiver in ['technicalDirector', 'accounts', 'design']
            ) and absolute_latest_status.created_at > rejected_status.created_at:
                continue
        if absolute_latest_status.sender == 'estimation' and absolute_latest_status.receiver == 'projectManager' and absolute_latest_status.status == 'rejected':
            pm_status = 'pending'
        purchase = Purchase.query.filter(and_(Purchase.purchase_id == purchase_id, Purchase.is_deleted == False)).first()
        if purchase:
            materials = _get_purchase_materials(purchase)
            estimation_pm_rejections.append({
                'purchase_id': purchase.purchase_id,
                'site_location': purchase.site_location,
                'purpose': purchase.purpose,
                'date': purchase.date,
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'materials_summary': _calculate_material_summary(materials),
                'rejected_status': {
                    'pm_status' : pm_status,
                    'status_id': rejected_status.status_id,
                    'status': rejected_status.status,
                    'sender': rejected_status.sender,
                    'receiver': rejected_status.receiver,
                    'decision_date': rejected_status.decision_date.isoformat() if rejected_status.decision_date else None,
                    'created_at': rejected_status.created_at.isoformat() if rejected_status.created_at else None,
                    'created_by': rejected_status.created_by,
                    'comments': rejected_status.comments,
                    'rejection_reason': rejected_status.rejection_reason,
                    'reject_category': rejected_status.reject_category,
                }
            })
    
    # Ensure uniqueness in rejections
    if estimation_pm_rejections:
        def _parse_rej_dt(item):
            try:
                dt = item.get('rejected_status', {}).get('created_at')
                return datetime.fromisoformat(dt) if dt else datetime.min
            except Exception:
                return datetime.min

        unique_rejections = {}
        for item in estimation_pm_rejections:
            pid = item.get('purchase_id')
            if pid not in unique_rejections or _parse_rej_dt(item) > _parse_rej_dt(unique_rejections[pid]):
                unique_rejections[pid] = item
        estimation_pm_rejections = list(unique_rejections.values())
    
    return estimation_pm_rejections

def get_procurement_approved_purchases():
    """Get purchases where role is procurement and status is approved"""
    try:
        if not g.user:
            return jsonify({'error': 'Not logged in'}), 401

        # Handle single purchase request
        purchase_id_filter = request.args.get('purchase_id', type=int)
        if purchase_id_filter:
            purchase = Purchase.query.filter(and_(Purchase.purchase_id == purchase_id_filter, Purchase.is_deleted == False)).first()
            if not purchase:
                return jsonify({'error': 'Purchase not found'}), 404

            latest_status = PurchaseStatus.query.filter_by(purchase_id=purchase_id_filter).order_by(PurchaseStatus.created_at.desc()).first()
            materials = _get_purchase_materials(purchase)
            
            return jsonify({
                'success': True,
                'purchase_id': purchase.purchase_id,
                'date': purchase.date,
                'site_location': purchase.site_location,
                'purpose': purchase.purpose,
                'materials_summary': _calculate_material_summary(materials),
                'current_workflow_status': latest_status.status if latest_status else 'pending',
                'latest_status': {
                    'status_id': latest_status.status_id,
                    'status': latest_status.status,
                    'sender': latest_status.sender,
                    'receiver': latest_status.receiver,
                    'decision_date': latest_status.decision_date.isoformat() if latest_status.decision_date else None,
                    'created_at': latest_status.created_at.isoformat() if latest_status.created_at else None,
                    'created_by': latest_status.created_by,
                    'comments': latest_status.comments,
                    'rejection_reason': latest_status.rejection_reason,
                    'reject_category': latest_status.reject_category,
                } if latest_status else None,
            }), 200

        # Get procurement approved purchase IDs
        total_purchase = Purchase.query.filter_by(is_deleted = False).count()
        procurement_approved_statuses = PurchaseStatus.query.filter(and_(PurchaseStatus.sender == 'procurement', PurchaseStatus.status == 'approved')).all()
        procurement_approved_purchase_ids = list(set([status.purchase_id for status in procurement_approved_statuses]))
        
        if not procurement_approved_purchase_ids:
            pm_involved_purchase_ids = set()
        else:
            pm_involved_purchase_ids = set(procurement_approved_purchase_ids)
        
        # Process approved purchases
        approved_procurement_purchases = []
        for purchase_id in pm_involved_purchase_ids:
            # Get statuses for this purchase
            procurement_approved_status = PurchaseStatus.query.filter(and_(PurchaseStatus.purchase_id == purchase_id, PurchaseStatus.sender == 'procurement', PurchaseStatus.status == 'approved')).order_by(PurchaseStatus.created_at.desc()).first()
            latest_status = PurchaseStatus.query.filter_by(purchase_id=purchase_id).order_by(PurchaseStatus.created_at.desc()).first()
            
            # Get the latest PM decision
            pm_status = PurchaseStatus.query.filter(
                and_(
                    PurchaseStatus.purchase_id == purchase_id, 
                    PurchaseStatus.sender == 'projectManager'
                )
            ).order_by(PurchaseStatus.created_at.desc()).first()
            
            # Check if procurement has re-sent to PM after PM's decision
            # If procurement's approval is newer than PM's last action, PM status should be pending
            if pm_status and procurement_approved_status:
                if procurement_approved_status.created_at > pm_status.created_at:
                    # Procurement re-sent after PM's decision, so PM status is now pending
                    pm_status = None  # This will make it show as pending
            
            if procurement_approved_status:
                purchase = Purchase.query.filter(and_(Purchase.purchase_id == purchase_id, Purchase.is_deleted == False)).first()
                if purchase:
                    materials = _get_purchase_materials(purchase)
                    current_workflow_status = _determine_workflow_status(latest_status, pm_status)
                    
                    if current_workflow_status is None:  # Skip rejected items
                        continue
                    
                    # Get the latest status for the purchase
                    latest_for_purchase = PurchaseStatus.query.filter_by(purchase_id=purchase_id).order_by(PurchaseStatus.created_at.desc()).first()
                    status_history = [_format_status_dict(latest_for_purchase)] if latest_for_purchase else []
                    latest_status_dt = latest_for_purchase.created_at if latest_for_purchase else None
                    
                    approved_procurement_purchases.append(_build_purchase_item(
                        purchase, _calculate_material_summary(materials), current_workflow_status,
                        procurement_approved_status, pm_status, status_history, latest_status_dt
                    ))

        # Ensure uniqueness
        approved_procurement_purchases = _ensure_uniqueness_by_purchase_id(approved_procurement_purchases)
        
        # Process estimation rejections
        estimation_pm_rejection_statuses = PurchaseStatus.query.filter(and_(PurchaseStatus.sender == 'estimation', PurchaseStatus.receiver == 'projectManager', PurchaseStatus.status == 'rejected')).order_by(PurchaseStatus.created_at.desc()).all()
        estimation_pm_rejections = _process_estimation_rejections(estimation_pm_rejection_statuses)
        
        # Filter out rejected items
        estimation_rejected_purchase_ids = {item['purchase_id'] for item in estimation_pm_rejections}
        approved_procurement_purchases = [item for item in approved_procurement_purchases if item['purchase_id'] not in estimation_rejected_purchase_ids]

        # Handle latest_only filter
        if request.args.get('latest_only', default=0, type=int):
            def parse_dt(item):
                dt = item.get('latest_status_date') or item.get('procurement_status_date') or item.get('created_at')
                try:
                    return datetime.fromisoformat(dt) if dt else None
                except Exception:
                    return None
            approved_procurement_purchases = sorted(approved_procurement_purchases, key=lambda x: (parse_dt(x) or datetime.min), reverse=True)[:1]

        return jsonify({
            'success': True,
            'total_approved_procurement_purchases': len(approved_procurement_purchases),
            'non_approval_project_manager_purchases': total_purchase - len(approved_procurement_purchases),
            'estimation_pm_rejections_count': len(estimation_pm_rejections),
            'approved_procurement_purchases': approved_procurement_purchases,
            'estimation_pm_rejections': estimation_pm_rejections
        }), 200

    except Exception as e:
        log.error(f"Error getting procurement approved purchases: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_purchase_status_details(purchase_id):
    """Get project manager and procurement status details for a specific purchase"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Get the specific purchase
        purchase = Purchase.query.filter(
            and_(
                Purchase.purchase_id == purchase_id,
                Purchase.is_deleted == False
            )
        ).first()
        
        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404
        
        # Get ALL project manager statuses (approved and rejected)
        pm_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.sender == 'projectManager'
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()
        
        # Get ALL procurement statuses (approved and rejected)
        procurement_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.sender == 'procurement'
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()
        
        # Get latest status from project manager or procurement only
        latest_status = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.sender.in_(['projectManager', 'procurement'])
            )
        ).order_by(PurchaseStatus.created_at.desc()).first()
        
        # Get materials for this purchase
        materials = []
        if purchase.material_ids:
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids)
                )
            ).all()
        
        # Calculate material summary
        material_summary = {
            'total_materials': len(materials),
            'total_quantity': sum(m.quantity or 0 for m in materials),
            'total_cost': round(sum((m.cost or 0) * (m.quantity or 0) for m in materials), 2),
            'categories': list({m.category for m in materials if m.category}),
            'materials': [
                {
                    'material_id': m.material_id,
                    'description': m.description,
                    'quantity': m.quantity,
                    'unit': m.unit,
                    'cost': m.cost,
                    'category': m.category,
                    'priority': m.priority
                } for m in materials
            ]
        }
        
        # Get user details for decision makers
        from models.user import User
        
        # Process all project manager statuses
        pm_status_list = []
        for status in pm_statuses:
            pm_user = None
            if status.decision_by_user_id:
                pm_user = User.query.filter_by(user_id=status.decision_by_user_id).first()
            
            pm_status_list.append({
                'status': status.status,
                'sender': 'projectManager',
                'date': status.created_at.isoformat() if status.created_at else None,
                'decision_by': {
                    'user_id': status.decision_by_user_id,
                    'full_name': pm_user.full_name if pm_user else 'Unknown',
                    'email': pm_user.email if pm_user else None
                } if status.decision_by_user_id else None,
                'rejection_reason': status.rejection_reason,
                'comments': status.comments,
                'reject_category': status.reject_category
            })
        
        # Process all procurement statuses
        procurement_status_list = []
        for status in procurement_statuses:
            procurement_user = None
            if status.decision_by_user_id:
                procurement_user = User.query.filter_by(user_id=status.decision_by_user_id).first()
            
            procurement_status_list.append({
                'status': status.status,
                'sender': 'procurement',
                'date': status.created_at.isoformat() if status.created_at else None,
                'decision_by': {
                    'user_id': status.decision_by_user_id,
                    'full_name': procurement_user.full_name if procurement_user else 'Unknown',
                    'email': procurement_user.email if procurement_user else None
                } if status.decision_by_user_id else None,
                'rejection_reason': status.rejection_reason,
                'comments': status.comments,
                'reject_category': status.reject_category
            })
        
        # Get latest decision maker details
        latest_decision_maker = None
        if latest_status and latest_status.decision_by_user_id:
            latest_user = User.query.filter_by(user_id=latest_status.decision_by_user_id).first()
            latest_decision_maker = {
                'user_id': latest_status.decision_by_user_id,
                'full_name': latest_user.full_name if latest_user else 'Unknown',
                'email': latest_user.email if latest_user else None
            }
        
        # Get latest procurement and PM statuses
        latest_procurement_status = procurement_statuses[0] if procurement_statuses else None
        latest_pm_status = pm_statuses[0] if pm_statuses else None
        
        # Determine current workflow status
        current_workflow_status = 'pending_procurement'
        if latest_procurement_status and latest_procurement_status.status == 'approved':
            if latest_pm_status:
                if latest_pm_status.status == 'approved':
                    current_workflow_status = 'pm_approved'
                elif latest_pm_status.status == 'rejected':
                    current_workflow_status = 'pm_rejected'
            else:
                current_workflow_status = 'pending_pm_review'
        
        # Get all statuses for complete history
        all_statuses = PurchaseStatus.query.filter_by(
            purchase_id=purchase_id
        ).order_by(PurchaseStatus.created_at.asc()).all()
        
        # Build status history
        status_history = []
        for status in all_statuses:
            status_history.append({
                'status_id': status.status_id,
                'status': status.status,
                'sender': status.sender,
                'receiver': status.receiver,
                'date': status.created_at.isoformat() if status.created_at else None,
                'decision_by_user_id': status.decision_by_user_id,
                'decision_by': status.created_by,
                'comments': status.comments,
                'rejection_reason': status.rejection_reason,
                'reject_category': status.reject_category,
                'decision_date': status.decision_date.isoformat() if status.decision_date else None
            })
        
        return jsonify({
            'success': True,
            'purchase_id': purchase_id,
            'site_location': purchase.site_location,
            'purpose': purchase.purpose,
            'date': purchase.date,
            'email_sent': purchase.email_sent,
            'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
            'materials_summary': material_summary,
            'current_workflow_status': current_workflow_status,
            'procurement_status': latest_procurement_status.status if latest_procurement_status else 'pending',
            'procurement_status_date': latest_procurement_status.created_at.isoformat() if latest_procurement_status and latest_procurement_status.created_at else None,
            'procurement_comments': latest_procurement_status.comments if latest_procurement_status else None,
            'procurement_decision_by': latest_procurement_status.created_by if latest_procurement_status else None,
            'pm_status': latest_pm_status.status if latest_pm_status else 'pending',
            'pm_status_date': latest_pm_status.created_at.isoformat() if latest_pm_status and latest_pm_status.created_at else None,
            'pm_comments': latest_pm_status.comments if latest_pm_status else None,
            'pm_rejection_reason': latest_pm_status.rejection_reason if latest_pm_status else None,
            'pm_decision_by': latest_pm_status.created_by if latest_pm_status else None,
            'status_history': status_history,
            'summary': {
                'total_pm_statuses': len(pm_status_list),
                'total_procurement_statuses': len(procurement_status_list),
                'pm_approved_count': len([s for s in pm_status_list if s['status'] == 'approved']),
                'pm_rejected_count': len([s for s in pm_status_list if s['status'] == 'rejected']),
                'pm_pending_count': len([s for s in pm_status_list if s['status'] == 'pending']),
                'procurement_approved_count': len([s for s in procurement_status_list if s['status'] == 'approved']),
                'procurement_rejected_count': len([s for s in procurement_status_list if s['status'] == 'rejected']),
                'procurement_pending_count': len([s for s in procurement_status_list if s['status'] == 'pending'])
            }
        }), 200

    except Exception as e:
        log.error(f"Error getting purchase status details for purchase {purchase_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500


def get_project_manager_dashboard():
    """Get project manager dashboard data based on purchase_status table with sender/receiver counts"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Project Manager
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'projectManager':
            return jsonify({'error': 'Only Project Manager can access dashboard'}), 403

        # Get all status records where project manager is the SENDER (PM made decisions)
        pm_sender_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Get all status records where project manager is the RECEIVER (PM received decisions)
        pm_receiver_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.receiver == 'projectManager',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Get purchases that are in PM workflow but haven't been processed by PM yet
        # These are purchases that have been approved by Procurement but PM hasn't acted on them
        procurement_approved_purchase_ids = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'procurement',
                PurchaseStatus.status == 'approved',
                PurchaseStatus.is_active == True
            )
        ).with_entities(PurchaseStatus.purchase_id).all()
        
        procurement_approved_purchase_ids = [pid[0] for pid in procurement_approved_purchase_ids]
        
        # Get purchases that PM has already processed
        pm_processed_purchase_ids = [status.purchase_id for status in pm_sender_statuses]
        
        # Find purchases approved by Procurement but not yet processed by PM (pending for PM)
        pm_sender_pending_purchases = Purchase.query.filter(
            and_(
                Purchase.is_deleted == False,
                Purchase.purchase_id.in_(procurement_approved_purchase_ids),
                ~Purchase.purchase_id.in_(pm_processed_purchase_ids)
            )
        ).all()

        # Get purchases that were sent to PM but PM hasn't responded yet (receiver pending)
        pm_receiver_pending_purchases = Purchase.query.filter(
            and_(
                Purchase.is_deleted == False,
                Purchase.purchase_id.in_(procurement_approved_purchase_ids),
                ~Purchase.purchase_id.in_([status.purchase_id for status in pm_receiver_statuses])
            )
        ).all()

        # Process SENDER data (PM team as sender)
        sender_approved_count = 0
        sender_rejected_count = 0
        sender_pending_count = 0
        sender_approved_details = []
        sender_rejected_details = []
        sender_pending_details = []

        # Process existing status records
        for status in pm_sender_statuses:
            # Get purchase details
            purchase = Purchase.query.filter_by(
                purchase_id=status.purchase_id, 
                is_deleted=False
            ).first()
            
            if not purchase:
                continue

            # Get materials for this purchase
            materials = []
            total_material_cost = 0
            total_quantity = 0
            
            if purchase.material_ids:
                material_objects = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids)
                    )
                ).all()
                
                for mat in material_objects:
                    material_cost = float(mat.cost) if mat.cost else 0
                    material_total = material_cost * mat.quantity
                    total_material_cost += material_total
                    total_quantity += mat.quantity
                    
                    materials.append({
                        'material_id': mat.material_id,
                        'description': mat.description,
                        'specification': mat.specification,
                        'unit': mat.unit,
                        'quantity': mat.quantity,
                        'category': mat.category,
                        'unit_cost': material_cost,
                        'total_cost': material_total,
                        'priority': mat.priority,
                        'design_reference': mat.design_reference
                    })

            status_detail = {
                'status_id': status.status_id,
                'purchase_id': status.purchase_id,
                'project_id': purchase.project_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date,
                'purpose': purchase.purpose,
                'file_path': purchase.file_path,
                'materials': materials,
                'material_count': len(materials),
                'total_quantity': total_quantity,
                'total_cost': round(total_material_cost, 2),
                'status_info': {
                    'status': status.status,
                    'sender': status.sender,
                    'receiver': status.receiver,
                    'decision_date': status.decision_date.isoformat() if status.decision_date else None,
                    'decision_by_user_id': status.decision_by_user_id,
                    'decision_by': status.created_by,
                    'rejection_reason': status.rejection_reason,
                    'reject_category': status.reject_category,
                    'comments': status.comments,
                    'created_at': status.created_at.isoformat() if status.created_at else None,
                    'last_modified_at': status.last_modified_at.isoformat() if status.last_modified_at else None,
                    'last_modified_by': status.last_modified_by
                }
            }

            if status.status == 'approved':
                sender_approved_count += 1
                sender_approved_details.append(status_detail)
            elif status.status == 'rejected':
                sender_rejected_count += 1
                sender_rejected_details.append(status_detail)
            elif status.status == 'pending':
                sender_pending_count += 1
                sender_pending_details.append(status_detail)

        # Process pending purchases (those without status records)
        for purchase in pm_sender_pending_purchases:
            # Get materials for this purchase
            materials = []
            total_material_cost = 0
            total_quantity = 0
            
            if purchase.material_ids:
                material_objects = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids)
                    )
                ).all()
                
                for mat in material_objects:
                    material_cost = float(mat.cost) if mat.cost else 0
                    material_total = material_cost * mat.quantity
                    total_material_cost += material_total
                    total_quantity += mat.quantity
                    
                    materials.append({
                        'material_id': mat.material_id,
                        'description': mat.description,
                        'specification': mat.specification,
                        'unit': mat.unit,
                        'quantity': mat.quantity,
                        'category': mat.category,
                        'unit_cost': material_cost,
                        'total_cost': material_total,
                        'priority': mat.priority,
                        'design_reference': mat.design_reference
                    })

            status_detail = {
                'status_id': None,
                'purchase_id': purchase.purchase_id,
                'project_id': purchase.project_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date,
                'purpose': purchase.purpose,
                'file_path': purchase.file_path,
                'materials': materials,
                'material_count': len(materials),
                'total_quantity': total_quantity,
                'total_cost': round(total_material_cost, 2),
                'status_info': {
                    'status': 'pending',
                    'sender': 'projectManager',
                    'receiver': None,
                    'decision_date': None,
                    'decision_by_user_id': None,
                    'decision_by': None,
                    'rejection_reason': None,
                    'reject_category': None,
                    'comments': None,
                    'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                    'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
                    'last_modified_by': purchase.last_modified_by
                }
            }

            sender_pending_count += 1
            sender_pending_details.append(status_detail)

        # Process RECEIVER data (PM team as receiver)
        receiver_approved_count = 0
        receiver_rejected_count = 0
        receiver_pending_count = 0
        receiver_approved_details = []
        receiver_rejected_details = []
        receiver_pending_details = []

        for status in pm_receiver_statuses:
            # Get purchase details
            purchase = Purchase.query.filter_by(
                purchase_id=status.purchase_id, 
                is_deleted=False
            ).first()
            
            if not purchase:
                continue

            # Get materials for this purchase
            materials = []
            total_material_cost = 0
            total_quantity = 0
            
            if purchase.material_ids:
                material_objects = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids)
                    )
                ).all()
                
                for mat in material_objects:
                    material_cost = float(mat.cost) if mat.cost else 0
                    material_total = material_cost * mat.quantity
                    total_material_cost += material_total
                    total_quantity += mat.quantity
                    
                    materials.append({
                        'material_id': mat.material_id,
                        'description': mat.description,
                        'specification': mat.specification,
                        'unit': mat.unit,
                        'quantity': mat.quantity,
                        'category': mat.category,
                        'unit_cost': material_cost,
                        'total_cost': material_total,
                        'priority': mat.priority,
                        'design_reference': mat.design_reference
                    })

            status_detail = {
                'status_id': status.status_id,
                'purchase_id': status.purchase_id,
                'project_id': purchase.project_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date,
                'purpose': purchase.purpose,
                'file_path': purchase.file_path,
                'materials': materials,
                'material_count': len(materials),
                'total_quantity': total_quantity,
                'total_cost': round(total_material_cost, 2),
                'status_info': {
                    'status': status.status,
                    'sender': status.sender,
                    'receiver': status.receiver,
                    'decision_date': status.decision_date.isoformat() if status.decision_date else None,
                    'decision_by_user_id': status.decision_by_user_id,
                    'decision_by': status.created_by,
                    'rejection_reason': status.rejection_reason,
                    'reject_category': status.reject_category,
                    'comments': status.comments,
                    'created_at': status.created_at.isoformat() if status.created_at else None,
                    'last_modified_at': status.last_modified_at.isoformat() if status.last_modified_at else None,
                    'last_modified_by': status.last_modified_by
                }
            }

            if status.status == 'approved':
                receiver_approved_count += 1
                receiver_approved_details.append(status_detail)
            elif status.status == 'rejected':
                receiver_rejected_count += 1
                receiver_rejected_details.append(status_detail)
            elif status.status == 'pending':
                receiver_pending_count += 1
                receiver_pending_details.append(status_detail)

        # Process receiver pending purchases (those sent to PM but PM hasn't responded)
        for purchase in pm_receiver_pending_purchases:
            # Get materials for this purchase
            materials = []
            total_material_cost = 0
            total_quantity = 0
            
            if purchase.material_ids:
                material_objects = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids)
                    )
                ).all()
                
                for mat in material_objects:
                    material_cost = float(mat.cost) if mat.cost else 0
                    material_total = material_cost * mat.quantity
                    total_material_cost += material_total
                    total_quantity += mat.quantity
                    
                    materials.append({
                        'material_id': mat.material_id,
                        'description': mat.description,
                        'specification': mat.specification,
                        'unit': mat.unit,
                        'quantity': mat.quantity,
                        'category': mat.category,
                        'unit_cost': material_cost,
                        'total_cost': material_total,
                        'priority': mat.priority,
                        'design_reference': mat.design_reference
                    })

            status_detail = {
                'status_id': None,
                'purchase_id': purchase.purchase_id,
                'project_id': purchase.project_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date,
                'purpose': purchase.purpose,
                'file_path': purchase.file_path,
                'materials': materials,
                'material_count': len(materials),
                'total_quantity': total_quantity,
                'total_cost': round(total_material_cost, 2),
                'status_info': {
                    'status': 'pending',
                    'sender': 'procurement',
                    'receiver': 'projectManager',
                    'decision_date': None,
                    'decision_by_user_id': None,
                    'decision_by': None,
                    'rejection_reason': None,
                    'reject_category': None,
                    'comments': None,
                    'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                    'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
                    'last_modified_by': purchase.last_modified_by
                }
            }

            receiver_pending_count += 1
            receiver_pending_details.append(status_detail)

        # Calculate totals
        sender_total = sender_approved_count + sender_rejected_count + sender_pending_count
        receiver_total = receiver_approved_count + receiver_rejected_count + receiver_pending_count

        # Calculate rejection breakdown for sender
        sender_cost_rejections = len([s for s in sender_rejected_details if s['status_info']['reject_category'] == 'cost'])
        sender_pm_flag_rejections = len([s for s in sender_rejected_details if s['status_info']['reject_category'] == 'pm_flag'])

        # Calculate rejection breakdown for receiver
        receiver_cost_rejections = len([s for s in receiver_rejected_details if s['status_info']['reject_category'] == 'cost'])
        receiver_pm_flag_rejections = len([s for s in receiver_rejected_details if s['status_info']['reject_category'] == 'pm_flag'])

        # Calculate financial summaries
        sender_approved_value = sum(s['total_cost'] for s in sender_approved_details)
        sender_rejected_value = sum(s['total_cost'] for s in sender_rejected_details)
        sender_pending_value = sum(s['total_cost'] for s in sender_pending_details)

        receiver_approved_value = sum(s['total_cost'] for s in receiver_approved_details)
        receiver_rejected_value = sum(s['total_cost'] for s in receiver_rejected_details)
        receiver_pending_value = sum(s['total_cost'] for s in receiver_pending_details)

        # Calculate quantity summaries
        sender_approved_quantity = sum(s['total_quantity'] for s in sender_approved_details)
        sender_rejected_quantity = sum(s['total_quantity'] for s in sender_rejected_details)
        sender_pending_quantity = sum(s['total_quantity'] for s in sender_pending_details)

        receiver_approved_quantity = sum(s['total_quantity'] for s in receiver_approved_details)
        receiver_rejected_quantity = sum(s['total_quantity'] for s in receiver_rejected_details)
        receiver_pending_quantity = sum(s['total_quantity'] for s in receiver_pending_details)

        dashboard_data = {
            'success': True,
            'project_manager_as_sender': {
                'total_count': sender_total,
                'approved_count': sender_approved_count,
                'rejected_count': sender_rejected_count,
                'pending_count': sender_pending_count,
                'approved_value': round(sender_approved_value, 2),
                'rejected_value': round(sender_rejected_value, 2),
                'pending_value': round(sender_pending_value, 2),
                'approved_quantity': sender_approved_quantity,
                'rejected_quantity': sender_rejected_quantity,
                'pending_quantity': sender_pending_quantity,
                'rejection_breakdown': {
                    'cost_rejections': sender_cost_rejections,
                    'pm_flag_rejections': sender_pm_flag_rejections,
                    'other_rejections': sender_rejected_count - sender_cost_rejections - sender_pm_flag_rejections
                }
            },
            'project_manager_as_receiver': {
                'total_count': receiver_total,
                'approved_count': receiver_approved_count,
                'rejected_count': receiver_rejected_count,
                'pending_count': receiver_pending_count,
                'approved_value': round(receiver_approved_value, 2),
                'rejected_value': round(receiver_rejected_value, 2),
                'pending_value': round(receiver_pending_value, 2),
                'approved_quantity': receiver_approved_quantity,
                'rejected_quantity': receiver_rejected_quantity,
                'pending_quantity': receiver_pending_quantity,
                'rejection_breakdown': {
                    'cost_rejections': receiver_cost_rejections,
                    'pm_flag_rejections': receiver_pm_flag_rejections,
                    'other_rejections': receiver_rejected_count - receiver_cost_rejections - receiver_pm_flag_rejections
                }
            },
            'summary': {
                'total_sender_records': sender_total,
                'total_receiver_records': receiver_total,
                'total_unique_purchases': len(set([s['purchase_id'] for s in sender_approved_details + sender_rejected_details + sender_pending_details + receiver_approved_details + receiver_rejected_details + receiver_pending_details]))
            }
        }

        return jsonify(dashboard_data), 200

    except Exception as e:
        log.error(f"Error in get_project_manager_dashboard: {str(e)}")
        return jsonify({'error': f'Failed to retrieve dashboard data: {str(e)}'}), 500