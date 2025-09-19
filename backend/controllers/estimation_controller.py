from flask import g, request, jsonify
from datetime import datetime
import threading

from sqlalchemy import and_, or_
from models.purchase_status import PurchaseStatus
from models.material import Material
from utils.email_service import EmailService
from config.logging import get_logger

from config.db import db
from models.role import Role
from models.purchase import Purchase
from models.approval import Approval
from models.purchase_history import PurchaseHistory

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

        # Update single-row status in database (no insert)
        try:
            # Determine receiver role based on decision
            if estimation_status == 'approved':
                receiver_role = 'technicalDirector'
            else:  # rejected
                if rejection_type == 'cost':
                    receiver_role = 'procurement'
                else:  # pm_flag
                    receiver_role = 'projectManager'
            
            existing_status = PurchaseStatus.get_latest_status(purchase_id)
            if existing_status:
                existing_status.sender = 'estimation'
                existing_status.receiver = receiver_role
                existing_status.role = 'estimation'
                existing_status.status = 'approved' if estimation_status == 'approved' else 'rejected'
                existing_status.decision_by_user_id = user_id
                existing_status.rejection_reason = rejection_reason if estimation_status == 'rejected' else None
                existing_status.reject_category = rejection_type if estimation_status == 'rejected' else None
                existing_status.comments = comments
                existing_status.decision_date = datetime.utcnow()
                existing_status.is_active = True
                existing_status.last_modified_by = user_name
                db.session.add(existing_status)
                updated_status = existing_status
            else:
                updated_status = PurchaseStatus(
                purchase_id=purchase_id,
                    sender='estimation',
                    receiver=receiver_role,
                    role='estimation',
                status='approved' if estimation_status == 'approved' else 'rejected',
                decision_by_user_id=user_id,
                rejection_reason=rejection_reason if estimation_status == 'rejected' else None,
                    reject_category=rejection_type if estimation_status == 'rejected' else None,
                comments=comments,
                    created_by=user_name,
                    is_active=True
            )
                db.session.add(updated_status)
            
            # Update purchase last_modified fields
            purchase.last_modified_at = datetime.utcnow()
            purchase.last_modified_by = user_name
            db.session.add(purchase)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            log.error(f"Error updating purchase status in database: {str(e)}")
            return jsonify({'error': 'Failed to update purchase status in database'}), 500

        # Check if this is a resubmission
        is_resubmission = (existing_estimation_status and
                          existing_estimation_status.status == 'rejected' and
                          (pm_approved_after_estimation or procurement_resubmitted_after_estimation or purchase_modified_after_estimation))

        # Prepare message based on decision
        if estimation_status == 'approved':
            if is_resubmission:
                message = f'Purchase request #{purchase_id} approved by Estimation team (resubmission) and sent to Technical Director'
            else:
                message = f'Purchase request #{purchase_id} approved by Estimation team and sent to Technical Director'
        else:
            # Estimation rejects - send based on rejection type
            if rejection_type == 'cost':
                if is_resubmission:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (Cost rejection - resubmission) and sent back to Procurement team'
                else:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (Cost rejection) and sent back to Procurement team'
            else:  # pm_flag
                if is_resubmission:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (PM Flag - resubmission) and sent back to Project Manager'
                else:
                    message = f'Purchase request #{purchase_id} rejected by Estimation team (PM Flag) and sent back to Project Manager'

        # Send email asynchronously in background thread with app context
        def send_email_async(app_context):
            try:
                with app_context:
                    email_service = EmailService()
                    if estimation_status == 'approved':
                        # Estimation approves - send to Technical Director
                        success = email_service.send_estimation_to_technical_director_notification(
                            purchase_data, materials, requester_info, estimation_info
                        )
                        if success:
                            log.info(f"Email sent successfully for approved purchase #{purchase_id} to Technical Director")
                        else:
                            log.warning(f"Failed to send email for approved purchase #{purchase_id}")
                    else:
                        # Estimation rejects - send based on rejection type
                        if rejection_type == 'cost':
                            # Cost rejection - send back to Procurement team
                            success = email_service.send_estimation_cost_rejection_to_procurement(
                                purchase_data, materials, requester_info, estimation_info, rejection_reason
                            )
                            if success:
                                log.info(f"Email sent successfully for cost-rejected purchase #{purchase_id} to Procurement")
                            else:
                                log.warning(f"Failed to send email for cost-rejected purchase #{purchase_id}")
                        else:  # pm_flag
                            # PM flag rejection - send back to Project Manager
                            success = email_service.send_estimation_pm_flag_rejection_to_pm(
                                purchase_data, materials, requester_info, estimation_info, rejection_reason
                            )
                            if success:
                                log.info(f"Email sent successfully for PM-flag-rejected purchase #{purchase_id} to Project Manager")
                            else:
                                log.warning(f"Failed to send email for PM-flag-rejected purchase #{purchase_id}")
            except Exception as e:
                log.error(f"Error sending email for purchase #{purchase_id}: {str(e)}")

        # Start email thread with app context
        from flask import current_app
        app_context = current_app.app_context()
        email_thread = threading.Thread(target=send_email_async, args=(app_context,))
        email_thread.daemon = True  # Daemon thread will not block app shutdown
        email_thread.start()

        # Append purchase history single-row action (no separate email action)
        try:
            def _append_purchase_history_action_local(purchase_id_local: int, action_payload: dict, actor_name: str):
                existing = PurchaseHistory.query.filter_by(purchase_id=purchase_id_local, is_active=True).order_by(PurchaseHistory.created_at.asc()).first()
                if not existing:
                    hist = PurchaseHistory(
                        purchase_id=purchase_id_local,
                        is_active=True,
                        action=[action_payload],
                        created_by=actor_name
                    )
                    db.session.add(hist)
                else:
                    actions = existing.action
                    if actions is None:
                        actions = []
                    elif isinstance(actions, dict):
                        actions = [actions]
                    elif isinstance(actions, str):
                        try:
                            import json as _json
                            parsed = _json.loads(actions)
                            if isinstance(parsed, list):
                                actions = parsed
                            elif isinstance(parsed, dict):
                                actions = [parsed]
                            else:
                                actions = [str(actions)]
                        except Exception:
                            actions = [str(actions)]
                    actions.append(action_payload)
                    existing.action = actions
                    try:
                        from sqlalchemy.orm.attributes import flag_modified as _flag_modified
                        _flag_modified(existing, 'action')
                    except Exception:
                        pass
                    existing.last_modified_by = actor_name
                    db.session.add(existing)

                db.session.commit()

            if estimation_status == 'approved':
                hist_receiver = 'technicalDirector'
                hist_comments = 'Purchase request approved by Estimation team and sent to Technical Director'
            else:
                if rejection_type == 'cost':
                    hist_receiver = 'procurement'
                    hist_comments = 'Purchase request rejected by Estimation team (Cost rejection) and sent back to Procurement team'
                else:
                    hist_receiver = 'projectmanager'
                    hist_comments = 'Purchase request rejected by Estimation team (PM Flag) and sent back to Project Manager'

            _append_purchase_history_action_local(
                purchase_id,
                {
                    'type': 'status_change',
                    'status': 'approved' if estimation_status == 'approved' else 'rejected',
                    'sender': 'estimation',
                    'receiver': hist_receiver,
                    'comments': hist_comments,
                    'rejection_reason': rejection_reason if estimation_status == 'rejected' else None,
                    'reject_category': rejection_type if estimation_status == 'rejected' else None,
                    'decided_by_user_id': user_id,
                    'decided_by': user_name,
                    'role': 'estimation',
                    'timestamp': datetime.utcnow().isoformat()
                },
                user_name
            )
        except Exception as he:
            log.error(f"Failed to append purchase history (Estimation flow): {str(he)}")

        # Return response immediately (email is being sent in background)
        response_data = {
            'success': True,
            'message': message,
            'purchase_id': purchase_id,
            'estimation_status': updated_status.status,
            'decision_date': updated_status.decision_date.isoformat() if updated_status.decision_date else None,
            'decision_by': updated_status.created_by,
            'comments': updated_status.comments,
            'email_status': 'Email notification is being sent in background'
        }

        if estimation_status == 'rejected':
            response_data['rejection_reason'] = updated_status.rejection_reason
            response_data['rejection_type'] = rejection_type

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

        # Optimized query without ordering (will sort later)
        all_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.is_active == True,
                ~PurchaseStatus.role.in_(['siteSupervisor', 'procurement'])
            )
        ).all()

        latest_overall_status = {}  # Latest status record for display
        estimation_decisions = {}  # Track estimation team's actual decisions
        pm_decisions = {}  # Track PM's decisions

        # Group statuses by purchase_id using defaultdict for efficiency
        from collections import defaultdict
        purchase_status_map = defaultdict(list)
        for status in all_statuses:
            purchase_status_map[status.purchase_id].append(status)
        
        # Process each purchase to find relevant statuses
        for purchase_id, statuses in purchase_status_map.items():
            # Sort statuses by created_at (oldest to newest) to process in order
            statuses.sort(key=lambda x: x.created_at)

            # Track if estimation has ever been involved
            estimation_involved = False
            last_estimation_action = None
            estimation_has_decided = False

            # Check all statuses to see if estimation is involved
            for status in statuses:
                # Check if estimation sent something
                if status.sender == 'estimation':
                    estimation_involved = True
                    estimation_has_decided = True
                    last_estimation_action = status
                # Check if estimation received something
                elif status.receiver == 'estimation':
                    estimation_involved = True
                # Check if PM sent to estimation initially
                elif status.sender == 'projectManager' and status.status == 'approved':
                    estimation_involved = True

            # Get the latest status
            latest_status = statuses[-1] if statuses else None

            # Skip if estimation was never involved
            if not estimation_involved:
                continue

            # Initialize estimation status
            estimation_status_to_show = 'pending'

            # Determine estimation_status based on the latest status
            if latest_status:
                # Check if this is a re-submission (estimation rejected before, now back with estimation)
                is_resubmission = (last_estimation_action and
                                 last_estimation_action.status == 'rejected' and
                                 latest_status.receiver == 'estimation' and
                                 latest_status.created_at > last_estimation_action.created_at)

                # Apply status rules
                if latest_status.receiver == 'accounts':
                    # Reached accounts, show completed
                    estimation_status_to_show = 'completed'
                elif is_resubmission:
                    # Back with estimation for re-review after rejection
                    estimation_status_to_show = 'pending'
                elif latest_status.receiver == 'estimation':
                    # Waiting for estimation action
                    estimation_status_to_show = 'pending'
                elif latest_status.sender == 'estimation':
                    # Show estimation's actual decision
                    estimation_status_to_show = latest_status.status
                elif latest_status.sender == 'projectManager' and latest_status.status == 'rejected':
                    # PM rejected
                    estimation_status_to_show = 'rejected'
                elif latest_status.sender == 'procurement':
                    # Procurement handling - if after estimation rejection, keep rejected
                    if last_estimation_action and last_estimation_action.status == 'rejected':
                        # But if going back to PM, it might come back to estimation
                        if latest_status.receiver == 'projectManager':
                            estimation_status_to_show = 'pending'
                        else:
                            estimation_status_to_show = 'rejected'
                    else:
                        estimation_status_to_show = 'pending'
                elif latest_status.sender == 'technicalDirector' and latest_status.status == 'approved':
                    # TD approved
                    estimation_status_to_show = 'approved'
                elif latest_status.sender == 'technicalDirector' and latest_status.status == 'rejected':
                    # TD rejected - might go back to estimation
                    if latest_status.receiver == 'estimation':
                        estimation_status_to_show = 'pending'
                    else:
                        estimation_status_to_show = 'rejected'
                elif last_estimation_action:
                    # Use last estimation action if nothing else matches
                    estimation_status_to_show = last_estimation_action.status
                else:
                    # Default to pending
                    estimation_status_to_show = 'pending'

            # Since estimation is involved, always store this purchase
            # Store the latest overall status for display
            latest_overall_status[purchase_id] = latest_status

            # Store PM's decision - look for PM as sender in all statuses
            pm_status = 'pending'
            for status in statuses:
                if status.sender == 'projectManager':
                    pm_status = status.status
                    # Don't break - get the latest PM decision

            pm_decisions[purchase_id] = {'status': pm_status}

            # Store Estimation's decision using the new simplified logic
            if estimation_status_to_show:
                estimation_decisions[purchase_id] = {'status': estimation_status_to_show}
            else:
                estimation_decisions[purchase_id] = {'status': 'pending'}
        # Get completed status information - optimized with set for O(1) lookups
        completed_status_records = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.is_active == True,
                PurchaseStatus.status == 'completed',
                PurchaseStatus.sender == 'accounts',
                PurchaseStatus.receiver == 'accounts'
            )
        ).all()

        # Use set for O(1) lookup performance
        completed_purchase_ids = {cs.purchase_id for cs in completed_status_records}
        # Batch load all purchases at once to avoid N+1 queries
        purchase_ids = list(latest_overall_status.keys())
        all_purchases = {p.purchase_id: p for p in
                        Purchase.query.filter(
                            and_(Purchase.purchase_id.in_(purchase_ids),
                                Purchase.is_deleted == False)
                        ).all()}

        # Collect all material IDs for batch loading
        all_material_ids = set()
        for p in all_purchases.values():
            if p.material_ids:
                all_material_ids.update(p.material_ids)

        # Batch load all materials at once
        all_materials = {}
        if all_material_ids:
            all_materials = {m.material_id: m for m in
                           Material.query.filter(
                               and_(Material.material_id.in_(list(all_material_ids)),
                                   Material.is_deleted == False)
                           ).all()}

        # Initialize statistics tracking for single-pass calculation
        stats = {'approved': {'count': 0, 'value': 0, 'quantity': 0},
                'rejected': {'count': 0, 'value': 0, 'quantity': 0},
                'pending': {'count': 0, 'value': 0, 'quantity': 0},
                'completed': {'count': 0, 'value': 0, 'quantity': 0}}
        total_value = 0
        total_quantity_sum = 0

        purchase_details = []
        for purchase_id, status in latest_overall_status.items():
            purchase = all_purchases.get(purchase_id)
            if not purchase:
                continue

            materials = []
            total_material_cost = 0
            total_quantity = 0
            if purchase.material_ids:
                material_objects = [all_materials.get(mid) for mid in purchase.material_ids
                                  if mid in all_materials]

                for mat in material_objects:
                    if mat:
                        material_cost = float(mat.cost or 0)  # Simplified null check
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
            est_decision = estimation_decisions.get(purchase_id, {}).get('status', 'pending')
            pm_decision = pm_decisions.get(purchase_id, {}).get('status', 'pending')
            
            # Simplified completed status check using set for O(1) lookup
            completed_status_value = 'completed' if purchase_id in completed_purchase_ids else 'pending'
            
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
                    'pm_status': pm_decision,  # PM's actual decision
                    'estimation_status': est_decision,  # Estimation's actual decision
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
                    'last_modified_by': status.last_modified_by,
                    'completed_status': completed_status_value
                }
            }
            
            purchase_details.append(purchase_detail)

            # Update statistics in single pass (avoiding multiple iterations)
            stats[est_decision]['count'] += 1
            stats[est_decision]['value'] += total_material_cost
            stats[est_decision]['quantity'] += total_quantity
            total_value += total_material_cost
            total_quantity_sum += total_quantity

        # Sort by latest status creation date (newest first)
        purchase_details.sort(key=lambda x: x['status_info']['created_at'], reverse=True)

        total_count = len(purchase_details)
        total_value = sum(p['total_cost'] for p in purchase_details)
        total_quantity = sum(p['total_quantity'] for p in purchase_details)

        response_data = {
            'success': True,
            'summary': {
                'total_count': total_count,
                'approved_count': stats['approved']['count'],
                'rejected_count': stats['rejected']['count'],
                'pending_count': stats['pending']['count'],
                'completed_count': stats['completed']['count'],
                'total_value': round(total_value, 2),
                'approved_value': round(stats['approved']['value'], 2),
                'rejected_value': round(stats['rejected']['value'], 2),
                'pending_value': round(stats['pending']['value'], 2),
                'completed_value': round(stats['completed']['value'], 2),
                'total_quantity': total_quantity_sum,
                'approved_quantity': stats['approved']['quantity'],
                'rejected_quantity': stats['rejected']['quantity'],
                'pending_quantity': stats['pending']['quantity'],
                'completed_quantity': stats['completed']['quantity']
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