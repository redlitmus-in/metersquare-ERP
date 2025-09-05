from flask import g, request, jsonify
from datetime import datetime
from sqlalchemy import and_
from sqlalchemy.orm import joinedload

from models.purchase_status import PurchaseStatus
from models.material import Material
from models.role import Role
from models.purchase import Purchase
from utils.email_service import EmailService
from config.logging import get_logger
from config.db import db

log = get_logger()

def technical_director_approval_workflow():
    """Technical Director approval workflow - approved/rejected with email notifications"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Technical Director
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'technicalDirector':
            return jsonify({'error': 'Only Technical Director can approve/reject purchase requests'}), 403

        data = request.get_json()
        purchase_id = data.get('purchase_id')
        technical_director_status = data.get('technical_director_status', '').lower()
        rejection_reason = data.get('rejection_reason', '')
        comments = data.get('comments', '')
        
        # Validate technical_director_status
        if technical_director_status not in ['approved', 'rejected']:
            return jsonify({'error': 'technical_director_status must be either "approved" or "rejected"'}), 400
        
        # If rejecting, require rejection reason
        if technical_director_status == 'rejected':
            if not rejection_reason or rejection_reason.strip() == '':
                return jsonify({'error': 'rejection_reason is required when technical_director_status is "rejected"'}), 400

        # Get purchase request
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Check if Technical Director already made a decision, but allow resubmission
        existing_td_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'technicalDirector')
        
        if existing_td_status and existing_td_status.status in ['approved', 'rejected']:
            # Check if there's a more recent status from estimation that indicates resubmission
            latest_estimation_status = PurchaseStatus.get_absolute_latest_status_by_role(purchase_id, 'estimation')
            
            # Check if the purchase was modified after the technical director's last decision
            purchase_modified_after_td = (purchase.last_modified_at and existing_td_status.created_at and 
                                        purchase.last_modified_at > existing_td_status.created_at)
            
            estimation_approved_after_td = (latest_estimation_status and 
                                          latest_estimation_status.status == 'approved' and 
                                          latest_estimation_status.created_at > existing_td_status.created_at)
            
            if estimation_approved_after_td or purchase_modified_after_td:
                log.info(f"Allowing technical director to make new decision for purchase #{purchase_id} - resubmission detected")
            else:
                return jsonify({'error': f'Technical Director has already {existing_td_status.status} this purchase request'}), 400

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

        technical_director_info = {
            'full_name': user_name,
            'user_id': user_id,
            'email': current_user.get('email', ''),
            'role': role.role
        }

        # Create status entry in database
        try:
            # Determine receiver role based on decision
            if technical_director_status == 'approved':
                receiver_role = 'accounts'
            else:  # rejected
                receiver_role = 'estimation'
            
            new_status = PurchaseStatus.create_new_status(
                purchase_id=purchase_id,
                sender_role='technicalDirector',
                receiver_role=receiver_role,
                status='approved' if technical_director_status == 'approved' else 'rejected',
                decision_by_user_id=user_id,
                rejection_reason=rejection_reason if technical_director_status == 'rejected' else None,
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
        is_resubmission = (existing_td_status and 
                          existing_td_status.status == 'rejected' and 
                          (estimation_approved_after_td or purchase_modified_after_td))
        
        if technical_director_status == 'approved':
            # Technical Director approves - send to Accounts
            email_success = email_service.send_technical_director_to_accounts_notification(
                purchase_data, materials, requester_info, technical_director_info
            )
            if is_resubmission:
                message = f'Purchase request #{purchase_id} approved by Technical Director (resubmission) and sent to Accounts'
            else:
                message = f'Purchase request #{purchase_id} approved by Technical Director and sent to Accounts'
        else:
            # Technical Director rejects - send back to Estimation
            email_success = email_service.send_technical_director_rejection_to_estimation(
                purchase_data, materials, requester_info, technical_director_info, rejection_reason
            )
            if is_resubmission:
                message = f'Purchase request #{purchase_id} rejected by Technical Director (resubmission) and sent back to Estimation team'
            else:
                message = f'Purchase request #{purchase_id} rejected by Technical Director and sent back to Estimation team'

        # Return response
        response_data = {
            'success': True,
            'message': message,
            'purchase_id': purchase_id,
            'technical_director_status': new_status.status,
            'decision_date': new_status.decision_date.isoformat(),
            'decision_by': new_status.created_by,
            'comments': new_status.comments
        }
        
        if technical_director_status == 'rejected':
            response_data['rejection_reason'] = new_status.rejection_reason
        
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
        log.error(f"Error in technical_director_approval_workflow: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_technical_director_dashboard():
    """Get technical director dashboard data based on purchase_status table with sender/receiver counts"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Technical Director
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'technicalDirector':
            return jsonify({'error': 'Only Technical Director can access dashboard'}), 403

        # Get all status records where technical director is the SENDER (technical director made decisions)
        td_sender_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'technicalDirector',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Get all status records where technical director is the RECEIVER (technical director received decisions)
        td_receiver_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.receiver == 'technicalDirector',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Process SENDER data (technical director as sender)
        sender_approved_count = 0
        sender_rejected_count = 0
        sender_pending_count = 0
        sender_approved_details = []
        sender_rejected_details = []
        sender_pending_details = []

        for status in td_sender_statuses:
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

        # Process RECEIVER data (technical director as receiver)
        receiver_approved_count = 0
        receiver_rejected_count = 0
        receiver_pending_count = 0
        receiver_approved_details = []
        receiver_rejected_details = []
        receiver_pending_details = []

        for status in td_receiver_statuses:
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

        # Calculate totals
        sender_total = sender_approved_count + sender_rejected_count + sender_pending_count
        receiver_total = receiver_approved_count + receiver_rejected_count + receiver_pending_count

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
            'technical_director_as_sender': {
                'total_count': sender_total,
                'approved_count': sender_approved_count,
                'rejected_count': sender_rejected_count,
                'pending_count': sender_pending_count,
                'approved_value': round(sender_approved_value, 2),
                'rejected_value': round(sender_rejected_value, 2),
                'pending_value': round(sender_pending_value, 2),
                'approved_quantity': sender_approved_quantity,
                'rejected_quantity': sender_rejected_quantity,
                'pending_quantity': sender_pending_quantity
            },
            'technical_director_as_receiver': {
                'total_count': receiver_total,
                'approved_count': receiver_approved_count,
                'rejected_count': receiver_rejected_count,
                'pending_count': receiver_pending_count,
                'approved_value': round(receiver_approved_value, 2),
                'rejected_value': round(receiver_rejected_value, 2),
                'pending_value': round(receiver_pending_value, 2),
                'approved_quantity': receiver_approved_quantity,
                'rejected_quantity': receiver_rejected_quantity,
                'pending_quantity': receiver_pending_quantity
            },
            'summary': {
                'total_sender_records': sender_total,
                'total_receiver_records': receiver_total,
                'total_unique_purchases': len(set([s['purchase_id'] for s in sender_approved_details + sender_rejected_details + sender_pending_details + receiver_approved_details + receiver_rejected_details + receiver_pending_details]))
            }
        }

        return jsonify(dashboard_data), 200

    except Exception as e:
        log.error(f"Error in get_technical_director_dashboard: {str(e)}")
        return jsonify({'error': f'Failed to retrieve dashboard data: {str(e)}'}), 500

def get_all_technical_director_purchase_request():
    """Fast: Get latest technical director purchase requests with detailed purchase information"""
    try:
        current_user = g.get("user")
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # ✅ Validate role
        role = Role.query.filter_by(
            role_id=current_user.get("role_id"),
            is_deleted=False
        ).first()
        if not role or role.role.replace(" ", "").lower() != "technicaldirector":
            return jsonify({"error": "Only Technical Director can access this data"}), 403

        # ✅ Single query join: PurchaseStatus + Purchase
        statuses = (
            db.session.query(PurchaseStatus, Purchase)
            .join(Purchase, Purchase.purchase_id == PurchaseStatus.purchase_id)
            .filter(
                PurchaseStatus.receiver == "technicalDirector",
                PurchaseStatus.is_active == True,
                Purchase.is_deleted == False
            )
            .options(joinedload(PurchaseStatus.purchase))  # preload relation if defined
            .all()
        )

        # ✅ Collect all material IDs at once
        all_material_ids = []
        for _, purchase in statuses:
            if purchase.material_ids:
                all_material_ids.extend(purchase.material_ids)

        material_map = {}
        if all_material_ids:
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(all_material_ids)
                )
            ).all()
            material_map = {m.material_id: m for m in materials}

        technical_director_data = []

        for status, purchase in statuses:
            materials, total_cost, total_qty = [], 0, 0
            if purchase.material_ids:
                for mid in purchase.material_ids:
                    mat = material_map.get(mid)
                    if not mat:
                        continue
                    unit_cost = float(mat.cost or 0)
                    m_total = unit_cost * (mat.quantity or 0)
                    total_cost += m_total
                    total_qty += mat.quantity or 0
                    materials.append({
                        "material_id": mat.material_id,
                        "description": mat.description,
                        "specification": mat.specification,
                        "unit": mat.unit,
                        "quantity": mat.quantity,
                        "category": mat.category,
                        "unit_cost": unit_cost,
                        "total_cost": m_total,
                        "priority": mat.priority,
                        "design_reference": mat.design_reference,
                    })

            technical_director_data.append({
                "purchase_id": purchase.purchase_id,
                "project_id": purchase.project_id,
                "requested_by": purchase.requested_by,
                "site_location": purchase.site_location,
                "date": purchase.date,
                "purpose": purchase.purpose,
                "file_path": purchase.file_path,
                "materials": materials,
                "material_count": len(materials),
                "total_quantity": total_qty,
                "total_cost": round(total_cost, 2),
                "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
                "created_by": purchase.created_by,
                "last_modified_at": purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
                "last_modified_by": purchase.last_modified_by,
                "status_info": {
                    "status_id": status.status_id,
                    "status": status.status,
                    "sender": status.sender,
                    "receiver": status.receiver,
                    "decision_date": status.decision_date.isoformat() if status.decision_date else None,
                    "decision_by_user_id": status.decision_by_user_id,
                    "decision_by": status.decision_by_user_id,
                    "rejection_reason": status.rejection_reason,
                    "reject_category": status.reject_category,
                    "comments": status.comments,
                    "created_at": status.created_at.isoformat() if status.created_at else None,
                    "last_modified_at": status.last_modified_at.isoformat() if status.last_modified_at else None,
                    "last_modified_by": status.last_modified_by,
                },
            })

        # ✅ Summary
        approved = [p for p in technical_director_data if p["status_info"]["status"] == "approved"]
        rejected = [p for p in technical_director_data if p["status_info"]["status"] == "rejected"]
        pending = [p for p in technical_director_data if p["status_info"]["status"] == "pending"]

        summary = {
            "total_count": len(technical_director_data),
            "approved_count": len(approved),
            "rejected_count": len(rejected),
            "pending_count": len(pending),
            "total_value": round(sum(p["total_cost"] for p in technical_director_data), 2),
            "approved_value": round(sum(p["total_cost"] for p in approved), 2),
            "rejected_value": round(sum(p["total_cost"] for p in rejected), 2),
            "pending_value": round(sum(p["total_cost"] for p in pending), 2),
            "total_quantity": sum(p["total_quantity"] for p in technical_director_data),
            "approved_quantity": sum(p["total_quantity"] for p in approved),
            "rejected_quantity": sum(p["total_quantity"] for p in rejected),
            "pending_quantity": sum(p["total_quantity"] for p in pending),
        }

        return jsonify({
            "success": True,
            "summary": summary,
            "purchases": technical_director_data,
            "user_info": {
                "user_name": current_user.get("full_name"),
                "user_id": current_user.get("user_id"),
                "role": role.role,
            },
            "last_updated": datetime.utcnow().isoformat(),
        }), 200

    except Exception as e:
        import logging
        logging.exception("Error fetching technical director purchase requests")
        return jsonify({"error": "Internal server error"}), 500