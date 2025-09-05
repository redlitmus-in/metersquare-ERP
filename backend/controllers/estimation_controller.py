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

def estimation_approval_workflow():
    """Estimation team approval workflow - approved/rejected with email notifications"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Estimation team
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'estimation':
            return jsonify({'error': 'Only Estimation team can approved/rejected purchase requests'}), 403

        data = request.get_json()
        purchase_id = data.get('purchase_id')
        estimation_status = data.get('estimation_status', '').lower()
        rejection_reason = data.get('rejection_reason', '')
        comments = data.get('comments', '')
        rejection_type = data.get('rejection_type', '').lower()  # 'cost' or 'pm_flag'
        
        # Validate estimation_status
        if estimation_status not in ['approved', 'rejected']:
            return jsonify({'error': 'estimation_status must be either "approved" or "rejected"'}), 400
        
        # If rejecting, require rejection reason and type
        if estimation_status == 'rejected':
            if not rejection_reason or rejection_reason.strip() == '':
                return jsonify({'error': 'rejection_reason is required when estimation_status is "rejected"'}), 400
            if rejection_type not in ['cost', 'pm_flag']:
                return jsonify({'error': 'rejection_type must be either "cost" or "pm_flag" when rejecting'}), 400

        # Get purchase request
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Check if Estimation already made a decision, but allow resubmission
        existing_estimation_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'estimation')
        log.info(f"Existing estimation status for purchase #{purchase_id}: {existing_estimation_status.status if existing_estimation_status else 'None'}")
        
        if existing_estimation_status and existing_estimation_status.status in ['approved', 'rejected']:
            # Check if there's a more recent status from other roles that indicates resubmission
            latest_pm_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'projectManager')
            latest_procurement_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'procurement')
            
            log.info(f"Latest PM status for purchase #{purchase_id}: {latest_pm_status.status if latest_pm_status else 'None'}")
            log.info(f"Latest procurement status for purchase #{purchase_id}: {latest_procurement_status.status if latest_procurement_status else 'None'}")
            
            # Also check if the purchase was modified after the estimation's last decision
            purchase_modified_after_estimation = purchase.last_modified_at and existing_estimation_status.created_at and purchase.last_modified_at > existing_estimation_status.created_at
            
            pm_approved_after_estimation = (latest_pm_status and 
                                          latest_pm_status.status == 'approved' and 
                                          latest_pm_status.created_at > existing_estimation_status.created_at)
            
            procurement_resubmitted_after_estimation = (latest_procurement_status and 
                                                      latest_procurement_status.created_at > existing_estimation_status.created_at)
            
            if latest_pm_status and existing_estimation_status:
                log.info(f"Estimation status created at: {existing_estimation_status.created_at}")
                log.info(f"PM status created at: {latest_pm_status.created_at}")
                log.info(f"PM approved after estimation: {pm_approved_after_estimation}")
            
            if latest_procurement_status and existing_estimation_status:
                log.info(f"Procurement status created at: {latest_procurement_status.created_at}")
                log.info(f"Procurement resubmitted after estimation: {procurement_resubmitted_after_estimation}")
            
            log.info(f"Purchase modified after estimation decision: {purchase_modified_after_estimation}")
            if purchase.last_modified_at and existing_estimation_status.created_at:
                log.info(f"Purchase last modified at: {purchase.last_modified_at}")
                log.info(f"Estimation status created at: {existing_estimation_status.created_at}")
            
            if pm_approved_after_estimation or procurement_resubmitted_after_estimation or purchase_modified_after_estimation:
                log.info(f"Allowing estimation to make new decision for purchase #{purchase_id} - resubmission detected")
            else:
                log.warning(f"Blocking estimation decision for purchase #{purchase_id} - no resubmission detected")
                return jsonify({'error': f'Estimation team has already {existing_estimation_status.status} this purchase request'}), 400

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

        estimation_info = {
            'full_name': user_name,
            'user_id': user_id,
            'email': current_user.get('email', ''),
            'role': role.role
        }

        # Create status entry in database
        try:
            # Determine receiver role based on decision
            if estimation_status == 'approved':
                receiver_role = 'technicalDirector'
            else:  # rejected
                if rejection_type == 'cost':
                    receiver_role = 'procurement'
                else:  # pm_flag
                    receiver_role = 'projectManager'
            
            new_status = PurchaseStatus.create_new_status(
                purchase_id=purchase_id,
                sender_role='estimation',
                receiver_role=receiver_role,
                status='approved' if estimation_status == 'approved' else 'rejected',
                decision_by_user_id=user_id,
                reject_category=rejection_type,
                rejection_reason=rejection_reason if estimation_status == 'rejected' else None,
                comments=comments,
                created_by=user_name
            )
            
            # Update purchase last_modified fields
            purchase.last_modified_at = datetime.utcnow()
            purchase.last_modified_by = user_name
            
            db.session.commit()
            log.info(f"Purchase request #{purchase_id} {new_status.status} by Estimation team {user_name}")
        except Exception as e:
            db.session.rollback()
            log.error(f"Error updating purchase status in database: {str(e)}")
            return jsonify({'error': 'Failed to update purchase status in database'}), 500

        # Send appropriate email based on decision
        email_service = EmailService()
        email_success = False
        message = ""
        
        # Check if this is a resubmission
        is_resubmission = (existing_estimation_status and 
                          existing_estimation_status.status == 'rejected' and 
                          (pm_approved_after_estimation or procurement_resubmitted_after_estimation or purchase_modified_after_estimation))
        
        if estimation_status == 'approved':
            # Estimation approves - send to Technical Director
            email_success = email_service.send_estimation_to_technical_director_notification(
                purchase_data, materials, requester_info, estimation_info
            )
            if is_resubmission:
                message = f'Purchase request #{purchase_id} approved by Estimation team (resubmission) and sent to Technical Director'
            else:
                message = f'Purchase request #{purchase_id} approved by Estimation team and sent to Technical Director'
        else:
            # Estimation rejects - send based on rejection type
            if rejection_type == 'cost':
                # Cost rejection - send back to Procurement team
                email_success = email_service.send_estimation_cost_rejection_to_procurement(
                    purchase_data, materials, requester_info, estimation_info, rejection_reason
                )
                if is_resubmission:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (Cost rejection - resubmission) and sent back to Procurement team'
                else:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (Cost rejection) and sent back to Procurement team'
            else:  # pm_flag
                # PM flag rejection - send back to Project Manager
                email_success = email_service.send_estimation_pm_flag_rejection_to_pm(
                    purchase_data, materials, requester_info, estimation_info, rejection_reason
                )
                if is_resubmission:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (PM Flag - resubmission) and sent back to Project Manager'
                else:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (PM Flag) and sent back to Project Manager'

        # Return response
        response_data = {
            'success': True,
            'message': message,
            'purchase_id': purchase_id,
            'estimation_status': new_status.status,
            'decision_date': new_status.decision_date.isoformat(),
            'decision_by': new_status.created_by,
            'comments': new_status.comments
        }
        
        if estimation_status == 'rejected':
            response_data['rejection_reason'] = new_status.rejection_reason
            response_data['rejection_type'] = rejection_type
        
        if not email_success:
            response_data['email_warning'] = 'Status updated but email notification failed'
            log.warning(f"Purchase status updated but email failed for purchase #{purchase_id}")
        else:
            # Update the existing status entry to indicate email was sent
            try:
                new_status.comments = f"{new_status.comments} (Email sent to {receiver_role})"
                db.session.commit()
                log.info(f"Updated status entry to indicate email sent for purchase #{purchase_id}")
            except Exception as e:
                log.error(f"Error updating status comments: {str(e)}")

        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error in estimation_approval_workflow: {str(e)}")
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

def check_estimation_approval_status(purchase_id):
    """Check if Estimation team has approved a purchase request"""
    try:
        # Get purchase request
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Get Estimation status
        estimation_status = PurchaseStatus.get_latest_status_by_role(purchase_id, 'estimation')
        
        if not estimation_status:
            return jsonify({
                'success': True,
                'purchase_id': purchase_id,
                'estimation_status': 'pending',
                'message': 'Estimation team has not yet reviewed this purchase request'
            }), 200
        
        # Get user details who made the decision
        from models.user import User
        decision_maker = User.query.filter_by(user_id=estimation_status.decision_by_user_id).first()
        decision_maker_name = decision_maker.full_name if decision_maker else 'Unknown'
        
        return jsonify({
            'success': True,
            'purchase_id': purchase_id,
            'estimation_status': estimation_status.status,
            'decision_date': estimation_status.decision_date.isoformat() if estimation_status.decision_date else None,
            'decision_by': decision_maker_name,
            'decision_by_user_id': estimation_status.decision_by_user_id,
            'rejection_reason': estimation_status.rejection_reason,
            'comments': estimation_status.comments,
            'message': f'Estimation team has {estimation_status.status} this purchase request'
        }), 200

    except Exception as e:
        log.error(f"Error checking Estimation approval status for purchase {purchase_id}: {str(e)}")
        return jsonify({'error': 'Failed to check Estimation approval status'}), 500