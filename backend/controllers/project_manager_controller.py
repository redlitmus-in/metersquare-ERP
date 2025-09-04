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
from models.approval import Approval

log = get_logger()

# @jwt_required
def purchase_approval():
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        data = request.get_json()
        purchase_id = data.get('purchase_id')
        status = data.get('status', 'under_review').strip().lower()  # Normalize case
        comments = data.get('comments','')

        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'procurement':
            return jsonify({'error': 'Only Procurement Officers can perform review'}), 403

        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        if status not in ['approved', 'rejected', 'under review']:
            return jsonify({'error': 'Invalid status. Must be approved, rejected, or under review'}), 400

        # Add approval entry
        approval = Approval(
            purchase_id=purchase_id,
            reviewer_role='procurementOfficer',
            status=status,
            comments=comments,
            reviewed_by=current_user['full_name'],
            created_by=current_user['full_name']
        )
        db.session.add(approval)

        # Update purchase status
        purchase.status = f'reviewed_by_procurement_{status.replace(" ", "_")}'
        purchase.last_modified_by = current_user['full_name']
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Procurement review marked as {status}',
            'purchase_id': purchase_id
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error during procurement review: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
        if purchase_status not in ['accept', 'reject']:
            return jsonify({'error': 'purchase_status must be either "accept" or "reject"'}), 400
        
        # If rejecting, require rejection reason
        if purchase_status == 'reject' and (not rejection_reason or rejection_reason.strip() == ''):
            return jsonify({'error': 'rejection_reason is required when purchase_status is "reject"'}), 400

        # Get purchase request
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Check if PM already made a decision, but allow resubmission
        existing_pm_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'projectManager')
        log.info(f"Existing PM status for purchase #{purchase_id}: {existing_pm_status.status if existing_pm_status else 'None'}")
        
        if existing_pm_status and existing_pm_status.status in ['accepted', 'rejected']:
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
            
            # Allow resubmission if either:
            # 1. There's a newer procurement status, OR
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
            new_status = PurchaseStatus.create_new_status(
                purchase_id=purchase_id,
                role='projectManager',
                status='accepted' if purchase_status == 'accept' else 'rejected',
                decision_by_user_id=user_id,
                rejection_reason=rejection_reason if purchase_status == 'reject' else None,
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
        
        if purchase_status == 'accept':
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
        
        if purchase_status == 'reject':
            response_data['rejection_reason'] = new_status.rejection_reason
        
        if not email_success:
            response_data['email_warning'] = 'Status updated but email notification failed'
            log.warning(f"Purchase status updated but email failed for purchase #{purchase_id}")

        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error in pm_approval_workflow: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_purchase_with_status(purchase_id):
    """Get purchase details with current status information"""
    try:
        # Get purchase details
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Get all active role statuses
        all_role_statuses = PurchaseStatus.get_all_role_statuses(purchase_id)
        
        # Get status history
        status_history = PurchaseStatus.get_status_history(purchase_id)
        
        # Build response
        purchase_data = purchase.to_dict()
        purchase_data['role_statuses'] = [status.to_dict() for status in all_role_statuses]
        purchase_data['status_history'] = [status.to_dict() for status in status_history]
        
        return jsonify({
            'success': True,
            'purchase': purchase_data
        }), 200
    except Exception as e:
        log.error(f"Error in get_purchase_with_status: {str(e)}")
        return jsonify({'error': str(e)}), 500

def check_project_manager_approval_status(purchase_id):
    """Check if Project Manager has approved a purchase request"""
    try:
        # Get purchase request
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Get Project Manager status
        pm_status = PurchaseStatus.get_latest_status_by_role(purchase_id, 'projectManager')
        
        if not pm_status:
            return jsonify({
                'success': True,
                'purchase_id': purchase_id,
                'project_manager_status': 'pending',
                'message': 'Project Manager has not yet reviewed this purchase request'
            }), 200
        
        # Get user details who made the decision
        from models.user import User
        decision_maker = User.query.filter_by(user_id=pm_status.decision_by_user_id).first()
        decision_maker_name = decision_maker.full_name if decision_maker else 'Unknown'
        
        return jsonify({
            'success': True,
            'purchase_id': purchase_id,
            'project_manager_status': pm_status.status,
            'decision_date': pm_status.decision_date.isoformat() if pm_status.decision_date else None,
            'decision_by': decision_maker_name,
            'decision_by_user_id': pm_status.decision_by_user_id,
            'rejection_reason': pm_status.rejection_reason,
            'comments': pm_status.comments,
            'message': f'Project Manager has {pm_status.status} this purchase request'
        }), 200

    except Exception as e:
        log.error(f"Error checking PM approval status for purchase {purchase_id}: {str(e)}")
        return jsonify({'error': 'Failed to check Project Manager approval status'}), 500

