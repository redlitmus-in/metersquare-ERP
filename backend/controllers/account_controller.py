import os
import json
from flask import g, request, jsonify
from datetime import datetime
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import joinedload
from supabase import create_client, Client

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

log = get_logger()

# Supabase storage for Accounts attachments
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
# Files are stored in the main upload bucket under accounts/{purchase_id}
SUPABASE_BUCKET = "file_upload"
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

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
    Process payment transaction for approved purchase requests
    This is the main entry point for the Accounts department workflow
    """
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Accounts role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
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
        
        # Update purchase status to indicate payment processing
        PurchaseStatus.create_new_status(
            purchase_id=purchase_id,
            sender_role='accounts',
            receiver_role='technicalDirector',
            status='completed',
            decision_by_user_id=user_id,
            comments=f'Payment transaction created by {user_name}',
            created_by=user_name
        )
        
        # Commit both payment transaction and status creation together
        db.session.commit()

        # Send notification email with any account bucket attachments for this purchase
        try:
            email_service = EmailService()
            attachments = _get_account_bucket_attachments(purchase_id)
            email_service.send_payment_processing_notification(
                purchase_id=purchase_id,
                amount=amount,
                payment_method=payment_method,
                processed_by=user_name,
                attachments=attachments
            )
        except Exception as e:
            log.warning(f"Failed to send payment processing email: {str(e)}")

        log.info(f"Payment transaction created for purchase {purchase_id} by {user_name}")

        return jsonify({
            'message': 'Payment transaction created successfully',
            'transaction_id': payment_transaction.transaction_id,
            'status': 'pending_approval'
        }), 201

    except Exception as e:
        db.session.rollback()
        log.error(f"Error processing payment transaction: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def approve_payment_transaction():
    """
    Approve payment transaction (internal approval within accounts)
    """
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Accounts role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
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

            # Send notification
            try:
                email_service = EmailService()
                email_service.send_payment_approved_notification(
                    purchase_id=transaction.purchase_id,
                    transaction_id=transaction_id,
                    amount=transaction.amount,
                    approved_by=user_name
                )
            except Exception as e:
                log.warning(f"Failed to send payment approved email: {str(e)}")

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
        log.error(f"Error approving payment transaction: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def create_acknowledgement():
    """
    Create acknowledgement for payment received/processed
    This handles the acknowledgement flow from Task Completion back to Accounts
    """
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        data = request.get_json()
        purchase_id = data.get('purchase_id')
        transaction_id = data.get('transaction_id')
        acknowledgement_type = data.get('acknowledgement_type', 'payment_received')
        acknowledgement_message = data.get('acknowledgement_message', '')

        # Validate required fields
        if not purchase_id:
            return jsonify({'error': 'purchase_id is required'}), 400
        # Get user role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role:
            return jsonify({'error': 'User role not found'}), 400
        # Create acknowledgement
        acknowledgement = Acknowledgement(
            transaction_id=transaction_id,
            purchase_id=purchase_id,
            acknowledgement_type=acknowledgement_type,
            acknowledged_by=user_name,
            acknowledged_by_role=role.role,
            acknowledgement_message=acknowledgement_message,
            supporting_documents=json.dumps(_list_account_file_paths(purchase_id)),
            created_by=user_name
        )
        # Create acknowledgement
        db.session.add(acknowledgement)
        # Update purchase status to indicate acknowledgement received
        new_status = PurchaseStatus.create_new_status(
            purchase_id=purchase_id,
            sender_role=role.role,
            receiver_role='accounts',
            status='completed',
            decision_by_user_id=user_id,
            comments=f'Acknowledgement created by {user_name}',
            created_by=user_name
        )
        # Commit both acknowledgement and status creation together
        db.session.commit()
        # Send acknowledgement notification to stakeholders (TD, Procurement, PM)
        try:
            email_service = EmailService()
            # Attach the exact files we persisted in Acknowledgement.supporting_documents
            attachment_paths = []
            try:
                if acknowledgement.supporting_documents:
                    attachment_paths = json.loads(acknowledgement.supporting_documents) or []
            except Exception:
                attachment_paths = []
            attachments = []
            if supabase and attachment_paths:
                for path in attachment_paths:
                    try:
                        name = os.path.basename(path)
                        file_bytes = supabase.storage.from_(SUPABASE_BUCKET).download(path)
                        attachments.append({'filename': name, 'content': file_bytes})
                    except Exception as e:
                        log.warning(f"Failed to download attachment {path}: {str(e)}")
            if not attachments:
                attachments = _get_account_bucket_attachments(purchase_id)
            email_service.send_acknowledgement_to_stakeholders(
                purchase_id=purchase_id,
                acknowledgement_type=acknowledgement_type,
                acknowledged_by=user_name,
                message=acknowledgement_message,
                attachments=attachments
            )
        except Exception as e:
            log.warning(f"Failed to send acknowledgement email: {str(e)}")

        return jsonify({
            'message': 'Acknowledgement send successfully',
            'acknowledgement_id': acknowledgement.acknowledgement_id
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error creating acknowledgement: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

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
        log.error(f"Error getting payment transactions: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def get_payment_purchase(purchase_id):
    try:
        current_user = g.user  

        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # ✅ Check if user has Accounts role
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role.lower() != 'accounts':
            return jsonify({'error': 'Only Accounts department can view payment transactions'}), 403

        # ✅ Fetch all transactions for the given purchase_id
        transactions = (
            PaymentTransaction.query
            .filter_by(purchase_id=purchase_id, is_deleted=False)
            .order_by(desc(PaymentTransaction.created_at))
            .all()
        )

        if not transactions:
            return jsonify({'message': 'No transactions found for this purchase_id'}), 404

        # ✅ Fetch purchase details
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        # ✅ Convert transactions into a list of dicts
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

        # ✅ Return response with purchase + all transactions
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
        log.error(f"Error getting payment purchase details: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

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
        log.error(f"Error getting acknowledgements: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

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
        log.error(f"Error getting financial summary: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

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

        # Get pending transactions with related data
        pending_transactions = PaymentTransaction.query.filter_by(
            status='pending',
            is_deleted=False
        ).options(
            joinedload(PaymentTransaction.purchase),
            joinedload(PaymentTransaction.project)
        ).order_by(desc(PaymentTransaction.created_at)).all()

        # Format response with related data
        transactions_data = []
        for transaction in pending_transactions:
            transaction_dict = transaction.to_dict()
            transaction_dict['purchase'] = transaction.purchase.to_dict() if transaction.purchase else None
            transaction_dict['project'] = transaction.project.to_dict() if transaction.project else None
            transactions_data.append(transaction_dict)

        return jsonify({
            'pending_transactions': transactions_data,
            'count': len(transactions_data)
        }), 200

    except Exception as e:
        log.error(f"Error getting pending approvals: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

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
        log.error(f"Error getting account dashboard: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def account_purchase():
    """
    Get all purchases where accounts is the receiver with their latest status and material details
    Supports sorting by date (newest/oldest)
    """
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401
        
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
            return jsonify({'error': 'Only Accounts department can view account purchases'}), 403
        
        # Get sort order from query params (default to newest first)
        sort_order = request.args.get('sort', 'newest').lower()
        if sort_order not in ['newest', 'oldest']:
            sort_order = 'newest'
        
        purchase_ids_query = db.session.query(PurchaseStatus.purchase_id).filter(
            PurchaseStatus.receiver == 'accounts',
            PurchaseStatus.is_active == True,
        ).distinct()
        
        purchase_ids = [row[0] for row in purchase_ids_query.all()]
        purchase_ids = list(set(purchase_ids))
        purchase_details = []
        processed_purchase_ids = set()  # Track processed purchase IDs to avoid duplicates
        
        for purchase_id in purchase_ids:
            # Skip if we've already processed this purchase ID
            if purchase_id in processed_purchase_ids:
                log.warning(f"Purchase {purchase_id} already processed, skipping duplicate")
                continue
            
            processed_purchase_ids.add(purchase_id)
            # Get purchase details
            purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
            if not purchase:
                continue
            latest_status = PurchaseStatus.get_latest_status(purchase_id)
            material_details = []
            if purchase.material_ids:
                materials = Material.query.filter(
                    Material.material_id.in_(purchase.material_ids),
                    Material.is_deleted == False
                ).all()
                
                for material in materials:
                    material_details.append(material.to_dict())

            # Format latest status details
            latest_status_info = None
            if latest_status:
                latest_status_info = {
                    'status_id': latest_status.status_id,
                    'sender': latest_status.sender,
                    'receiver': latest_status.receiver,
                    'status': latest_status.status,
                    'decision_date': latest_status.decision_date.isoformat() if latest_status.decision_date else None,
                    'created_at': latest_status.created_at.isoformat(),
                    'created_by': latest_status.created_by,
                    'comments': latest_status.comments,
                    'rejection_reason': latest_status.rejection_reason,
                    'reject_category': latest_status.reject_category,
                    'is_active': latest_status.is_active
                }
            # Create the purchase data in the desired format
            purchase_data = {
                'purchase_id': purchase.purchase_id,
                'project_id': purchase.project_id,
                'user_id': purchase.user_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date,
                'purpose': purchase.purpose,
                'material_ids': purchase.material_ids,
                'file_path': purchase.file_path,
                'is_deleted': purchase.is_deleted,
                'email_sent': purchase.email_sent,
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'created_by': purchase.created_by,
                'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
                'last_modified_by': purchase.last_modified_by
            }
            # Calculate total cost from materials
            total_cost = 0
            total_quantity = 0
            for material in material_details:
                qty = material.get('quantity', 0) or 0
                cost = material.get('cost', 0) or 0
                total_cost += qty * cost
                total_quantity += qty
            
            purchase_data['total_cost'] = total_cost
            purchase_data['total_quantity'] = total_quantity
            purchase_data['material_count'] = len(material_details)
            
            # Add latest status and material details to purchase data
            purchase_data['latest_status'] = latest_status_info
            purchase_data['material_details'] = material_details

            # Get payment transaction details
            payment_transaction = PaymentTransaction.query.filter_by(
                purchase_id=purchase_id,
                is_deleted=False
            ).order_by(PaymentTransaction.transaction_id.desc()).first()
            
            if payment_transaction:
                purchase_data['payment_transaction'] = {
                    'transaction_id': payment_transaction.transaction_id,
                    'amount': float(payment_transaction.amount),
                    'payment_method': payment_transaction.payment_method,
                    'status': payment_transaction.status,
                    'processed_at': payment_transaction.processed_at.isoformat() if payment_transaction.processed_at else None
                }
            else:
                purchase_data['payment_transaction'] = None
            
            # Check if acknowledgement has been sent for this purchase
            acknowledgement = Acknowledgement.query.filter_by(
                purchase_id=purchase_id
            ).order_by(Acknowledgement.acknowledgement_id.desc()).first()
            
            if acknowledgement:
                purchase_data['acknowledgement_sent'] = True
                purchase_data['acknowledgement'] = {
                    'acknowledgement_id': acknowledgement.acknowledgement_id,
                    'transaction_id': acknowledgement.transaction_id,
                    'acknowledgement_type': acknowledgement.acknowledgement_type,
                    'acknowledged_by': acknowledgement.acknowledged_by,
                    'acknowledged_by_role': acknowledgement.acknowledged_by_role,
                    'acknowledgement_message': acknowledgement.acknowledgement_message,
                    'acknowledged_at': acknowledgement.acknowledged_at.isoformat() if acknowledgement.acknowledged_at else None
                }
            else:
                purchase_data['acknowledgement_sent'] = False
                purchase_data['acknowledgement'] = None

            # Add receiver_latest_status for accounts department
            purchase_data['receiver_latest_status'] = "pending"
            if latest_status_info and latest_status_info.get('sender') == 'accounts' and latest_status_info.get('status') == 'pending':
                purchase_data['receiver_latest_status'] = "pending"  # waiting for payment process
            elif latest_status_info and latest_status_info.get('sender') == 'accounts':
                purchase_data['receiver_latest_status'] = latest_status_info.get('status', 'pending')

            purchase_details.append(purchase_data)
        
        # Sort purchase details by created_at date
        purchase_details.sort(
            key=lambda x: x.get('created_at', ''),
            reverse=(sort_order == 'newest')
        )
        
        return jsonify({
            'success': True,
            'message': 'Account purchase details fetched successfully',
            'purchase_details': purchase_details,
            'sort_order': sort_order
        }), 200

    except Exception as e:
        log.error(f"Error getting account purchases: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500