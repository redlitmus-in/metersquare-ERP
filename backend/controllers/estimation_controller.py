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
        
        if existing_estimation_status and existing_estimation_status.status in ['approved', 'rejected']:
            # Check if there's a more recent status from other roles that indicates resubmission
            latest_pm_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'projectManager')
            latest_procurement_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'procurement')
            # Also check if the purchase was modified after the estimation's last decision
            purchase_modified_after_estimation = purchase.last_modified_at and existing_estimation_status.created_at and purchase.last_modified_at > existing_estimation_status.created_at
            
            pm_approved_after_estimation = (latest_pm_status and 
                                          latest_pm_status.status == 'approved' and 
                                          latest_pm_status.created_at > existing_estimation_status.created_at)
            
            procurement_resubmitted_after_estimation = (latest_procurement_status and 
                                                      latest_procurement_status.created_at > existing_estimation_status.created_at)
            
            if latest_pm_status and existing_estimation_status:
                log.info(f"PM status created at: {latest_pm_status.created_at}")
            
            if latest_procurement_status and existing_estimation_status:
                log.info(f"Procurement status created at: {latest_procurement_status.created_at}")
            
            if purchase.last_modified_at and existing_estimation_status.created_at:
                log.info(f"Purchase last modified at: {purchase.last_modified_at}")
            
            if pm_approved_after_estimation or procurement_resubmitted_after_estimation or purchase_modified_after_estimation:
                log.info(f"Allowing estimation to make new decision for purchase #{purchase_id} - resubmission detected")
            else:
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
        else:
            # Update the existing status entry to indicate email was sent
            try:
                new_status.comments = f"{new_status.comments} (Email sent to {receiver_role})"
                db.session.commit()
            except Exception as e:
                log.error(f"Error updating status comments: {str(e)}")

        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error in estimation_approval_workflow: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_estimation_dashboard():
    """Get estimation dashboard data based on purchase_status table with sender/receiver counts"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Estimation team
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'estimation':
            return jsonify({'error': 'Only Estimation team can access dashboard'}), 403

        # Get all status records where estimation is the SENDER (estimation team made decisions)
        estimation_sender_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'estimation',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Get all status records where estimation is the RECEIVER (estimation team received decisions)
        # These are purchases that were sent TO estimation team (from Project Manager)
        estimation_receiver_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.receiver == 'estimation',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Get purchases that are in estimation workflow but haven't been processed by estimation yet
        # These are purchases that have been approved by Project Manager but estimation hasn't acted on them
        pm_approved_purchase_ids = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.status == 'approved',
                PurchaseStatus.is_active == True
            )
        ).with_entities(PurchaseStatus.purchase_id).all()
        
        pm_approved_purchase_ids = [pid[0] for pid in pm_approved_purchase_ids]
        
        # Get purchases that estimation has already processed
        estimation_processed_purchase_ids = [status.purchase_id for status in estimation_sender_statuses]
        
        # Find purchases approved by PM but not yet processed by estimation (pending for estimation)
        estimation_sender_pending_purchases = Purchase.query.filter(
            and_(
                Purchase.is_deleted == False,
                Purchase.purchase_id.in_(pm_approved_purchase_ids),
                ~Purchase.purchase_id.in_(estimation_processed_purchase_ids)
            )
        ).all()

        # Get purchases that were sent to estimation but estimation hasn't responded yet (receiver pending)
        estimation_receiver_pending_purchases = Purchase.query.filter(
            and_(
                Purchase.is_deleted == False,
                Purchase.purchase_id.in_(pm_approved_purchase_ids),
                ~Purchase.purchase_id.in_([status.purchase_id for status in estimation_receiver_statuses])
            )
        ).all()

        # Process SENDER data (estimation team as sender)
        sender_approved_count = 0
        sender_rejected_count = 0
        sender_pending_count = 0
        sender_approved_details = []
        sender_rejected_details = []
        sender_pending_details = []

        # Process existing status records
        for status in estimation_sender_statuses:
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
        for purchase in estimation_sender_pending_purchases:
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
                    'sender': 'estimation',
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

        # Process RECEIVER data (estimation team as receiver)
        receiver_approved_count = 0
        receiver_rejected_count = 0
        receiver_pending_count = 0
        receiver_approved_details = []
        receiver_rejected_details = []
        receiver_pending_details = []

        for status in estimation_receiver_statuses:
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

        # Process receiver pending purchases (those sent to estimation but estimation hasn't responded)
        for purchase in estimation_receiver_pending_purchases:
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
                    'receiver': 'estimation',
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
        sender_total = sender_approved_count + sender_rejected_count
        receiver_total = receiver_approved_count + receiver_rejected_count

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
            'estimation_as_sender': {
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
            'estimation_as_receiver': {
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
        log.error(f"Error in get_estimation_dashboard: {str(e)}")
        return jsonify({'error': f'Failed to retrieve dashboard data: {str(e)}'}), 500

def get_all_estimation_purchase_request():
    """Get all estimation purchase requests where estimation is the receiver with detailed purchase information"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Estimation team
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'estimation':
            return jsonify({'error': 'Only Estimation team can access purchase requests'}), 403

        # Get all status records where estimation is the RECEIVER
        estimation_receiver_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.receiver == 'estimation',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        estimation_sender_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'estimation',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Use set to track unique purchase_ids and get latest status for each
        unique_purchase_ids = set()
        latest_statuses = {}
        estimation_decisions = {}  # Track estimation team decisions
        
        # Process estimation team decisions (sender statuses)
        for sender_status in estimation_sender_statuses:
            if sender_status.purchase_id not in unique_purchase_ids:
                unique_purchase_ids.add(sender_status.purchase_id)
                latest_statuses[sender_status.purchase_id] = sender_status
                # Track estimation team's decision
                estimation_decisions[sender_status.purchase_id] = sender_status.status

        # Process statuses where estimation is receiver (from PM)
        for status in estimation_receiver_statuses:
            if status.purchase_id not in unique_purchase_ids:
                unique_purchase_ids.add(status.purchase_id)
                latest_statuses[status.purchase_id] = status
                # If estimation hasn't made a decision yet, mark as pending
                if status.purchase_id not in estimation_decisions:
                    estimation_decisions[status.purchase_id] = 'pending'

        # Get detailed purchase information for each unique purchase
        purchase_details = []
        
        for purchase_id, status in latest_statuses.items():
            # Get purchase details
            purchase = Purchase.query.filter_by(
                purchase_id=purchase_id, 
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

            # Create detailed purchase information
            purchase_detail = {
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
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'created_by': purchase.created_by,
                'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
                'last_modified_by': purchase.last_modified_by,
                'status_info': {
                    'status_id': status.status_id,
                    'pm_status': status.status,
                    'estimation_status': estimation_decisions.get(purchase_id, 'pending'),
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
            
            purchase_details.append(purchase_detail)

        # Sort by latest status creation date (newest first)
        purchase_details.sort(key=lambda x: x['status_info']['created_at'], reverse=True)

        # Calculate summary statistics based on estimation status
        total_count = len(purchase_details)
        approved_count = len([p for p in purchase_details if p['status_info']['estimation_status'] == 'approved'])
        rejected_count = len([p for p in purchase_details if p['status_info']['estimation_status'] == 'rejected'])
        pending_count = len([p for p in purchase_details if p['status_info']['estimation_status'] == 'pending'])

        # Calculate financial summary based on estimation status
        total_value = sum(p['total_cost'] for p in purchase_details)
        approved_value = sum(p['total_cost'] for p in purchase_details if p['status_info']['estimation_status'] == 'approved')
        rejected_value = sum(p['total_cost'] for p in purchase_details if p['status_info']['estimation_status'] == 'rejected')
        pending_value = sum(p['total_cost'] for p in purchase_details if p['status_info']['estimation_status'] == 'pending')

        # Calculate quantity summary based on estimation status
        total_quantity = sum(p['total_quantity'] for p in purchase_details)
        approved_quantity = sum(p['total_quantity'] for p in purchase_details if p['status_info']['estimation_status'] == 'approved')
        rejected_quantity = sum(p['total_quantity'] for p in purchase_details if p['status_info']['estimation_status'] == 'rejected')
        pending_quantity = sum(p['total_quantity'] for p in purchase_details if p['status_info']['estimation_status'] == 'pending')

        response_data = {
            'success': True,
            'summary': {
                'total_count': total_count,
                'approved_count': approved_count,
                'rejected_count': rejected_count,
                'pending_count': pending_count,
                'total_value': round(total_value, 2),
                'approved_value': round(approved_value, 2),
                'rejected_value': round(rejected_value, 2),
                'pending_value': round(pending_value, 2),
                'total_quantity': total_quantity,
                'approved_quantity': approved_quantity,
                'rejected_quantity': rejected_quantity,
                'pending_quantity': pending_quantity
            },
            'purchases': purchase_details,
            'user_info': {
                'user_name': user_name,
                'user_id': user_id,
                'role': role.role
            },
            'last_updated': datetime.utcnow().isoformat()
        }

        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error in get_all_estimation_purchase_request: {str(e)}")
        return jsonify({'error': f'Failed to retrieve all estimation purchase request: {str(e)}'}), 500