from flask import g, request, jsonify
from datetime import datetime
from sqlalchemy import and_, or_
from sqlalchemy.orm import joinedload, selectinload
import threading
import json
from typing import Dict, List, Optional, Tuple

from models.purchase_status import PurchaseStatus
from models.material import Material
from models.role import Role
from models.purchase import Purchase
from models.user import User
from utils.email_service import EmailService
from config.logging import get_logger
from config.db import db
from models.purchase_history import PurchaseHistory

log = get_logger()

# Helper functions for optimization
def send_email_async(email_func, *args, **kwargs):
    """Send email in background thread to avoid blocking"""
    from flask import current_app

    def _send(app):
        try:
            with app.app_context():
                email_func(*args, **kwargs)
        except Exception as e:
            log.error(f"Background email sending failed: {str(e)}")

    # Get current app reference before thread starts
    app = current_app._get_current_object()
    thread = threading.Thread(target=_send, args=(app,), daemon=True)
    thread.start()
    return True  # Return immediately

def batch_fetch_materials(material_ids: List[int]) -> Dict[int, Material]:
    """Batch fetch materials and return as dictionary for O(1) lookup"""
    if not material_ids:
        return {}

    materials = Material.query.filter(
        and_(
            Material.material_id.in_(material_ids),
            Material.is_deleted == False
        )
    ).all()

    return {mat.material_id: mat for mat in materials}

def process_materials_data(material_ids: List[int], materials_dict: Dict[int, Material]) -> Tuple[List[Dict], float, int]:
    """Process materials and calculate totals"""
    materials = []
    total_cost = 0
    total_quantity = 0

    for mat_id in material_ids:
        mat = materials_dict.get(mat_id)
        if not mat:
            continue

        unit_cost = float(mat.cost) if mat.cost else 0
        mat_total = unit_cost * mat.quantity
        total_cost += mat_total
        total_quantity += mat.quantity

        materials.append({
            'material_id': mat.material_id,
            'description': mat.description,
            'specification': mat.specification,
            'unit': mat.unit,
            'quantity': mat.quantity,
            'category': mat.category,
            'cost': unit_cost,
            'unit_cost': unit_cost,
            'total_cost': mat_total,
            'priority': mat.priority,
            'design_reference': mat.design_reference
        })

    return materials, total_cost, total_quantity

def check_user_role(role_id: int, expected_role: str) -> bool:
    """Optimized role checking - queries only when needed"""
    role = Role.query.filter_by(role_id=role_id, is_deleted=False).first()
    return role and role.role == expected_role

def technical_director_approval_workflow():
    """Technical Director approval workflow - optimized for performance"""
    try:
        # Quick user validation
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        user_id = current_user['user_id']
        user_name = current_user['full_name']
        role_id = current_user['role_id']

        # Use cached role check
        if not check_user_role(role_id, 'technicalDirector'):
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

        # Optimized purchase and status fetching with single query
        purchase = Purchase.query.options(
            selectinload(Purchase.status_history)
        ).filter_by(purchase_id=purchase_id, is_deleted=False).first()

        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Optimized status checking - single query for both statuses
        relevant_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                or_(
                    PurchaseStatus.sender == 'technicalDirector',
                    PurchaseStatus.sender == 'estimation'
                )
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Process statuses in memory (faster than multiple DB queries)
        existing_td_status = next((s for s in relevant_statuses if s.sender == 'technicalDirector'), None)
        latest_estimation_status = next((s for s in relevant_statuses if s.sender == 'estimation'), None)

        if existing_td_status and existing_td_status.status in ['approved', 'rejected']:
            # Simplified resubmission check
            is_resubmission = (
                (purchase.last_modified_at and existing_td_status.created_at and
                 purchase.last_modified_at > existing_td_status.created_at) or
                (latest_estimation_status and
                 latest_estimation_status.status == 'approved' and
                 latest_estimation_status.created_at > existing_td_status.created_at)
            )

            if is_resubmission:
                log.info(f"Resubmission detected for purchase #{purchase_id}")
            else:
                return jsonify({'error': f'Technical Director has already {existing_td_status.status} this purchase request'}), 400

        # Optimized material fetching
        materials = []
        if purchase.material_ids:
            materials_dict = batch_fetch_materials(purchase.material_ids)
            materials = [{
                'description': mat.description,
                'specification': mat.specification,
                'unit': mat.unit,
                'quantity': mat.quantity,
                'category': mat.category,
                'cost': mat.cost,
                'priority': mat.priority,
                'design_reference': mat.design_reference
            } for mat in materials_dict.values()]

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
            'role': 'technicalDirector'
        }

        # Optimized database update - single transaction
        try:
            receiver_role = 'accounts' if technical_director_status == 'approved' else 'estimation'
            now = datetime.utcnow()

            # Get or create status in one operation
            existing_status = PurchaseStatus.get_latest_status(purchase_id)

            if existing_status:
                # Bulk update attributes
                existing_status.sender = 'technicalDirector'
                existing_status.receiver = receiver_role
                existing_status.role = 'technicalDirector'
                existing_status.status = technical_director_status
                existing_status.decision_by_user_id = user_id
                existing_status.rejection_reason = rejection_reason if technical_director_status == 'rejected' else None
                existing_status.comments = comments
                existing_status.decision_date = now
                existing_status.is_active = True
                existing_status.last_modified_by = user_name
                existing_status.last_modified_at = now
                updated_status = existing_status
            else:
                updated_status = PurchaseStatus(
                    purchase_id=purchase_id,
                    sender='technicalDirector',
                    receiver=receiver_role,
                    role='technicalDirector',
                    status=technical_director_status,
                    decision_by_user_id=user_id,
                    rejection_reason=rejection_reason if technical_director_status == 'rejected' else None,
                    comments=comments,
                    created_by=user_name,
                    is_active=True,
                    decision_date=now
                )
                db.session.add(updated_status)

            # Update purchase timestamp
            purchase.last_modified_at = now
            purchase.last_modified_by = user_name

            # Single commit for all changes
            db.session.commit()

        except Exception as e:
            db.session.rollback()
            log.error(f"Database update error: {str(e)}")
            return jsonify({'error': 'Failed to update purchase status'}), 500

        # Prepare email data and send asynchronously
        email_service = EmailService()

        # Check resubmission status efficiently
        is_resubmission = existing_td_status and existing_td_status.status == 'rejected'
        resubmission_text = ' (resubmission)' if is_resubmission else ''

        # Send email asynchronously to avoid blocking
        if technical_director_status == 'approved':
            message = f'Purchase request #{purchase_id} approved by Technical Director{resubmission_text} and sent to Accounts'
            # Send email in background
            send_email_async(
                email_service.send_technical_director_to_accounts_notification,
                purchase_data, materials, requester_info, technical_director_info
            )
        else:
            message = f'Purchase request #{purchase_id} rejected by Technical Director{resubmission_text} and sent back to Estimation team'
            # Send email in background
            send_email_async(
                email_service.send_technical_director_rejection_to_estimation,
                purchase_data, materials, requester_info, technical_director_info, rejection_reason
            )

        email_success = True  # Assume success since it's async

        # Optimized purchase history update
        try:
            hist_receiver = 'accounts' if technical_director_status == 'approved' else 'estimation'
            hist_comments = f'Purchase request {technical_director_status} by Technical Director and sent to {hist_receiver.title()}'

            # Simpler history action
            action_payload = {
                'type': 'status_change',
                'status': technical_director_status,
                'sender': 'technicalDirector',
                'receiver': hist_receiver,
                'comments': hist_comments,
                'rejection_reason': rejection_reason if technical_director_status == 'rejected' else None,
                'decided_by_user_id': user_id,
                'decided_by': user_name,
                'role': 'technicalDirector',
                'timestamp': datetime.utcnow().isoformat()
            }

            # Optimized history update - single query
            existing_history = PurchaseHistory.query.filter_by(
                purchase_id=purchase_id,
                is_active=True
            ).first()

            if existing_history:
                # Ensure action is a list
                if not isinstance(existing_history.action, list):
                    existing_history.action = [existing_history.action] if existing_history.action else []
                existing_history.action.append(action_payload)
                existing_history.last_modified_by = user_name
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(existing_history, 'action')
            else:
                new_history = PurchaseHistory(
                    purchase_id=purchase_id,
                    is_active=True,
                    action=[action_payload],
                    created_by=user_name
                )
                db.session.add(new_history)

            db.session.commit()

        except Exception as he:
            log.error(f"History update failed: {str(he)}")
            # Don't fail the request due to history error

        # Return optimized response
        response_data = {
            'success': True,
            'message': message,
            'purchase_id': purchase_id,
            'technical_director_status': updated_status.status,
            'decision_date': updated_status.decision_date.isoformat() if updated_status.decision_date else None,
            'decision_by': updated_status.created_by,
            'comments': updated_status.comments
        }

        if technical_director_status == 'rejected':
            response_data['rejection_reason'] = updated_status.rejection_reason

        # Email is sent async, so no need to wait or check
        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error in technical_director_approval_workflow: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_technical_director_dashboard():
    """Optimized technical director dashboard with batch operations"""
    try:
        # Quick user validation
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        user_id = current_user['user_id']
        user_name = current_user['full_name']
        role_id = current_user['role_id']

        # Use cached role check
        if not check_user_role(role_id, 'technicalDirector'):
            return jsonify({'error': 'Only Technical Director can access dashboard'}), 403

        # Single optimized query for all TD-related statuses
        all_td_statuses = PurchaseStatus.query.filter(
            and_(
                or_(
                    PurchaseStatus.sender == 'technicalDirector',
                    PurchaseStatus.receiver == 'technicalDirector'
                ),
                PurchaseStatus.is_active == True
            )
        ).options(
            joinedload(PurchaseStatus.purchase)  # Eager load purchases using class-bound attribute
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Split statuses in memory (faster than two DB queries)
        td_sender_statuses = [s for s in all_td_statuses if s.sender == 'technicalDirector']
        td_receiver_statuses = [s for s in all_td_statuses if s.receiver == 'technicalDirector']

        # Efficient batch fetching with set comprehension
        all_purchase_ids = {s.purchase_id for s in all_td_statuses}

        # Initialize dicts
        purchases_dict = {}
        materials_dict = {}

        if all_purchase_ids:
            # Single query for all purchases
            all_purchases = Purchase.query.filter(
                and_(
                    Purchase.purchase_id.in_(all_purchase_ids),
                    Purchase.is_deleted == False
                )
            ).all()

            purchases_dict = {p.purchase_id: p for p in all_purchases}

            # Collect material IDs using set comprehension
            all_material_ids = set()
            for p in all_purchases:
                if p.material_ids:
                    all_material_ids.update(p.material_ids)

            # Batch fetch materials
            if all_material_ids:
                materials_dict = batch_fetch_materials(list(all_material_ids))

        # Optimized helper function to process status data
        def process_status_group(statuses, purchases_dict, materials_dict):
            status_counts = {'approved': 0, 'rejected': 0, 'pending': 0}
            status_details = {'approved': [], 'rejected': [], 'pending': []}

            for status in statuses:
                purchase = purchases_dict.get(status.purchase_id)
                if not purchase:
                    continue

                # Use helper function for materials processing
                materials, total_cost, total_quantity = process_materials_data(
                    purchase.material_ids or [],
                    materials_dict
                )

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
                    'total_cost': round(total_cost, 2),
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

                # Categorize by status
                status_type = status.status if status.status in status_counts else 'pending'
                status_counts[status_type] += 1
                status_details[status_type].append(status_detail)

            return status_counts, status_details

        # Process sender and receiver data using helper function
        sender_counts, sender_details = process_status_group(td_sender_statuses, purchases_dict, materials_dict)
        receiver_counts, receiver_details = process_status_group(td_receiver_statuses, purchases_dict, materials_dict)

        # Calculate financial and quantity summaries efficiently
        def calculate_summaries(details_dict):
            summaries = {}
            for status_type, details_list in details_dict.items():
                summaries[f'{status_type}_value'] = sum(d['total_cost'] for d in details_list)
                summaries[f'{status_type}_quantity'] = sum(d['total_quantity'] for d in details_list)
            return summaries

        sender_summaries = calculate_summaries(sender_details)
        receiver_summaries = calculate_summaries(receiver_details)

        # Build optimized response
        dashboard_data = {
            'success': True,
            'technical_director_as_sender': {
                'total_count': sum(sender_counts.values()),
                'approved_count': sender_counts['approved'],
                'rejected_count': sender_counts['rejected'],
                'pending_count': sender_counts['pending'],
                'approved_value': round(sender_summaries.get('approved_value', 0), 2),
                'rejected_value': round(sender_summaries.get('rejected_value', 0), 2),
                'pending_value': round(sender_summaries.get('pending_value', 0), 2),
                'approved_quantity': sender_summaries.get('approved_quantity', 0),
                'rejected_quantity': sender_summaries.get('rejected_quantity', 0),
                'pending_quantity': sender_summaries.get('pending_quantity', 0)
            },
            'technical_director_as_receiver': {
                'total_count': sum(receiver_counts.values()),
                'approved_count': receiver_counts['approved'],
                'rejected_count': receiver_counts['rejected'],
                'pending_count': receiver_counts['pending'],
                'approved_value': round(receiver_summaries.get('approved_value', 0), 2),
                'rejected_value': round(receiver_summaries.get('rejected_value', 0), 2),
                'pending_value': round(receiver_summaries.get('pending_value', 0), 2),
                'approved_quantity': receiver_summaries.get('approved_quantity', 0),
                'rejected_quantity': receiver_summaries.get('rejected_quantity', 0),
                'pending_quantity': receiver_summaries.get('pending_quantity', 0)
            },
            'summary': {
                'total_sender_records': sum(sender_counts.values()),
                'total_receiver_records': sum(receiver_counts.values()),
                'total_unique_purchases': len(all_purchase_ids)
            }
        }

        return jsonify(dashboard_data), 200

    except Exception as e:
        log.error(f"Error in get_technical_director_dashboard: {str(e)}")
        return jsonify({'error': f'Failed to retrieve dashboard data: {str(e)}'}), 500

def get_all_technical_director_purchase_request():
    """Optimized endpoint to get all purchase requests for technical director"""
    try:
        # Quick user validation
        current_user = g.get("user")
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role_id = current_user.get("role_id")
        user_name = current_user.get("full_name")
        user_id = current_user.get("user_id")

        # Validate role
        role = Role.query.filter_by(role_id=role_id, is_deleted=False).first()
        if not role:
            return jsonify({"error": "Invalid role"}), 400

        # Import PurchaseHistory to check historical involvement
        from models.purchase_history import PurchaseHistory
        from datetime import datetime

        # Get all active statuses (no role exclusions to capture full workflow)
        purchase_statuses = PurchaseStatus.query.filter(
            PurchaseStatus.is_active == True
        ).options(
            joinedload(PurchaseStatus.purchase)  # Eager load purchases using class-bound attribute
        ).all()

        if not purchase_statuses:
            return jsonify({
                "purchases": [],
                "user_info": {
                    "user_name": user_name,
                    "user_id": user_id,
                    "role": role.role,
                },
                "last_updated": datetime.utcnow().isoformat(),
                'status': 'success',
                'message': 'No purchase requests found'
            }), 200

        # Collect unique purchases and material IDs efficiently
        purchase_dict = {}
        all_material_ids = set()

        for status in purchase_statuses:
            if status.purchase and not status.purchase.is_deleted:
                purchase = status.purchase
                purchase_dict[purchase.purchase_id] = purchase
                if purchase.material_ids:
                    all_material_ids.update(purchase.material_ids)

        # Batch fetch all materials
        materials_dict = batch_fetch_materials(list(all_material_ids)) if all_material_ids else {}

        # Check purchase history for technical director involvement
        all_histories = PurchaseHistory.query.filter_by(is_active=True).all()
        td_historical_involvement = {}

        for history in all_histories:
            if history.action:
                actions = history.action if isinstance(history.action, list) else [history.action]
                td_actions = []

                for action in actions:
                    if isinstance(action, dict):
                        # Check if technical director was sender or receiver in any action
                        if action.get('sender') == 'technicalDirector' or action.get('receiver') == 'technicalDirector':
                            td_actions.append(action)

                if td_actions:
                    # Get the latest technical director action
                    latest_td_action = None
                    for action in reversed(actions):
                        if isinstance(action, dict) and action.get('sender') == 'technicalDirector':
                            latest_td_action = action
                            break

                    td_historical_involvement[history.purchase_id] = {
                        'involved': True,
                        'latest_action': latest_td_action
                    }

        # Group statuses by purchase_id using defaultdict for efficiency
        from collections import defaultdict
        status_by_purchase = defaultdict(list)
        for status in purchase_statuses:
            status_by_purchase[status.purchase_id].append(status)

        # Process purchases in parallel structure
        technical_director_data = []

        for purchase_id, purchase_status_list in status_by_purchase.items():
            purchase = purchase_dict.get(purchase_id)
            if not purchase:
                continue

            # Check if technical director is involved (current status or historical)
            td_involved = False

            # Check current status involvement
            for status in purchase_status_list:
                if status.sender == 'technicalDirector' or status.receiver == 'technicalDirector':
                    td_involved = True
                    break
                # Also check if estimation approved (which typically sends to TD)
                if status.sender == 'estimation' and status.status == 'approved':
                    td_involved = True
                    break

            # Check historical involvement
            if purchase_id in td_historical_involvement:
                td_involved = True

            # Skip if technical director is not involved
            if not td_involved:
                continue

            # Sort statuses by creation time for proper workflow analysis
            purchase_status_list.sort(key=lambda x: x.created_at if x.created_at else datetime.min)

            # Efficiently find statuses
            latest_overall_status = max(purchase_status_list, key=lambda x: x.created_at) if purchase_status_list else None
            estimation_status = next((s for s in purchase_status_list if s.sender == 'estimation'), None)
            current_td_status = next((s for s in purchase_status_list if s.sender == 'technicalDirector'), None)

            # Build TD history for this purchase
            td_history = {}
            td_rejection_timestamp = None
            is_back_with_td = False
            received_after_td_rejection = False

            # Check TD's historical involvement from purchase history
            if purchase_id in td_historical_involvement:
                hist_data = td_historical_involvement[purchase_id]
                if hist_data.get('latest_action'):
                    latest_action = hist_data['latest_action']
                    if latest_action.get('status') == 'rejected':
                        td_history[purchase_id] = {
                            'status': 'rejected',
                            'timestamp': latest_action.get('timestamp')
                        }
                        # Parse timestamp for comparison
                        timestamp_str = latest_action.get('timestamp')
                        if isinstance(timestamp_str, str):
                            try:
                                td_rejection_timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                            except:
                                pass

            # Determine current TD status based on workflow state (similar to estimation logic)
            td_status_to_show = 'pending'

            if latest_overall_status:
                # If TD is the current sender, show their actual status
                if latest_overall_status.sender == 'technicalDirector':
                    td_status_to_show = latest_overall_status.status

                # If estimation approved and sent to TD, TD should be pending (even if they rejected before)
                elif latest_overall_status.sender == 'estimation' and latest_overall_status.status == 'approved':
                    if latest_overall_status.receiver == 'technicalDirector':
                        td_status_to_show = 'pending'
                        is_back_with_td = True
                    elif td_rejection_timestamp and latest_overall_status.created_at > td_rejection_timestamp:
                        td_status_to_show = 'pending'
                        is_back_with_td = True
                    elif purchase_id in td_history:
                        td_status_to_show = td_history[purchase_id]['status']
                    else:
                        td_status_to_show = 'pending'

                # If estimation rejected, TD doesn't need to act
                elif latest_overall_status.sender == 'estimation' and latest_overall_status.status == 'rejected':
                    if purchase_id in td_history:
                        td_status_to_show = td_history[purchase_id]['status']
                    else:
                        td_status_to_show = 'pending'

                # For other senders, check if TD previously acted and if the purchase came back
                elif purchase_id in td_history:
                    if td_rejection_timestamp and latest_overall_status.created_at > td_rejection_timestamp:
                        # Purchase has been updated after TD rejection - show as pending
                        td_status_to_show = 'pending'
                        is_back_with_td = True
                    else:
                        td_status_to_show = td_history[purchase_id]['status']
                else:
                    td_status_to_show = 'pending'

            # Create a status object for response consistency
            technical_director_status = current_td_status
            if not technical_director_status and purchase_id in td_history:
                # Create a pseudo-status object from history, but use determined status
                class DeterminedStatus:
                    def __init__(self, determined_status, hist_action=None):
                        self.status = determined_status
                        if hist_action:
                            timestamp = hist_action.get('timestamp')
                            if isinstance(timestamp, str):
                                try:
                                    self.created_at = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                except:
                                    self.created_at = None
                            else:
                                self.created_at = timestamp
                            self.comments = hist_action.get('comments', '')
                            self.rejection_reason = hist_action.get('rejection_reason', '') if determined_status == 'rejected' else ''
                            self.created_by = hist_action.get('decision_by', '')
                        else:
                            self.created_at = None
                            self.comments = ''
                            self.rejection_reason = ''
                            self.created_by = ''

                hist_data = td_historical_involvement[purchase_id]
                latest_action = hist_data.get('latest_action')
                technical_director_status = DeterminedStatus(td_status_to_show, latest_action)
            elif not technical_director_status:
                # No current status and no history - create pending status
                class DeterminedStatus:
                    def __init__(self, determined_status):
                        self.status = determined_status
                        self.created_at = None
                        self.comments = ''
                        self.rejection_reason = ''
                        self.created_by = ''
                technical_director_status = DeterminedStatus(td_status_to_show)

            # Use helper function for materials processing
            materials, total_cost, total_qty = process_materials_data(
                purchase.material_ids or [],
                materials_dict
            )
            # Determine workflow status efficiently
            current_workflow_status = 'pending_estimation'
            if estimation_status:
                if estimation_status.status == 'approved':
                    current_workflow_status = (
                        f'technical_director_{technical_director_status.status}'
                        if technical_director_status
                        else 'pending_technical_director'
                    )
                elif estimation_status.status == 'rejected':
                    current_workflow_status = 'estimation_rejected'

            # Build response data efficiently
            purchase_data = {
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
                "current_workflow_status": current_workflow_status,
                "estimation_status": estimation_status.status if estimation_status else 'pending',
                "estimation_status_date": estimation_status.created_at.isoformat() if estimation_status and estimation_status.created_at else None,
                "estimation_comments": estimation_status.comments if estimation_status else None,
                "estimation_decision_by": estimation_status.created_by if estimation_status else None,
                "technical_director_status": technical_director_status.status if technical_director_status else 'pending',
                "technical_director_status_date": technical_director_status.created_at.isoformat() if technical_director_status and technical_director_status.created_at else None,
                "technical_director_comments": technical_director_status.comments if technical_director_status else None,
                "technical_director_rejection_reason": technical_director_status.rejection_reason if technical_director_status else None,
                "technical_director_decision_by": technical_director_status.created_by if technical_director_status else None,
                "latest_status": {
                    "status": latest_overall_status.status if latest_overall_status else 'pending',
                    "sender": latest_overall_status.sender if latest_overall_status else None,
                    "receiver": latest_overall_status.receiver if latest_overall_status else None,
                    "date": latest_overall_status.created_at.isoformat() if latest_overall_status and latest_overall_status.created_at else None,
                    "decision_by": latest_overall_status.created_by if latest_overall_status else None,
                    "comments": latest_overall_status.comments if latest_overall_status else None
                }
            }

            technical_director_data.append(purchase_data)
        # Return optimized response
        return jsonify({
            "purchases": technical_director_data,
            "user_info": {
                "user_name": user_name,
                "user_id": user_id,
                "role": role.role,
            },
            "last_updated": datetime.utcnow().isoformat(),
            'status': 'success',
            'message': 'Purchase requests retrieved successfully'
        }), 200

    except Exception as e:
        log.error(f"Error in get_all_technical_director_purchase_request: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to retrieve purchase requests: {str(e)}'
        }), 500