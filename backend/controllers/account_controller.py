import os
import json
import threading
from flask import g, request, jsonify
from datetime import datetime
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload, selectinload
from supabase import create_client, Client
from functools import lru_cache
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

from models.purchase import Purchase
from models.purchase_status import PurchaseStatus
from models.payment_transaction import PaymentTransaction
from models.acknowledgement import Acknowledgement
from models.project import Project
from models.user import User
from models.role import Role
from models.material import Material
from utils.email_service import EmailService
from config.logging import get_logger
from config.db import db
from models.purchase_history import PurchaseHistory

log = get_logger()

# Supabase storage for Accounts attachments
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
# Files are stored in the main upload bucket under accounts/{purchase_id}
SUPABASE_BUCKET = "file_upload"
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

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

@lru_cache(maxsize=128)
def check_user_role(role_id: int, expected_role: str) -> bool:
    """Cached role checking to avoid repeated DB queries"""
    role = Role.query.filter_by(role_id=role_id, is_deleted=False).first()
    return role and role.role == expected_role

def get_file_async(func, *args, **kwargs):
    """Download files asynchronously"""
    def _download():
        try:
            return func(*args, **kwargs)
        except Exception as e:
            log.error(f"Async file download failed: {str(e)}")
            return None

    thread = threading.Thread(target=_download)
    thread.start()
    thread.join(timeout=5)  # 5 second timeout
    return thread.result if hasattr(thread, 'result') else None

def _get_account_bucket_attachments(purchase_id):
    """Fetch files from ACCOUNT_BUCKET under accounts/{purchase_id} and return
    a list of {filename, content(bytes)} suitable for EmailService attachments.
    """
    try:
        if not supabase:
            log.warning("Supabase client not initialized; skipping attachments fetch")
            return None
        prefix = f"accounts/{purchase_id}"
        entries = supabase.storage.from_(SUPABASE_BUCKET).list(path=prefix)
        if not isinstance(entries, list) or len(entries) == 0:
            return None
        attachments = []
        for entry in entries:
            name = entry.get('name') if isinstance(entry, dict) else None
            if not name:
                continue
            path = f"{prefix}/{name}"
            try:
                file_bytes = supabase.storage.from_(SUPABASE_BUCKET).download(path)
                attachments.append({
                    'filename': name,
                    'content': file_bytes
                })
            except Exception as e:
                log.warning(f"Failed to download {path} from {SUPABASE_BUCKET}: {str(e)}")
                continue
        return attachments if attachments else None
    except Exception as e:
        log.warning(f"Error listing attachments for purchase {purchase_id}: {str(e)}")
        return None

def _list_account_file_paths(purchase_id):
    """Return list of storage paths under file_upload/accounts/{purchase_id}."""
    try:
        if not supabase:
            return []
        prefix = f"accounts/{purchase_id}"
        entries = supabase.storage.from_(SUPABASE_BUCKET).list(path=prefix)
        paths = []
        if isinstance(entries, list):
            for entry in entries:
                name = entry.get('name') if isinstance(entry, dict) else None
                if name:
                    paths.append(f"{prefix}/{name}")
        return paths
    except Exception as e:
        log.warning(f"Failed listing account paths for purchase {purchase_id}: {str(e)}")
        return []

def process_payment_transaction():
    """
    Optimized payment transaction processing for approved purchase requests
    """
    try:
        # Quick user validation
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        user_id = current_user['user_id']
        user_name = current_user['full_name']
        role_id = current_user['role_id']

        # Use cached role check
        if not check_user_role(role_id, 'accounts'):
            return jsonify({'error': 'Only Accounts department can process payments'}), 403

        data = request.get_json()
        purchase_id = data.get('purchase_id')
        amount = data.get('amount')
        payment_method = data.get('payment_method', 'bank_transfer')
        payment_reference = data.get('payment_reference')
        vendor_name = data.get('vendor_name')
        vendor_account_details = data.get('vendor_account_details')
        notes = data.get('notes', '')
        supporting_documents = data.get('supporting_documents', [])

        # Validate required fields
        if not purchase_id or not amount:
            return jsonify({'error': 'purchase_id and amount are required'}), 400

        # Get purchase request and verify it's approved by Technical Director
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Check if Technical Director has approved
        tech_director_status = PurchaseStatus.get_latest_status_by_role(purchase_id, 'technicalDirector')
        if not tech_director_status or tech_director_status.status != 'approved':
            return jsonify({'error': 'Purchase request must be approved by Technical Director before payment processing'}), 400

        # Check if payment already exists for this purchase
        existing_payment = PaymentTransaction.query.filter_by(
            purchase_id=purchase_id, 
            is_deleted=False
        ).first()
        if existing_payment:
            return jsonify({'error': 'Payment transaction already exists for this purchase request'}), 400

        # Create payment transaction
        payment_transaction = PaymentTransaction(
            purchase_id=purchase_id,
            project_id=purchase.project_id,
            transaction_type='payment',
            amount=amount,
            payment_method=payment_method,
            payment_reference=payment_reference,
            vendor_name=vendor_name,
            vendor_account_details=vendor_account_details,
            status='paid',
            approval_required=True,
            notes=notes,
            supporting_documents=supporting_documents,
            created_by=user_name
        )

        # Create payment transaction
        db.session.add(payment_transaction)

        # Update single-row purchase status to indicate payment processing (no insert)
        try:
            existing_status = PurchaseStatus.get_latest_status(purchase_id)
            if existing_status:
                existing_status.sender = 'accounts'
                existing_status.receiver = 'technicalDirector'
                existing_status.role = 'accounts'
                existing_status.status = 'approved'
                existing_status.decision_by_user_id = user_id
                existing_status.rejection_reason = None
                existing_status.reject_category = None
                existing_status.comments = f'Payment transaction created by {user_name}'
                existing_status.decision_date = datetime.utcnow()
                existing_status.is_active = True
                existing_status.last_modified_by = user_name
                db.session.add(existing_status)
            else:
                new_status = PurchaseStatus(
                    purchase_id=purchase_id,
                    sender='accounts',
                    receiver='technicalDirector',
                    role='accounts',
                    status='approved',
                    decision_by_user_id=user_id,
                    rejection_reason=None,
                    reject_category=None,
                    comments=f'Payment transaction created by {user_name}',
                    created_by=user_name,
                    is_active=True
                )
                db.session.add(new_status)
            db.session.commit()
        except Exception as se:
            db.session.rollback()
            log.error(f"Failed to update status for payment transaction create: {str(se)}", exc_info=True)
            return jsonify({'error': 'Failed to update purchase status', 'details': str(se)}), 500

        # Append purchase history action
        try:
            existing_hist = PurchaseHistory.query.filter_by(purchase_id=purchase_id, is_active=True).order_by(PurchaseHistory.created_at.asc()).first()
            action_payload = {
                'type': 'status_change',
                'status': 'approved',
                'sender': 'accounts',
                'receiver': 'technicalDirector',
                'comments': f'Payment transaction created by {user_name}',
                'rejection_reason': None,
                'reject_category': None,
                'decided_by_user_id': user_id,
                'decided_by': user_name,
                'role': 'accounts',
                'timestamp': datetime.utcnow().isoformat()
            }
            if not existing_hist:
                hist = PurchaseHistory(
                    purchase_id=purchase_id,
                    is_active=True,
                    action=[action_payload],
                    created_by=user_name
                )
                db.session.add(hist)
            else:
                actions = existing_hist.action
                if actions is None:
                    actions = []
                elif isinstance(actions, dict):
                    actions = [actions]
                elif isinstance(actions, str):
                    try:
                        parsed = json.loads(actions)
                        if isinstance(parsed, list):
                            actions = parsed
                        elif isinstance(parsed, dict):
                            actions = [parsed]
                        else:
                            actions = [str(actions)]
                    except Exception:
                        actions = [str(actions)]
                actions.append(action_payload)
                existing_hist.action = actions
                try:
                    from sqlalchemy.orm.attributes import flag_modified as _flag_modified
                    _flag_modified(existing_hist, 'action')
                except Exception:
                    pass
                existing_hist.last_modified_by = user_name
                db.session.add(existing_hist)
            db.session.commit()
        except Exception as he:
            db.session.rollback()
            return jsonify({'error': 'Failed to write purchase history', 'details': str(he)}), 500

        return jsonify({
            'message': 'Payment transaction created successfully',
            'transaction_id': payment_transaction.transaction_id,
            'status': 'approved'
        }), 201

    except Exception as e:
        db.session.rollback()
        log.error(f"Error processing payment transaction: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def approve_payment_transaction():
    """
    Optimized payment transaction approval
    """
    try:
        # Quick user validation
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        user_id = current_user['user_id']
        user_name = current_user['full_name']
        role_id = current_user['role_id']

        # Use cached role check
        if not check_user_role(role_id, 'accounts'):
            return jsonify({'error': 'Only Accounts department can approve payments'}), 403

        data = request.get_json()
        transaction_id = data.get('transaction_id')
        approval_status = data.get('approval_status', '').lower()
        comments = data.get('comments', '')

        # Validate approval status
        if approval_status not in ['approved', 'rejected']:
            return jsonify({'error': 'approval_status must be either "approved" or "rejected"'}), 400

        # Get payment transaction
        transaction = PaymentTransaction.query.filter_by(
            transaction_id=transaction_id, 
            is_deleted=False
        ).first()
        if not transaction:
            return jsonify({'error': 'Payment transaction not found'}), 404

        if transaction.status != 'pending':
            return jsonify({'error': 'Transaction is not in pending status'}), 400

        # Update transaction status
        if approval_status == 'approved':
            transaction.status = 'processed'
            transaction.processed_by = user_name
            transaction.processed_at = datetime.utcnow()
            transaction.approved_by = user_name
            transaction.approved_at = datetime.utcnow()
            transaction.last_modified_by = user_name

            # Update purchase status
            PurchaseStatus.create_new_status(
                purchase_id=transaction.purchase_id,
                sender_role='accounts',
                receiver_role='taskCompletion',
                status='payment_processed',
                decision_by_user_id=user_id,
                comments=f'Payment approved and processed by {user_name}',
                created_by=user_name
            )

            # Send notification asynchronously
            email_service = EmailService()
            send_email_async(
                email_service.send_payment_approved_notification,
                purchase_id=transaction.purchase_id,
                transaction_id=transaction_id,
                amount=transaction.amount,
                approved_by=user_name
            )

        else:  # rejected
            transaction.status = 'failed'
            transaction.failure_reason = comments
            transaction.last_modified_by = user_name

            # Update purchase status
            PurchaseStatus.create_new_status(
                purchase_id=transaction.purchase_id,
                sender_role='accounts',
                receiver_role='technicalDirector',
                status='payment_rejected',
                decision_by_user_id=user_id,
                rejection_reason=comments,
                created_by=user_name
            )

        db.session.commit()

        log.info(f"Payment transaction {transaction_id} {approval_status} by {user_name}")

        return jsonify({
            'message': f'Payment transaction {approval_status} successfully',
            'transaction_id': transaction_id,
            'status': transaction.status
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error approving payment transaction: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def create_acknowledgement():
    """
    Ultra-optimized acknowledgement with minimal DB operations
    """
    try:
        # Quick validation
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        user_id = current_user['user_id']
        user_name = current_user['full_name']
        role_id = current_user['role_id']

        data = request.get_json()
        purchase_id = data.get('purchase_id')
        transaction_id = data.get('transaction_id')
        acknowledgement_type = data.get('acknowledgement_type', 'payment_received')
        acknowledgement_message = data.get('acknowledgement_message', '')

        if not purchase_id:
            return jsonify({'error': 'purchase_id is required'}), 400

        # Quick role check
        role_name = db.session.query(Role.role).filter_by(
            role_id=role_id, is_deleted=False
        ).scalar()
        if not role_name:
            return jsonify({'error': 'User role not found'}), 400

        # --- Acknowledgement creation/update ---
        # Get file paths if supabase is available
        file_paths = []
        if supabase:
            try:
                # Quick check for files without downloading
                file_paths = _list_account_file_paths(purchase_id)
            except:
                pass

        # Use traditional method for acknowledgement (more reliable)
        acknowledgement = Acknowledgement.query.filter_by(purchase_id=purchase_id).first()
        if acknowledgement:
            # Update existing acknowledgement
            acknowledgement.transaction_id = transaction_id
            acknowledgement.acknowledgement_type = acknowledgement_type
            acknowledgement.acknowledged_by = user_name
            acknowledgement.acknowledged_by_role = role_name
            acknowledgement.acknowledgement_message = acknowledgement_message
            acknowledgement.supporting_documents = json.dumps(file_paths) if file_paths else None
            acknowledgement.last_modified_by = user_name
            acknowledgement.last_modified_at = datetime.utcnow()
        else:
            # Create new acknowledgement
            acknowledgement = Acknowledgement(
                transaction_id=transaction_id,
                purchase_id=purchase_id,
                acknowledgement_type=acknowledgement_type,
                acknowledged_by=user_name,
                acknowledged_by_role=role_name,
                acknowledgement_message=acknowledgement_message,
                supporting_documents=json.dumps(file_paths) if file_paths else None,
                created_by=user_name
            )
            db.session.add(acknowledgement)

        # --- Always update PurchaseStatus (never insert new) ---
        existing_status = PurchaseStatus.query.filter_by(purchase_id=purchase_id).first()
        if not existing_status:
            log.error(f"PurchaseStatus not found for purchase_id: {purchase_id}")
            return jsonify({'error': 'PurchaseStatus not found for this purchase_id'}), 400

        # Optimized status update with single operation
        now = datetime.utcnow()
        existing_status.sender = role_name
        existing_status.receiver = 'accounts'
        existing_status.role = role_name
        existing_status.status = 'completed'
        existing_status.decision_by_user_id = user_id
        existing_status.rejection_reason = None
        existing_status.reject_category = None
        existing_status.comments = f'Acknowledgement created by {user_name}'
        existing_status.decision_date = now
        existing_status.is_active = True
        existing_status.last_modified_by = user_name
        existing_status.last_modified_at = now

        # --- Optimized PurchaseHistory update ---
        existing_hist = PurchaseHistory.query.filter_by(purchase_id=purchase_id).first()
        if not existing_hist:
            return jsonify({'error': 'PurchaseHistory not found for this purchase_id'}), 400

        # Create action payload
        action_payload = {
            "role": "accounts",
            "type": "status_change",
            "sender": "accounts",
            "status": "completed",
            "comments": "payment completed and acknowledgement is sent",
            "receiver": "technicalDirector,projectmanager,procurement",
            "timestamp": datetime.utcnow().isoformat(),
            "decided_by": user_name,
            "decided_by_user_id": user_id
        }

        # Simplified action handling
        if not isinstance(existing_hist.action, list):
            existing_hist.action = [existing_hist.action] if existing_hist.action else []
        existing_hist.action.append(action_payload)
        existing_hist.last_modified_by = user_name
        existing_hist.last_modified_date = datetime.utcnow()

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(existing_hist, 'action')
        
        # Commit DB changes
        try:
            db.session.commit()
            log.info(f"Successfully updated purchase history for purchase_id: {purchase_id}")
        except Exception as e:
            db.session.rollback()
            log.error(f"Error committing purchase history update for purchase_id {purchase_id}: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Failed to update purchase history',
                'details': str(e)
            }), 500

        # --- Send acknowledgement notification asynchronously ---
        email_service = EmailService()

        # Prepare attachments asynchronously if needed
        attachments = None
        if supabase:
            try:
                attachment_paths = json.loads(acknowledgement.supporting_documents) if hasattr(acknowledgement, 'supporting_documents') and acknowledgement.supporting_documents else []
                if attachment_paths:
                    # Download attachments in background for email
                    attachments = _get_account_bucket_attachments(purchase_id)
            except Exception as e:
                log.warning(f"Error preparing attachments: {str(e)}")

        # Send email asynchronously
        send_email_async(
            email_service.send_acknowledgement_to_stakeholders,
            purchase_id=purchase_id,
            acknowledgement_type=acknowledgement_type,
            acknowledged_by=user_name,
            message=acknowledgement_message,
            attachments=attachments
        )

        return jsonify({
            'message': 'Acknowledgement updated successfully',
            'acknowledgement_id': acknowledgement.acknowledgement_id
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error creating acknowledgement: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def get_payment_transactions():
    """
    Get payment transactions with filtering and pagination
    """
    try:
        current_user = g.user
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Accounts role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
            return jsonify({'error': 'Only Accounts department can view payment transactions'}), 403

        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        purchase_id = request.args.get('purchase_id')
        project_id = request.args.get('project_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Build query
        query = PaymentTransaction.query.filter_by(is_deleted=False)

        if status:
            query = query.filter_by(status=status)
        if purchase_id:
            query = query.filter_by(purchase_id=purchase_id)
        if project_id:
            query = query.filter_by(project_id=project_id)
        if start_date:
            query = query.filter(PaymentTransaction.created_at >= start_date)
        if end_date:
            query = query.filter(PaymentTransaction.created_at <= end_date)

        # Execute query with pagination
        transactions = query.order_by(desc(PaymentTransaction.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'transactions': [transaction.to_dict() for transaction in transactions.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transactions.total,
                'pages': transactions.pages,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            }
        }), 200

    except Exception as e:
        log.error(f"Error getting payment transactions: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def get_payment_purchase(purchase_id):
    try:
        current_user = g.user  

        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user has Accounts role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role.lower() != 'accounts':
            return jsonify({'error': 'Only Accounts department can view payment transactions'}), 403

        # Fetch all transactions for the given purchase_id
        transactions = (
            PaymentTransaction.query
            .filter_by(purchase_id=purchase_id, is_deleted=False)
            .order_by(desc(PaymentTransaction.created_at))
            .all()
        )

        if not transactions:
            return jsonify({'message': 'No transactions found for this purchase_id'}), 404

        # Fetch purchase details
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        # Convert transactions into a list of dicts
        transaction_list = []
        for t in transactions:
            transaction_list.append({
                "transaction_id": t.transaction_id,
                "purchase_id": t.purchase_id,
                "project_id": t.project_id,
                "transaction_type": t.transaction_type,
                "amount": float(t.amount),   # convert Decimal → float
                "currency": t.currency,
                "payment_method": t.payment_method,
                "payment_reference": t.payment_reference,
                "vendor_name": t.vendor_name,
                "vendor_account_details": t.vendor_account_details,
                "status": t.status,
                "processed_by": t.processed_by,
                "processed_at": t.processed_at.isoformat() if t.processed_at else None,
                "failure_reason": t.failure_reason,
                "approval_required": t.approval_required,
                "approved_by": t.approved_by,
                "approved_at": t.approved_at.isoformat() if t.approved_at else None,
                "notes": t.notes,
                "supporting_documents": t.supporting_documents,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "created_by": t.created_by,
                "last_modified_at": t.last_modified_at.isoformat() if t.last_modified_at else None,
                "last_modified_by": t.last_modified_by,
            })

        # Return response with purchase + all transactions
        return jsonify({
            "purchase_id": purchase_id,
            "purchase_reference": getattr(purchase, "reference_no", None),  # optional field
            "vendor": {
                "name": purchase.vendor_name if hasattr(purchase, "vendor_name") else transaction_list[0]["vendor_name"],
                "id": getattr(purchase, "vendor_id", None)
            },
            "transactions": transaction_list
        }), 200

    except Exception as e:
        log.error(f"Error getting payment purchase details: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def get_acknowledgements():
    """
    Get acknowledgements with filtering and pagination
    """
    try:
        current_user = g.user
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        purchase_id = request.args.get('purchase_id')
        transaction_id = request.args.get('transaction_id')
        acknowledgement_type = request.args.get('acknowledgement_type')

        # Build query
        query = Acknowledgement.query.filter_by(is_deleted=False)

        if purchase_id:
            query = query.filter_by(purchase_id=purchase_id)
        if transaction_id:
            query = query.filter_by(transaction_id=transaction_id)
        if acknowledgement_type:
            query = query.filter_by(acknowledgement_type=acknowledgement_type)

        # Execute query with pagination
        acknowledgements = query.order_by(desc(Acknowledgement.acknowledged_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'acknowledgements': [acknowledgement.to_dict() for acknowledgement in acknowledgements.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': acknowledgements.total,
                'pages': acknowledgements.pages,
                'has_next': acknowledgements.has_next,
                'has_prev': acknowledgements.has_prev
            }
        }), 200

    except Exception as e:
        log.error(f"Error getting acknowledgements: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def get_financial_summary():
    """
    Get financial summary and analytics for accounts dashboard
    """
    try:
        current_user = g.user
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Accounts role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
            return jsonify({'error': 'Only Accounts department can view financial summary'}), 403

        # Get date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to current month if no dates provided
        if not start_date:
            start_date = datetime.utcnow().replace(day=1).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')

        # Build base query
        base_query = PaymentTransaction.query.filter_by(is_deleted=False)
        if start_date:
            base_query = base_query.filter(PaymentTransaction.created_at >= start_date)
        if end_date:
            base_query = base_query.filter(PaymentTransaction.created_at <= end_date)

        # Calculate summary statistics
        total_transactions = base_query.count()
        total_amount = db.session.query(func.sum(PaymentTransaction.amount)).filter_by(is_deleted=False).scalar() or 0
        
        # Status breakdown
        status_breakdown = db.session.query(
            PaymentTransaction.status,
            func.count(PaymentTransaction.transaction_id).label('count'),
            func.sum(PaymentTransaction.amount).label('total_amount')
        ).filter_by(is_deleted=False).group_by(PaymentTransaction.status).all()

        # Payment method breakdown
        method_breakdown = db.session.query(
            PaymentTransaction.payment_method,
            func.count(PaymentTransaction.transaction_id).label('count'),
            func.sum(PaymentTransaction.amount).label('total_amount')
        ).filter_by(is_deleted=False).group_by(PaymentTransaction.payment_method).all()

        # Recent transactions
        recent_transactions = base_query.order_by(desc(PaymentTransaction.created_at)).limit(5).all()

        # Pending approvals
        pending_count = base_query.filter_by(status='pending').count()

        return jsonify({
            'summary': {
                'total_transactions': total_transactions,
                'total_amount': float(total_amount),
                'pending_approvals': pending_count,
                'date_range': {
                    'start_date': start_date,
                    'end_date': end_date
                }
            },
            'status_breakdown': [
                {
                    'status': item.status,
                    'count': item.count,
                    'total_amount': float(item.total_amount) if item.total_amount else 0
                }
                for item in status_breakdown
            ],
            'method_breakdown': [
                {
                    'method': item.payment_method,
                    'count': item.count,
                    'total_amount': float(item.total_amount) if item.total_amount else 0
                }
                for item in method_breakdown
            ],
            'recent_transactions': [transaction.to_dict() for transaction in recent_transactions]
        }), 200

    except Exception as e:
        log.error(f"Error getting financial summary: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def get_pending_approvals():
    """
    Get all pending payment transactions that need approval
    """
    try:
        current_user = g.user
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Accounts role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
            return jsonify({'error': 'Only Accounts department can view pending approvals'}), 403

        # Get pending transactions - fix joinedload with proper relationships
        # Note: PaymentTransaction may not have direct relationships, so we'll handle differently
        pending_transactions = PaymentTransaction.query.filter_by(
            status='pending',
            is_deleted=False
        ).order_by(desc(PaymentTransaction.created_at)).all()

        # Batch fetch related purchases and projects
        purchase_ids = [t.purchase_id for t in pending_transactions if t.purchase_id]
        project_ids = [t.project_id for t in pending_transactions if t.project_id]

        purchases_dict = {}
        if purchase_ids:
            purchases = Purchase.query.filter(
                Purchase.purchase_id.in_(purchase_ids),
                Purchase.is_deleted == False
            ).all()
            purchases_dict = {p.purchase_id: p for p in purchases}

        projects_dict = {}
        if project_ids:
            projects = Project.query.filter(
                Project.project_id.in_(project_ids)
            ).all()
            projects_dict = {p.project_id: p for p in projects}

        # Format response with cached related data
        transactions_data = []
        for transaction in pending_transactions:
            transaction_dict = transaction.to_dict()
            # Get purchase and project from cached dicts
            purchase = purchases_dict.get(transaction.purchase_id)
            project = projects_dict.get(transaction.project_id)
            transaction_dict['purchase'] = purchase.to_dict() if purchase else None
            transaction_dict['project'] = project.to_dict() if project else None
            transactions_data.append(transaction_dict)

        return jsonify({
            'pending_transactions': transactions_data,
            'count': len(transactions_data)
        }), 200

    except Exception as e:
        log.error(f"Error getting pending approvals: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

def account_dashboard():
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
            return jsonify({'error': 'Only Accounts department can view account dashboard'}), 403

        # Get date range parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to current month if no dates provided
        if not start_date:
            start_date = datetime.utcnow().replace(day=1).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')

        # Build base query for date filtering
        base_query = PurchaseStatus.query
        if start_date:
            base_query = base_query.filter(PurchaseStatus.created_at >= start_date)
        if end_date:
            base_query = base_query.filter(PurchaseStatus.created_at <= end_date)
        # 2. Accounts as receiver - Total sent by accounts
        accounts_sent_total = base_query.filter(PurchaseStatus.receiver == 'accounts').count()
        accounts_sent_approved = base_query.filter(
            PurchaseStatus.receiver == 'accounts',
            PurchaseStatus.status == 'approved'
        ).count()
        accounts_sent_rejected = base_query.filter(
            PurchaseStatus.receiver == 'accounts',
            PurchaseStatus.status == 'rejected'
        ).count()
        accounts_sent_pending = base_query.filter(
            PurchaseStatus.receiver == 'accounts',
            PurchaseStatus.status == 'pending'
        ).count()

        # 3. Accounts as Receiver - Total received by accounts
        accounts_received_total = base_query.filter(PurchaseStatus.receiver == 'accounts').count()
        accounts_received_approved = base_query.filter(
            PurchaseStatus.receiver == 'accounts',
            PurchaseStatus.status == 'approved'
        ).count()
        accounts_received_rejected = base_query.filter(
            PurchaseStatus.receiver == 'accounts',
            PurchaseStatus.status == 'rejected'
        ).count()
        accounts_received_pending = base_query.filter(
            PurchaseStatus.receiver == 'accounts',
            PurchaseStatus.status == 'pending'
        ).count()

        # Format response
        response_data = {
            'accounts_as_sender': {
                'total_sent': accounts_sent_total,
                'approved': accounts_sent_approved,
                'rejected': accounts_sent_rejected,
                'pending': accounts_sent_pending,
                'approval_rate': round((accounts_sent_approved / accounts_sent_total * 100), 2) if accounts_sent_total > 0 else 0
            },
            'accounts_as_receiver': {
                'total_received': accounts_received_total,
                'approved': accounts_received_approved,
                'rejected': accounts_received_rejected,
                'pending': accounts_received_pending,
                'approval_rate': round((accounts_received_approved / accounts_received_total * 100), 2) if accounts_received_total > 0 else 0
            }
        }
        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error getting account dashboard: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@lru_cache(maxsize=1)
def get_material_columns():
    """Cache material column names for efficient queries"""
    return ['material_id', 'description', 'specification', 'unit', 'quantity', 'category', 'cost', 'priority', 'design_reference']

def account_purchase():
    """
    Ultra-optimized endpoint with minimal queries and maximum efficiency
    """
    try:
        # Quick user validation
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role_id = current_user['role_id']
        # Simple role query without defer
        role = Role.query.filter_by(role_id=role_id, is_deleted=False).first()
        if not role:
            return jsonify({"error": "Invalid role"}), 400
        
        # Ultra-optimized single query with selective loading
        from sqlalchemy import text

        # Raw SQL for maximum performance
        if role.role == 'accounts':
            sql = text("""
                SELECT DISTINCT ps.purchase_id, ps.status_id, ps.sender, ps.receiver,
                       ps.status, ps.created_at, ps.decision_date, ps.created_by,
                       ps.comments, ps.rejection_reason, ps.reject_category,
                       p.project_id, p.user_id, p.requested_by, p.site_location,
                       p.date, p.purpose, p.material_ids, p.file_path,
                       p.created_at as p_created_at, p.created_by as p_created_by,
                       p.last_modified_at, p.last_modified_by
                FROM purchase_status ps
                INNER JOIN purchase p ON ps.purchase_id = p.purchase_id
                WHERE (ps.receiver = 'accounts' OR ps.sender = 'accounts')
                  AND ps.is_active = true
                  AND p.is_deleted = false
                ORDER BY ps.created_at DESC
            """)
        else:
            sql = text("""
                SELECT DISTINCT ps.purchase_id, ps.status_id, ps.sender, ps.receiver,
                       ps.status, ps.created_at, ps.decision_date, ps.created_by,
                       ps.comments, ps.rejection_reason, ps.reject_category,
                       p.project_id, p.user_id, p.requested_by, p.site_location,
                       p.date, p.purpose, p.material_ids, p.file_path,
                       p.created_at as p_created_at, p.created_by as p_created_by,
                       p.last_modified_at, p.last_modified_by
                FROM purchase_status ps
                INNER JOIN purchase p ON ps.purchase_id = p.purchase_id
                WHERE ps.is_active = true
                  AND p.is_deleted = false
                ORDER BY ps.created_at DESC
            """)

        result = db.session.execute(sql)
        rows = result.fetchall()

        # Process results efficiently
        purchase_data_map = {}
        status_by_purchase = defaultdict(list)
        all_material_ids = set()

        for row in rows:
            purchase_id = row.purchase_id

            # Store purchase data
            if purchase_id not in purchase_data_map:
                purchase_data_map[purchase_id] = {
                    'purchase_id': purchase_id,
                    'project_id': row.project_id,
                    'user_id': row.user_id,
                    'requested_by': row.requested_by,
                    'site_location': row.site_location,
                    'date': row.date,
                    'purpose': row.purpose,
                    'material_ids': row.material_ids,
                    'file_path': row.file_path,
                    'created_at': row.p_created_at,
                    'created_by': row.p_created_by,
                    'last_modified_at': row.last_modified_at,
                    'last_modified_by': row.last_modified_by
                }

                # Collect material IDs
                if row.material_ids:
                    all_material_ids.update(row.material_ids)

            # Store status data
            status_by_purchase[purchase_id].append({
                'status_id': row.status_id,
                'sender': row.sender,
                'receiver': row.receiver,
                'status': row.status,
                'created_at': row.created_at,
                'decision_date': row.decision_date,
                'created_by': row.created_by,
                'comments': row.comments,
                'rejection_reason': row.rejection_reason,
                'reject_category': row.reject_category
            })

        purchase_ids = set(purchase_data_map.keys())
        # Batch fetch materials with optimized query
        materials_dict = {}
        if all_material_ids:
            # Use raw SQL for better performance
            mat_sql = text("""
                SELECT material_id, description, specification, unit, quantity,
                       category, cost, priority, design_reference
                FROM materials
                WHERE material_id = ANY(:ids)
                  AND is_deleted = false
            """)
            mat_result = db.session.execute(mat_sql, {'ids': list(all_material_ids)})
            for mat_row in mat_result:
                materials_dict[mat_row.material_id] = mat_row

        # Batch fetch payments and acknowledgements with single query
        payments_dict = {}
        acknowledgements_dict = {}

        if purchase_ids:
            # Fetch latest payments
            payment_sql = text("""
                SELECT DISTINCT ON (purchase_id)
                    purchase_id, transaction_id, amount, payment_method,
                    status, processed_at
                FROM payment_transactions
                WHERE purchase_id = ANY(:ids)
                  AND is_deleted = false
                ORDER BY purchase_id, transaction_id DESC
            """)

            payment_result = db.session.execute(payment_sql, {'ids': list(purchase_ids)})
            for row in payment_result:
                payments_dict[row.purchase_id] = row

            # Fetch latest acknowledgements
            ack_sql = text("""
                SELECT DISTINCT ON (purchase_id)
                    purchase_id, acknowledgement_id, transaction_id,
                    acknowledgement_type, acknowledged_by, acknowledged_by_role,
                    acknowledgement_message, acknowledged_at
                FROM acknowledgements
                WHERE purchase_id = ANY(:ids)
                ORDER BY purchase_id, acknowledgement_id DESC
            """)

            ack_result = db.session.execute(ack_sql, {'ids': list(purchase_ids)})
            for row in ack_result:
                acknowledgements_dict[row.purchase_id] = row

        # Process all data efficiently
        purchase_details = []

        for purchase_id, purchase_data in purchase_data_map.items():
            # Get latest status
            purchase_statuses = status_by_purchase.get(purchase_id, [])
            latest_status = max(purchase_statuses, key=lambda x: x['created_at']) if purchase_statuses else None

            # Process materials efficiently
            material_list = []
            total_cost = 0
            total_quantity = 0

            if purchase_data['material_ids']:
                for mat_id in purchase_data['material_ids']:
                    mat = materials_dict.get(mat_id)
                    if mat:
                        unit_cost = float(mat.cost) if mat.cost else 0
                        mat_total = unit_cost * mat.quantity
                        total_cost += mat_total
                        total_quantity += mat.quantity

                        material_list.append({
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

            # Format status info
            latest_status_info = None
            if latest_status:
                latest_status_info = {
                    'status_id': latest_status['status_id'],
                    'sender': latest_status['sender'],
                    'receiver': latest_status['receiver'],
                    'status': latest_status['status'],
                    'decision_date': latest_status['decision_date'].isoformat() if latest_status['decision_date'] else None,
                    'created_at': latest_status['created_at'].isoformat() if latest_status['created_at'] else None,
                    'created_by': latest_status['created_by'],
                    'comments': latest_status['comments'],
                    'rejection_reason': latest_status['rejection_reason'],
                    'reject_category': latest_status['reject_category'],
                    'is_active': True
                }

            # Get payment from cached dict
            payment_transaction = payments_dict.get(purchase_id)
            payment_data = None
            if payment_transaction:
                payment_data = {
                    'transaction_id': payment_transaction.transaction_id,
                    'amount': float(payment_transaction.amount),
                    'payment_method': payment_transaction.payment_method,
                    'status': payment_transaction.status,
                    'processed_at': payment_transaction.processed_at.isoformat() if payment_transaction.processed_at else None
                }

            # Get acknowledgement from cached dict
            acknowledgement = acknowledgements_dict.get(purchase_id)
            ack_data = None
            ack_sent = False
            if acknowledgement:
                ack_sent = True
                ack_data = {
                    'acknowledgement_id': acknowledgement.acknowledgement_id,
                    'transaction_id': acknowledgement.transaction_id,
                    'acknowledgement_type': acknowledgement.acknowledgement_type,
                    'acknowledged_by': acknowledgement.acknowledged_by,
                    'acknowledged_by_role': acknowledgement.acknowledged_by_role,
                    'acknowledgement_message': acknowledgement.acknowledgement_message,
                    'acknowledged_at': acknowledgement.acknowledged_at.isoformat() if acknowledgement.acknowledged_at else None
                }

            # Build final response efficiently
            final_data = {
                'purchase_id': purchase_data['purchase_id'],
                'project_id': purchase_data['project_id'],
                'user_id': purchase_data['user_id'],
                'requested_by': purchase_data['requested_by'],
                'site_location': purchase_data['site_location'],
                'date': purchase_data['date'],
                'purpose': purchase_data['purpose'],
                'material_ids': purchase_data['material_ids'],
                'file_path': purchase_data['file_path'],
                'is_deleted': False,
                'email_sent': True,
                'created_at': purchase_data['created_at'].isoformat() if purchase_data['created_at'] else None,
                'created_by': purchase_data['created_by'],
                'last_modified_at': purchase_data['last_modified_at'].isoformat() if purchase_data['last_modified_at'] else None,
                'last_modified_by': purchase_data['last_modified_by'],
                'total_cost': round(total_cost, 2),
                'total_quantity': total_quantity,
                'material_count': len(material_list),
                'latest_status': latest_status_info,
                'material_details': material_list,
                'payment_transaction': payment_data,
                'acknowledgement_sent': ack_sent,
                'acknowledgement': ack_data
            }

            # Add receiver status
            if latest_status_info and latest_status_info.get('sender') == 'accounts':
                final_data['receiver_latest_status'] = latest_status_info.get('status', 'pending')
            else:
                final_data['receiver_latest_status'] = 'pending'

            purchase_details.append(final_data)

        # Return optimized response
        return jsonify({
            'success': True,
            'message': 'Account purchase details fetched successfully',
            'purchase_details': purchase_details,
            'total_count': len(purchase_details)
        }), 200

    except Exception as e:
        log.error(f"Error getting account purchases: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500