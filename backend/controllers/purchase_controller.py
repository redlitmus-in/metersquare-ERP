import json
import os
from flask import g, request, jsonify, current_app
from sqlalchemy import and_, func
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.attributes import flag_modified
from models.payment_transaction import PaymentTransaction
from models.purchase_status import PurchaseStatus
from models.approval import Approval
from models.material import Material
from models.purchase import Purchase
from models.role import Role
from models.purchase_history import PurchaseHistory
from config.db import db
from datetime import datetime
from config.logging import get_logger
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from utils.email_service import *
from utils.email_service import EmailService
log = get_logger()

def _append_purchase_history_action(purchase_id: int, action_payload: dict, actor_name: str):
    try:
        existing = PurchaseHistory.query.filter_by(purchase_id=purchase_id, is_active=True).order_by(PurchaseHistory.created_at.asc()).first()
        if not existing:
            # Create a single persistent row per purchase_id with action as an array
            history = PurchaseHistory(
                purchase_id=purchase_id,
                is_active=True,
                action=[action_payload],
                created_by=actor_name
            )
            db.session.add(history)
        else:
            # Normalize existing.action to a list and append
            actions = existing.action
            if actions is None:
                actions = []
            elif isinstance(actions, dict):
                actions = [actions]
            elif isinstance(actions, str):
                # best-effort parse JSON string; if fails, wrap as string entry
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
    except Exception as e:
        db.session.rollback()
        log.error(f"Failed to append purchase history for #{purchase_id}: {str(e)}")

def create_purchase_request():
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role not in ['siteSupervisor', 'mepSupervisor']:
            return jsonify({
                'error': 'Invalid role. Only Site Supervisor or MEP Supervisor can create requisition'
            }), 403

        data = request.get_json()
        materials_data = data.get('materials', [])
        if not isinstance(materials_data, list) or not materials_data:
            return jsonify({"error": "Materials must be a non-empty list"}), 400

        material_ids = []
        quantities = []
        costs = []

        # Start transaction
        db.session.begin_nested()

        # Step 1: Create the Purchase header (initially empty material_ids)
        new_purchase = Purchase(
            requested_by=current_user['full_name'],
            site_location=data.get('site_location'),
            date=data.get('date'),
            project_id=data.get('project_id'),
            purpose=data.get('purpose'),
            material_ids=[],  # Update later
            file_path=data.get('file_path'),
            created_by=current_user['full_name'],
            user_id=current_user['user_id']
        )
        db.session.add(new_purchase)
        db.session.commit()  # So new_purchase.purchase_id is available

        # Step 2: Create Materials and collect their IDs
        for material in materials_data:
            new_material = Material(
                project_id=data.get('project_id'),
                description=material.get('description'),
                specification=material.get('specification'),
                unit=material.get('unit'),
                quantity=material.get('quantity'),
                category=material.get('category'),
                cost=material.get('cost'),
                priority=material.get('priority'),
                design_reference=material.get('design_reference'),
                created_by=current_user['full_name']
            )
            db.session.add(new_material)
            db.session.commit()  # To get new_material.material_id

            material_ids.append(new_material.material_id)
            quantities.append(new_material.quantity)
            costs.append(new_material.cost)

        # Step 4: Update Purchase.material_ids with all material ids
        new_purchase.material_ids = material_ids

        # Step 5: Create initial status entry
        from models.purchase_status import PurchaseStatus
        initial_status = PurchaseStatus.create_new_status(
            purchase_id=new_purchase.purchase_id,
            sender_role=role.role,
            receiver_role='procurement',
            status='pending',  # Initial status when created
            decision_by_user_id=current_user['user_id'],
            comments=f'Purchase request created by {role.role}',
            created_by=current_user['full_name']
        )
        db.session.add(initial_status)

        db.session.commit()
                
        materials_data = []
        for material in materials_data:
            materials_data.append({
                'description': material.get('description'),
                'specification': material.get('specification'),
                'unit': material.get('unit'),
                'quantity': material.get('quantity'),
                'category': material.get('category'),
                'cost': material.get('cost'),
                'priority': material.get('priority'),
                'design_reference': material.get('design_reference')
            })
     
        return jsonify({
            'success': True,
            'message': 'Purchase requisition created successfully',
            'purchase_id': new_purchase.purchase_id,
            'material_ids': material_ids
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error creating purchase request: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_all_purchase_request():
    try:
        from sqlalchemy import text
        from flask import request

        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        current_user_id = current_user['user_id']

        # Pagination params
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)  # Max 50 items
        offset = (page - 1) * per_page

        # Single optimized query to get everything at once
        query = text("""
            WITH purchase_data AS (
                SELECT
                    p.purchase_id, p.user_id, p.requested_by, p.site_location,
                    p.date, p.project_id, p.purpose, p.material_ids, p.file_path,
                    p.email_sent, p.created_at, p.created_by, p.last_modified_at,
                    p.last_modified_by,
                    ps.status_id, ps.sender, ps.receiver, ps.status, ps.decision_date,
                    ps.created_at as status_created_at, ps.created_by as status_created_by,
                    ps.comments, ps.rejection_reason, ps.reject_category, ps.is_active,
                    r.role
                FROM purchase p
                LEFT JOIN LATERAL (
                    SELECT * FROM purchase_status
                    WHERE purchase_id = p.purchase_id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) ps ON true
                CROSS JOIN roles r
                WHERE p.is_deleted = false
                    AND r.role_id = :role_id
                    AND p.user_id = :current_user_id
                    AND r.is_deleted = false
                    AND r.role IN ('siteSupervisor','mepSupervisor','procurement','projectManager','estimation','technicalDirector')
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset
            )
            SELECT * FROM purchase_data;
        """)

        result = db.session.execute(query, {
            'role_id': current_user['role_id'],
            'current_user_id': current_user_id,
            'limit': per_page,
            'offset': offset
        }).fetchall()

        if not result:
            # Check if role is valid
            role_check = db.session.execute(text("""
                SELECT role FROM roles
                WHERE role_id = :role_id AND is_deleted = false
            """), {'role_id': current_user['role_id']}).first()

            if not role_check or role_check[0] not in ['siteSupervisor','mepSupervisor','procurement','projectManager','estimation','technicalDirector']:
                return jsonify({'error': 'Invalid role. Access denied for viewing purchase requisitions'}), 403

            return jsonify({
                'success': True,
                'message': 'No purchase requests found',
                'purchase_requests': [],
                'pagination': {'page': page, 'per_page': per_page, 'total': 0}
            }), 200

        # Collect all material IDs for batch fetch
        all_material_ids = set()
        for row in result:
            if row.material_ids:
                all_material_ids.update(row.material_ids)

        # Batch fetch all materials
        materials_map = {}
        if all_material_ids:
            mat_result = db.session.execute(text("""
                SELECT material_id, project_id, description, specification,
                       unit, quantity, category, cost, priority, design_reference,
                       created_at, created_by
                FROM materials
                WHERE is_deleted = false AND material_id = ANY(:ids)
            """), {'ids': list(all_material_ids)}).fetchall()

            for mat in mat_result:
                materials_map[mat[0]] = {
                    'material_id': mat[0],
                    'project_id': mat[1],
                    'description': mat[2],
                    'specification': mat[3],
                    'unit': mat[4],
                    'quantity': mat[5],
                    'category': mat[6],
                    'cost': mat[7],
                    'priority': mat[8],
                    'design_reference': mat[9],
                    'created_at': mat[10],
                    'created_by': mat[11]
                }

        # Build response
        purchase_list = []
        user_name = current_user['full_name']

        for row in result:
            # Get materials for this purchase
            material_data = []
            if row.material_ids:
                material_data = [materials_map[mid] for mid in row.material_ids if mid in materials_map]

            # Format status
            latest_status_info = None
            if row.status_id:
                receiver_latest_status = "pending"
                if row.sender == 'accounts' and row.receiver == 'accounts':
                    receiver_latest_status = "task completed"
                elif row.sender == 'accounts':
                    receiver_latest_status = row.status

                latest_status_info = {
                    'status_id': row.status_id,
                    'sender_latest_status': row.status,
                    'sender': row.sender,
                    'receiver': row.receiver,
                    'status': row.status,
                    'decision_date': row.decision_date.isoformat() if row.decision_date else None,
                    'created_at': row.status_created_at.isoformat() if row.status_created_at else None,
                    'created_by': row.status_created_by,
                    'comments': row.comments,
                    'rejection_reason': row.rejection_reason,
                    'reject_category': row.reject_category,
                    'is_active': row.is_active,
                    'receiver_latest_status': receiver_latest_status
                }

            purchase_list.append({
                'purchase_id': row.purchase_id,
                'user_id': row.user_id,
                'user_name': user_name,
                'requested_by': row.requested_by,
                'site_location': row.site_location,
                'date': row.date,
                'project_id': row.project_id,
                'purpose': row.purpose,
                'material_ids': row.material_ids or [],
                'materials': material_data,
                'file_path': row.file_path,
                'email_sent': row.email_sent,
                'created_at': row.created_at,
                'created_by': row.created_by,
                'last_modified_at': row.last_modified_at,
                'last_modified_by': row.last_modified_by,
                'latest_status': latest_status_info
            })

        # Get total count for pagination
        count_result = db.session.execute(text("""
            SELECT COUNT(*) FROM purchase WHERE is_deleted = false
        """)).scalar()

        return jsonify({
            'success': True,
            'message': 'Purchase requests fetched successfully',
            'purchase_requests': purchase_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': count_result,
                'pages': (count_result + per_page - 1) // per_page
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_purchase_request_by_id(purchase_id):
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        account_transactions = PaymentTransaction.get_by_purchase_id(purchase_id)
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404
        material_ids = purchase.material_ids or []
        materials = []
        if material_ids:
            material_objects = Material.query.filter(
                Material.is_deleted == False,
                Material.material_id.in_(material_ids)
            ).all()

            for mat in material_objects:
                materials.append({
                    'material_id': mat.material_id,
                    'project_id': mat.project_id,
                    'description': mat.description,
                    'specification': mat.specification,
                    'unit': mat.unit,
                    'quantity': mat.quantity,
                    'category': mat.category,
                    'cost': mat.cost,
                    'priority': mat.priority,
                    'design_reference': mat.design_reference,
                    'created_at': mat.created_at.isoformat() if mat.created_at else None,
                    'created_by': mat.created_by
                })
        # Get latest status only
        latest_status = PurchaseStatus.get_latest_status(purchase_id)
        latest_status_info = None
        if latest_status:
            latest_status_info = {
                'status_id': latest_status.status_id,
                'purchase_id': latest_status.purchase_id,
                'sender': latest_status.sender,
                'receiver': latest_status.receiver,
                'role': latest_status.role,
                'status': latest_status.status,
                'decision_by_user_id': latest_status.decision_by_user_id,
                'decision_date': latest_status.decision_date.isoformat() if latest_status.decision_date else None,
                'rejection_reason': latest_status.rejection_reason,
                'reject_category': latest_status.reject_category,
                'comments': latest_status.comments,
                'is_active': latest_status.is_active,
                'created_at': latest_status.created_at.isoformat() if latest_status.created_at else None,
                'created_by': latest_status.created_by,
                'last_modified_at': latest_status.last_modified_at.isoformat() if latest_status.last_modified_at else None,
                'last_modified_by': latest_status.last_modified_by
            }
        # Collect supporting documents from all related payment transactions
        aggregated_supporting_docs = []
        for tx in account_transactions or []:
            docs = tx.supporting_documents
            if not docs:
                continue
            # Legacy format: comma-separated string of filenames or paths
            if isinstance(docs, str):
                raw = docs.strip()
                if raw in ('{}', '[]', 'null', ''):
                    continue
                parts = [p.strip() for p in raw.split(',') if p.strip() and p.strip() not in ('{}', '[]')]
                aggregated_supporting_docs.extend(parts)
            else:
                # If stored as list/array, extend directly
                for p in docs:
                    s = str(p).strip()
                    if s and s not in ('{}', '[]'):
                        aggregated_supporting_docs.append(s)

        # Normalize to filenames and ensure uniqueness while preserving order
        seen = set()
        accounts_files = []
        for p in aggregated_supporting_docs:
            filename = p.split('/')[-1] if '/' in p else p
            filename = filename.strip()
            if not filename or filename in ('{}', '[]'):
                continue
            if filename not in seen:
                seen.add(filename)
                accounts_files.append(filename)

        # Format purchase data
        purchase_data = {
            'purchase_id': purchase.purchase_id,
            'project_id': purchase.project_id,
            'user_id': purchase.user_id,
            'requested_by': purchase.requested_by,
            'site_location': purchase.site_location,
            'date': purchase.date,
            'purpose': purchase.purpose,
            'material_ids': purchase.material_ids,
            'materials': materials,
            'file_path': purchase.file_path,
            'accounts_file': accounts_files,
            'is_deleted': purchase.is_deleted,
            'email_sent': purchase.email_sent,
            'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
            'created_by': purchase.created_by,
            'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
            'last_modified_by': purchase.last_modified_by
        }
        return jsonify({
            'success': True,
            'message': 'Purchase details fetched successfully',
            'purchase': purchase_data,
            'latest_status': latest_status_info
        }), 200

    except Exception as e:
        log.error(f"Error getting purchase details by ID: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def update_purchase_request(purchase_id):
    try:
        current_user = g.user
        data = request.get_json()
        # 🔸 If only accounts files are being updated, handle and return early
        if 'accounts_file' in data:
            accounts_files = data.get('accounts_file')
            # Normalize input to list of filenames
            if isinstance(accounts_files, str):
                filenames = [p.strip() for p in accounts_files.split(',') if p.strip()]
            elif isinstance(accounts_files, list):
                filenames = [str(p).strip() for p in accounts_files if str(p).strip()]
            else:
                return jsonify({'error': 'accounts_file must be string or array of filenames'}), 400
            # Persist as comma-separated filenames on the latest payment transaction for this purchase
            tx = PaymentTransaction.query.filter_by(
                purchase_id=purchase_id,
                is_deleted=False
            ).order_by(PaymentTransaction.created_at.desc()).first()

            if not tx:
                return jsonify({'error': 'No payment transaction found to store accounts_file'}), 404

            tx.supporting_documents = ','.join(filenames) if filenames else None
            tx.last_modified_by = current_user['full_name']
            db.session.add(tx)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Accounts files updated successfully',
                'purchase_id': purchase_id,
                'accounts_file': filenames if filenames else []
            }), 200

        # 🔹 1. Fetch purchase by ID
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id, is_deleted=False
        ).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404
        purchase.requested_by = data.get('requested_by', purchase.requested_by)
        purchase.site_location = data.get('site_location', purchase.site_location)
        purchase.date = data.get('date', purchase.date)
        purchase.project_id = data.get('project_id', purchase.project_id)
        purchase.purpose = data.get('purpose', purchase.purpose)
        purchase.file_path = data.get('file_path', purchase.file_path)
        purchase.last_modified_by = current_user['full_name']
        delete_file = data.get("deletedfiles_name", [])
        # 🔹 Ensure material_ids is a list
        if not purchase.material_ids:
            purchase.material_ids = []
        elif isinstance(purchase.material_ids, str):  
            import json
            purchase.material_ids = json.loads(purchase.material_ids)
        new_materials = data.get("materials", [])
        for mat in new_materials:
            material_id = mat.get("material_id")
            if material_id:
                material = Material.query.filter_by(
                    material_id=material_id, is_deleted=False
                ).first()
                if not material:
                    return jsonify({'error': f'Material with ID {material_id} not found'}), 404

                material.project_id = mat.get('project_id', material.project_id)
                material.description = mat.get('description', material.description)
                material.specification = mat.get('specification', material.specification)
                material.unit = mat.get('unit', material.unit)
                material.quantity = mat.get('quantity', material.quantity)
                material.category = mat.get('category', material.category)
                material.cost = mat.get('cost', material.cost)
                material.priority = mat.get('priority', material.priority)
                material.design_reference = mat.get('design_reference', material.design_reference)
                material.last_modified_by = current_user['full_name']
                db.session.add(material)
                # ✅ Ensure material_id is in purchase.material_ids
                if material_id not in purchase.material_ids:
                    log.info(f"Adding existing material_id {material_id} to purchase.material_ids")
                    log.info(f"Adding existing material_id {material_id} to purchase.material_ids")
                    purchase.material_ids.append(material_id)
            else:
                new_material = Material(
                    project_id=mat.get("project_id"),
                    description=mat.get("description"),
                    specification=mat.get("specification"),
                    unit=mat.get("unit"),
                    quantity=mat.get("quantity"),
                    category=mat.get("category"),
                    cost=mat.get("cost"),
                    priority=mat.get("priority"),
                    design_reference=mat.get("design_reference"),
                    created_by=current_user['full_name']
                )
                db.session.add(new_material)
                db.session.flush()  # ✅ ensures new_material.material_id is generated before commit
                if new_material.material_id not in purchase.material_ids:
                    purchase.material_ids.append(new_material.material_id)
        temp_ids = list(purchase.material_ids)  # Create a new list object
        purchase.material_ids = temp_ids
        flag_modified(purchase, 'material_ids')  # Explicitly mark the field as modified
        # Handle file deletions from Supabase storage
        if delete_file:
            try:
                # Parse current filenames from purchase.file_path
                current_files = [f.strip() for f in (purchase.file_path or '').split(',') if f.strip()]

                # Normalize requested deletions
                to_delete = [f.strip() for f in delete_file if str(f).strip()]

                log.info(f"Attempting to delete files from storage: {to_delete}")
                log.info(f"Current files in DB (purchase.file_path): {current_files}")

                deleted_files = []
                failed_files = []

                for filename in to_delete:
                    path = f"{purchase_id}/{filename}"
                    try:
                        supabase.storage.from_(SUPABASE_BUCKET).remove([path])
                        log.info(f"Deleted from Supabase: {path}")
                        deleted_files.append(filename)
                    except Exception as e:
                        log.warning(f"Failed to delete {path}: {str(e)}")
                        failed_files.append(filename)

                # Update DB: remove only successfully deleted filenames
                remaining_files = [f for f in current_files if f not in deleted_files]
                purchase.file_path = ",".join(remaining_files) if remaining_files else None

                log.info(f"Remaining files in DB after deletion: {remaining_files}")

            except Exception as e:
                log.error(f"Error handling file deletions: {str(e)}")
                deleted_files = []
                failed_files = to_delete
        purchase.last_modified_by = current_user['full_name']
        db.session.add(purchase)
        db.session.commit()
        db.session.refresh(purchase)
        return jsonify({
            "success": True,
            "message": "Purchase request updated successfully",
            "purchase_id": purchase.purchase_id,
            "material_ids": purchase.material_ids
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def delete_purchase(purchase_id):
    try:
        # 1️⃣ Find the purchase
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()

        if not purchase:
            return jsonify({"message": "Purchase not found"}), 404

        # if purchase:
        #     item = RequisitionItem.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        #     if item:
        #         item.is_deleted = True
        if purchase.material_ids:  # make sure it's not empty/null
            materials = Material.query.filter(
                Material.material_id.in_(purchase.material_ids),  # ✅ use IN instead of =
                Material.is_deleted == False
            ).all()
            for mat in materials:
                mat.is_deleted = True

        purchase.is_deleted = True
        # 4️⃣ Save changes
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Purchase {purchase_id} and related records deleted successfully"
        }), 200
        return jsonify({
            "success": True,
            "message": f"Purchase {purchase_id} and related records deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY') # Use service role for uploading
SUPABASE_BUCKET = "file_upload"
ACCOUNT_BUCKET = "account_file"
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}

# Initialize Supabase client
supabase: Client = create_client(supabase_url, supabase_key)

def send_purchase_request_email(purchase_id):
    """API to manually trigger email for a purchase request - OPTIMIZED FOR SPEED"""
    try:
        from sqlalchemy.orm import load_only
        from sqlalchemy import text
        import threading

        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Ultra-fast single SQL query to get all data at once
        result = db.session.execute(text("""
            SELECT
                r.role,
                p.purchase_id, p.site_location, p.date, p.project_id,
                p.purpose, p.file_path, p.material_ids, p.requested_by, p.user_id
            FROM purchase p
            CROSS JOIN roles r
            WHERE p.purchase_id = :pid
                AND p.is_deleted = false
                AND r.role_id = :rid
                AND r.is_deleted = false
            LIMIT 1
        """), {'pid': purchase_id, 'rid': current_user['role_id']}).first()

        if not result:
            return jsonify({'error': 'Purchase request not found or invalid role'}), 404

        role_name = result[0]
        if role_name not in ['siteSupervisor', 'mepSupervisor', 'procurement', 'projectManager', 'technicalDirector']:
            return jsonify({'error': 'Insufficient permissions'}), 403

        # Extract purchase data from result
        purchase_data = {
            'purchase_id': result[1],
            'site_location': result[2],
            'date': result[3],
            'project_id': result[4],
            'purpose': result[5],
            'file_path': result[6],
            'user_id': result[9],
        }
        material_ids = result[7]
        requested_by = result[8]

        requester_info = {
            'full_name': requested_by,
            'email': current_user.get('email', ''),
            'role': role_name
        }

        # Get materials only if needed (single optimized query)
        materials = []
        if material_ids:
            mat_query = db.session.execute(text("""
                SELECT description, specification, unit, quantity, category, cost, priority, design_reference
                FROM materials
                WHERE is_deleted = false AND material_id = ANY(:ids)
            """), {'ids': material_ids}).fetchall()

            materials = [dict(zip(['description', 'specification', 'unit', 'quantity', 'category', 'cost', 'priority', 'design_reference'], m)) for m in mat_query]

        # Send email in background thread for instant response
        def send_email_async(app_context):
            try:
                with app_context:
                    email_service = EmailService()
                    if role_name == 'procurement':
                        procurement_info = {
                            'full_name': user_name,
                            'user_id': user_id,
                            'email': current_user.get('email', ''),
                            'role': role_name
                        }
                        email_service.send_procurement_to_project_manager_notification(
                            purchase_data, materials, requester_info, procurement_info
                        )
                    else:
                        email_service.send_purchase_request_notification(
                            purchase_data, materials, requester_info
                        )
                    log.info(f"Email sent for purchase #{purchase_id}")
            except Exception as e:
                log.error(f"Email error: {str(e)}")

        # Start background thread with current app context
        from flask import current_app
        app_context = current_app.app_context()
        threading.Thread(target=send_email_async, args=(app_context,), daemon=True).start()

        # Update status immediately (non-blocking)
        from models.purchase_status import PurchaseStatus
        try:
            # Quick status update
            if role_name == 'procurement':
                # Check if status exists and update or create
                existing_status = PurchaseStatus.query.filter_by(purchase_id=purchase_id).first()
                if existing_status:
                    existing_status.sender = 'procurement'
                    existing_status.receiver = 'projectManager'
                    existing_status.role = 'procurement'
                    existing_status.status = 'approved'
                    existing_status.decision_by_user_id = user_id
                    existing_status.rejection_reason = None
                    existing_status.reject_category = None
                    existing_status.comments = 'Procurement reviewed and sent to Project Manager for approval (Email queued)'
                    existing_status.decision_date = datetime.utcnow()
                    existing_status.is_active = True
                    existing_status.last_modified_by = user_name
                else:
                    new_status = PurchaseStatus(
                        purchase_id=purchase_id,
                        sender='procurement',
                        receiver='projectManager',
                        role='procurement',
                        status='approved',
                        decision_by_user_id=user_id,
                        comments='Procurement reviewed and sent to Project Manager for approval (Email queued)',
                        created_by=user_name,
                        is_active=True,
                        decision_date=datetime.utcnow()
                    )
                    db.session.add(new_status)
            else:
                # Check if status already exists for site/MEP supervisor
                existing_status = PurchaseStatus.query.filter_by(purchase_id=purchase_id).first()
                if existing_status:
                    # Update existing status instead of creating new
                    existing_status.sender = role_name
                    existing_status.receiver = 'procurement'
                    existing_status.role = role_name
                    existing_status.status = 'pending'
                    existing_status.decision_by_user_id = user_id
                    existing_status.comments = 'Purchase request created and sent to Procurement team (Email queued)'
                    existing_status.decision_date = datetime.utcnow()
                    existing_status.is_active = True
                    existing_status.last_modified_by = user_name
                else:
                    # Create initial status only if it doesn't exist
                    initial_status = PurchaseStatus(
                        purchase_id=purchase_id,
                        sender=role_name,
                        receiver='procurement',
                        role=role_name,
                        status='pending',
                        decision_by_user_id=user_id,
                        comments='Purchase request created and sent to Procurement team (Email queued)',
                        created_by=user_name,
                        is_active=True,
                        decision_date=datetime.utcnow()
                    )
                    db.session.add(initial_status)

            # Single commit for all changes
            db.session.commit()

            # Update purchase email_sent flag
            Purchase.query.filter_by(purchase_id=purchase_id).update({
                'email_sent': True,
                'last_modified_by': user_name
            })
            db.session.commit()

        except Exception as e:
            log.error(f"Error updating status: {str(e)}")
            db.session.rollback()

        # Return immediate success response (email is being sent in background)
        return jsonify({
            'success': True,
            'message': f'Email processing for purchase request #{purchase_id}',
            'status': 'Email queued and being sent in background'
        }), 200

    except Exception as e:
        log.error(f"Error in send_purchase_request_email: {str(e)}")
        return jsonify({'error': str(e)}), 500