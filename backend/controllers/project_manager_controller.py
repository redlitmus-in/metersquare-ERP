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
from models.project import Project

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

def get_procurement_approved_purchases():
    """Get purchases where role is procurement and status is approved"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # First, get all procurement approved statuses
        total_purchase = Purchase.query.filter_by(is_deleted = False).count()
        procurement_approved_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'procurement',
                PurchaseStatus.status == 'approved'
            )
        ).all()
        
        # Get unique purchase IDs from these statuses
        procurement_approved_purchase_ids = list(set([status.purchase_id for status in procurement_approved_statuses]))
        # Now get the latest status for each purchase to ensure we have the most recent
        approved_procurement_purchases = []
        procurement_approved_count = 0
        
        for purchase_id in procurement_approved_purchase_ids:
            # Get the procurement approved status for this purchase (not necessarily the latest)
            procurement_approved_status = PurchaseStatus.query.filter(
                and_(
                    PurchaseStatus.purchase_id == purchase_id,
                    PurchaseStatus.sender == 'procurement',
                    PurchaseStatus.status == 'approved'
                )
            ).order_by(PurchaseStatus.created_at.desc()).first()
            
            # Get the latest status for reference
            latest_status = PurchaseStatus.query.filter_by(
                purchase_id=purchase_id
            ).order_by(PurchaseStatus.created_at.desc()).first()
            
            # Get project manager status (if any)
            pm_status = PurchaseStatus.query.filter(
                and_(
                    PurchaseStatus.purchase_id == purchase_id,
                    PurchaseStatus.sender == 'projectManager'
                )
            ).order_by(PurchaseStatus.created_at.desc()).first()
            
            # Include if it was ever approved by procurement
            if procurement_approved_status:
                
                # Get the purchase details
                purchase = Purchase.query.filter(
                    and_(
                        Purchase.purchase_id == purchase_id,
                        Purchase.is_deleted == False
                    )
                ).first()
                
                if purchase:
                    procurement_approved_count += 1
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
                    'categories': list({m.category for m in materials if m.category})
                }
                
                # Determine current workflow status
                current_workflow_status = 'pending_pm_review'
                if pm_status:
                    if pm_status.status == 'approved':
                        current_workflow_status = 'pm_approved'
                    elif pm_status.status == 'rejected':
                        current_workflow_status = 'pm_rejected'
                elif latest_status and latest_status.sender == 'estimation':
                    current_workflow_status = 'estimation_review'
                elif latest_status and latest_status.sender == 'technicalDirector':
                    current_workflow_status = 'technical_director_review'
                elif latest_status and latest_status.sender == 'accounts':
                    current_workflow_status = 'accounts_processing'
                
                # Get all statuses for this purchase to show complete history
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
                
                approved_procurement_purchases.append({
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
                    'status_history': status_history
                })
        # Calculate summary statistics based on current workflow status
        total_approved_procurement_purchases = len(approved_procurement_purchases)
        non_approval_project_manager_purchases = total_purchase - total_approved_procurement_purchases
        
        # Count by workflow status
        pending_pm_review_count = len([p for p in approved_procurement_purchases if p['current_workflow_status'] == 'pending_pm_review'])
        pm_approved_count = len([p for p in approved_procurement_purchases if p['current_workflow_status'] == 'pm_approved'])
        pm_rejected_count = len([p for p in approved_procurement_purchases if p['current_workflow_status'] == 'pm_rejected'])
        estimation_review_count = len([p for p in approved_procurement_purchases if p['current_workflow_status'] == 'estimation_review'])
        technical_director_review_count = len([p for p in approved_procurement_purchases if p['current_workflow_status'] == 'technical_director_review'])
        accounts_processing_count = len([p for p in approved_procurement_purchases if p['current_workflow_status'] == 'accounts_processing'])
        
        # Calculate financial summary
        total_value = sum(p['materials_summary']['total_cost'] for p in approved_procurement_purchases)
        pending_pm_value = sum(p['materials_summary']['total_cost'] for p in approved_procurement_purchases if p['current_workflow_status'] == 'pending_pm_review')
        pm_approved_value = sum(p['materials_summary']['total_cost'] for p in approved_procurement_purchases if p['current_workflow_status'] == 'pm_approved')
        pm_rejected_value = sum(p['materials_summary']['total_cost'] for p in approved_procurement_purchases if p['current_workflow_status'] == 'pm_rejected')
        
        return jsonify({
            'success': True,
            'summary': {
                'total_approved_procurement_purchases': total_approved_procurement_purchases,
                'non_approval_project_manager_purchases': non_approval_project_manager_purchases,
                'workflow_status_counts': {
                    'pending_pm_review': pending_pm_review_count,
                    'pm_approved': pm_approved_count,
                    'pm_rejected': pm_rejected_count,
                    'estimation_review': estimation_review_count,
                    'technical_director_review': technical_director_review_count,
                    'accounts_processing': accounts_processing_count
                },
                'financial_summary': {
                    'total_value': round(total_value, 2),
                    'pending_pm_value': round(pending_pm_value, 2),
                    'pm_approved_value': round(pm_approved_value, 2),
                    'pm_rejected_value': round(pm_rejected_value, 2)
                }
            },
            'approved_procurement_purchases': approved_procurement_purchases
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

def _get_pm_dashboard_metrics(user_id):
    """Get key metrics for project manager dashboard"""
    try:
        # Get current user info for debugging
        current_user = g.user
        user_email = current_user.get('email', 'unknown') if current_user else 'unknown'
        
        # Total purchases managed by this PM (using email since created_by is string)
        total_purchases = Purchase.query.filter_by(is_deleted = False).count()
        # Project Manager approval statistics
        pm_approved_count = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.status == 'approved'
            )
        ).count()
        
        pm_rejected_count = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.status == 'rejected'
            )
        ).count()
       
        pm_received_counts = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'procurement',
                PurchaseStatus.status == 'approved'
            )
        ).count()

        pm_received_count = set(pm_received_counts)
        print("pm_received_count:", pm_received_count)
        # Pending approvals
        pending_approvals = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.status == 'pending'
            )
        ).count()
        
        # Total procurement approved count
        procurement_approved_count = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'procurement',
                PurchaseStatus.status == 'approved'
            )
        ).count()
        
        # Approved this month
        from datetime import datetime, timedelta
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        approved_this_month = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.status == 'approved',
                PurchaseStatus.created_at >= current_month
            )
        ).count()
        
        # Rejected this month
        rejected_this_month = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.status == 'rejected',
                PurchaseStatus.created_at >= current_month
            )
        ).count()
        
        # Debug logging
        log.info(f"PM Dashboard Metrics for user {user_email}:")
        log.info(f"  Total purchases: {total_purchases}")
        log.info(f"  PM approved: {pm_approved_count}")
        log.info(f"  PM rejected: {pm_rejected_count}")
        log.info(f"  Procurement approved: {procurement_approved_count}")
        
        return {
            'total_purchases': total_purchases,
            'pm_received_count': pm_received_count,
            'pm_approved_count': pm_approved_count,
            'pm_rejected_count': pm_rejected_count,
            'procurement_received_approval_count': procurement_approved_count,
            'pending_approvals': pending_approvals,
            'approved_this_month': approved_this_month,
            'rejected_this_month': rejected_this_month
        }
        
    except Exception as e:
        log.error(f"Error getting PM dashboard metrics: {str(e)}")
        return {
            'total_purchases': 0,
            'pm_received_count': 0,
            'pm_approved_count': 0,
            'pm_rejected_count': 0,
            'procurement_received_approval_count': 0,
            'pending_approvals': 0,
            'approved_this_month': 0,
            'rejected_this_month': 0
        }

def _get_pm_recent_purchase_requests(user_id):
    """Get recent purchase requests for project manager"""
    try:
        # Get recent purchases (last 10)
        recent_purchases = Purchase.query.filter(
            Purchase.is_deleted == False
        ).order_by(Purchase.created_at.desc()).limit(10).all()
        
        log.info(f"Found {len(recent_purchases)} recent purchases")
        
        recent_data = []
        for purchase in recent_purchases:
            # Get latest status from project manager
            pm_status = PurchaseStatus.query.filter(
                and_(
                    PurchaseStatus.purchase_id == purchase.purchase_id,
                    PurchaseStatus.sender == 'projectManager'
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
                'categories': list({m.category for m in materials if m.category})
            }
            
            recent_data.append({
                'purchase_id': purchase.purchase_id,
                'site_location': purchase.site_location,
                'purpose': purchase.purpose,
                'date': purchase.date,
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'email_sent': purchase.email_sent,
                'materials_summary': material_summary,
                'pm_status': pm_status.status if pm_status else 'pending',
                'pm_status_date': pm_status.created_at.isoformat() if pm_status and pm_status.created_at else None,
                'pm_comments': pm_status.comments if pm_status else None
            })
        
        log.info(f"Returning {len(recent_data)} recent purchase requests")
        return recent_data
        
    except Exception as e:
        log.error(f"Error getting PM recent purchase requests: {str(e)}")
        return []

def _get_pm_purchase_analytics(user_id):
    """Get purchase analytics for project manager"""
    try:
        # Get all purchases
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).all()
        
        log.info(f"Found {len(all_purchases)} total purchases for analytics")
        
        # Calculate analytics
        total_purchases = len(all_purchases)
        email_sent_true = len([p for p in all_purchases if p.email_sent == True])
        email_sent_false = len([p for p in all_purchases if p.email_sent == False])
        
        log.info(f"Email sent: {email_sent_true} true, {email_sent_false} false")
        
        # Get material details
        material_details = _get_pm_material_details(all_purchases)
        
        return {
            'total_purchases': total_purchases,
            'email_sent_true': email_sent_true,
            'email_sent_false': email_sent_false,
            'material_details': material_details
        }
        
    except Exception as e:
        log.error(f"Error getting PM purchase analytics: {str(e)}")
        return {
            'total_purchases': 0,
            'email_sent_true': 0,
            'email_sent_false': 0,
            'material_details': {
                'total_materials': 0,
                'total_quantity': 0,
                'total_cost': 0,
                'units': [],
                'category_breakdown': {}
            }
        }

def _get_pm_material_details(purchases):
    """Get material details for purchases"""
    try:
        # Get all materials for these purchases
        all_materials = []
        for purchase in purchases:
            if purchase.material_ids:
                materials = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids)
                    )
                ).all()
                all_materials.extend(materials)
        
        # Calculate totals
        total_materials = len(all_materials)
        total_quantity = sum(m.quantity or 0 for m in all_materials)
        total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in all_materials)
        units = list({m.unit for m in all_materials if m.unit})
        
        # Get category breakdown
        category_breakdown = {}
        for material in all_materials:
            category = material.category or 'Uncategorized'
            if category not in category_breakdown:
                category_breakdown[category] = {
                    'count': 0,
                    'quantity': 0,
                    'cost': 0
                }
            category_breakdown[category]['count'] += 1
            category_breakdown[category]['quantity'] += material.quantity or 0
            category_breakdown[category]['cost'] += (material.cost or 0) * (material.quantity or 0)
        
        return {
            'total_materials': total_materials,
            'total_quantity': total_quantity,
            'total_cost': round(total_cost, 2),
            'units': units,
            'category_breakdown': category_breakdown
        }
        
    except Exception as e:
        log.error(f"Error getting PM material details: {str(e)}")
        return {
            'total_materials': 0,
            'total_quantity': 0,
            'total_cost': 0,
            'units': [],
            'category_breakdown': {}
        }

def _get_pm_approval_statistics(user_id):
    """Get approval statistics for project manager"""
    try:
        # Get all PM statuses
        pm_statuses = PurchaseStatus.query.filter(
            PurchaseStatus.sender == 'projectManager'
        ).all()
        
        log.info(f"Found {len(pm_statuses)} PM statuses")
        
        # Calculate statistics
        total_decisions = len(pm_statuses)
        approved_count = len([s for s in pm_statuses if s.status == 'approved'])
        rejected_count = len([s for s in pm_statuses if s.status == 'rejected'])
        # pending_count = len([s for s in pm_statuses if s.status == 'pending'])
        
        log.info(f"PM Statistics: {approved_count} approved, {rejected_count} rejected,")
        
        return {
            'total_purchases_count': total_decisions,
            'approved_count': approved_count,
            'rejected_count': rejected_count,
            # 'pending_count': pending_count,
        }
        
    except Exception as e:
        log.error(f"Error getting PM approval statistics: {str(e)}")
        return {
            'total_purchases_count': 0,
            'approved_count': 0,
            'rejected_count': 0,
        }

def _get_pm_project_summary(user_id):
    """Get project summary for project manager"""
    try:
        # Get all projects
        from models.project import Project
        projects = Project.query.filter(Project.is_deleted == False).all()
        
        # Calculate project statistics
        total_projects = len(projects)
        active_projects = len([p for p in projects if p.status == 'active'])
        completed_projects = len([p for p in projects if p.status == 'completed'])
        on_hold_projects = len([p for p in projects if p.status == 'on_hold'])
        
        # Get project locations
        locations = list({p.location for p in projects if p.location})
        
        return {
            'total_projects': total_projects,
            'active_projects': active_projects,
            'completed_projects': completed_projects,
            'on_hold_projects': on_hold_projects,
            'locations': locations
        }
        
    except Exception as e:
        log.error(f"Error getting PM project summary: {str(e)}")
        return {
            'total_projects': 0,
            'active_projects': 0,
            'completed_projects': 0,
            'on_hold_projects': 0,
            'locations': []
        }

def _get_pm_pending_approvals(user_id):
    """Get pending approvals for project manager"""
    try:
        # Get purchases that need PM approval
        pending_purchases = Purchase.query.filter(
            Purchase.is_deleted == False
        ).all()
        
        pending_data = []
        for purchase in pending_purchases:
            # Check if PM has already made a decision
            pm_status = PurchaseStatus.query.filter(
                and_(
                    PurchaseStatus.purchase_id == purchase.purchase_id,
                    PurchaseStatus.sender == 'projectManager'
                )
            ).order_by(PurchaseStatus.created_at.desc()).first()
            
            # Only include if PM hasn't made a decision or if it's pending
            if not pm_status or pm_status.status == 'pending':
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
                    'categories': list({m.category for m in materials if m.category})
                }
                
                pending_data.append({
                    'purchase_id': purchase.purchase_id,
                    'site_location': purchase.site_location,
                    'purpose': purchase.purpose,
                    'date': purchase.date,
                    'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                    'materials_summary': material_summary,
                    'current_status': pm_status.status if pm_status else 'pending',
                    'status_date': pm_status.created_at.isoformat() if pm_status and pm_status.created_at else None
                })
        
        return pending_data[:10]  # Limit to 10 most recent
        
    except Exception as e:
        log.error(f"Error getting PM pending approvals: {str(e)}")
        return []

def debug_dashboard_data():
    """Debug endpoint to check raw data"""
    try:
        # Check raw data counts
        total_purchases = Purchase.query.filter(Purchase.is_deleted == False).count()
        total_statuses = PurchaseStatus.query.count()
        total_materials = Material.query.filter(Material.is_deleted == False).count()
        total_projects = Project.query.filter(Project.is_deleted == False).count()
        
        # Check some sample data
        sample_purchases = Purchase.query.filter(Purchase.is_deleted == False).limit(3).all()
        sample_statuses = PurchaseStatus.query.limit(3).all()
        
        return jsonify({
            'success': True,
            'debug_data': {
                'counts': {
                    'total_purchases': total_purchases,
                    'total_statuses': total_statuses,
                    'total_materials': total_materials,
                    'total_projects': total_projects
                },
                'sample_purchases': [
                    {
                        'purchase_id': p.purchase_id,
                        'created_by': p.created_by,
                        'is_deleted': p.is_deleted,
                        'email_sent': p.email_sent
                    } for p in sample_purchases
                ],
                'sample_statuses': [
                    {
                        'status_id': s.status_id,
                        'purchase_id': s.purchase_id,
                        'sender': s.sender,
                        'status': s.status
                    } for s in sample_statuses
                ]
            }
        }), 200
        
    except Exception as e:
        log.error(f"Error in debug dashboard data: {str(e)}")
        return jsonify({'error': str(e)}), 500