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
        if purchase_status not in ['approved', 'reject']:
            return jsonify({'error': 'purchase_status must be either "approved" or "reject"'}), 400
        
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
            new_status = PurchaseStatus.create_new_status(
                purchase_id=purchase_id,
                role='projectManager',
                status='approved' if purchase_status == 'approved' else 'rejected',
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
        
        if purchase_status == 'reject':
            response_data['rejection_reason'] = new_status.rejection_reason
        
        if not email_success:
            response_data['email_warning'] = 'Status updated but email notification failed'
            log.warning(f"Purchase status updated but email failed for purchase #{purchase_id}")

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
        procurement_approved_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.role == 'procurement',
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
                    PurchaseStatus.role == 'procurement',
                    PurchaseStatus.status == 'approved'
                )
            ).order_by(PurchaseStatus.created_at.desc()).first()
            
            # Also get the latest status for reference
            latest_status = PurchaseStatus.query.filter_by(
                purchase_id=purchase_id
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
                
                approved_procurement_purchases.append({
                    'purchase_id': purchase.purchase_id,
                    'site_location': purchase.site_location,
                    'purpose': purchase.purpose,
                    'date': purchase.date,
                    'email_sent': purchase.email_sent,
                    'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                    'materials_summary': material_summary,
                    'procurement_approved_status': {
                        'status': procurement_approved_status.status,
                        'role': procurement_approved_status.role,
                        'date': procurement_approved_status.created_at.isoformat() if procurement_approved_status.created_at else None,
                        'decision_by_user_id': procurement_approved_status.decision_by_user_id,
                        'comments': procurement_approved_status.comments
                    },
                    'current_status': {
                        'status': latest_status.status,
                        'role': latest_status.role,
                        'date': latest_status.created_at.isoformat() if latest_status.created_at else None,
                        'decision_by_user_id': latest_status.decision_by_user_id,
                        'comments': latest_status.comments
                    }
                })
        return jsonify({
            'success': True,
            'total_approved_procurement_purchases': len(approved_procurement_purchases),
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
                PurchaseStatus.role == 'projectManager'
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()
        
        # Get ALL procurement statuses (approved and rejected)
        procurement_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.role == 'procurement'
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()
        
        # Get latest status from project manager or procurement only
        latest_status = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.role.in_(['projectManager', 'procurement'])
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
                'role': 'projectManager',
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
                'role': 'procurement',
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
        
        return jsonify({
            'success': True,
            'purchase_id': purchase_id,
            'purchase_details': {
                'site_location': purchase.site_location,
                'purpose': purchase.purpose,
                'date': purchase.date,
                'email_sent': purchase.email_sent,
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'materials_summary': material_summary
            },
            'project_manager_statuses': pm_status_list,
            'procurement_statuses': procurement_status_list,
            'latest_pm_proc_status': {
                'status': latest_status.status if latest_status else 'pending',
                'role': latest_status.role if latest_status else None,
                'date': latest_status.created_at.isoformat() if latest_status and latest_status.created_at else None,
                'decision_by': latest_decision_maker,
                'comments': latest_status.comments if latest_status else None
            },
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