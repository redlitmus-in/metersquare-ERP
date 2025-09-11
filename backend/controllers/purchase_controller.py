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
from config.db import db
from datetime import datetime
from config.logging import get_logger
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from utils.email_service import *
from utils.email_service import EmailService
log = get_logger()

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

        # # Step 3: Create ONE RequisitionItem with all material_ids as a list
        # total_quantity = sum(quantities)
        # total_cost = sum((q * c if c else 0) for q, c in zip(quantities, costs))

        # requisition_item = RequisitionItem(
        #     purchase_id=new_purchase.purchase_id,
        #     material_id=material_ids,  # pass list here, e.g. [12, 34]
        #     quantity_requested=total_quantity,
        #     unit_cost=None,  # or some calculated/average unit cost
        #     total_cost=total_cost,
        #     created_by=current_user['full_name']
        # )
        # db.session.add(requisition_item)

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
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        allowed_roles = 'siteSupervisor,mepSupervisor,procurement,projectManager,estimation,technicalDirector'
        if not role or role.role not in allowed_roles:
            return jsonify({
                'error': 'Invalid role. Access denied for viewing purchase requisitions'
            }), 403
        purchase_list = []
        purchases = Purchase.query.filter_by(is_deleted=False).all()
        for purchase in purchases:
            material_ids = purchase.material_ids if purchase.material_ids else []

            # Fetch related materials for this purchase
            materials = Material.query.filter(
                Material.is_deleted == False,
                Material.material_id.in_(material_ids)
            ).all()

            material_data = []
            for mat in materials:
                material_data.append({
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
                    'created_at': mat.created_at,
                    'created_by': mat.created_by
                })

            # Get latest status for this purchase
            latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)
            
            # Format latest status details
            latest_status_info = None
            if latest_status:
                # Determine receiver_latest_status based on sender and receiver
                receiver_latest_status = "pending"
                if latest_status.sender == 'accounts' and latest_status.receiver == 'accounts':
                    receiver_latest_status = "task completed"  # task completed - waiting for accounts action
                elif latest_status.sender == 'accounts':
                    receiver_latest_status = latest_status.status
                
                latest_status_info = {
                    'status_id': latest_status.status_id,
                    'sender_latest_status': latest_status.status,
                    'sender': latest_status.sender,
                    'receiver': latest_status.receiver,
                    'status': latest_status.status,
                    'decision_date': latest_status.decision_date.isoformat() if latest_status.decision_date else None,
                    'created_at': latest_status.created_at.isoformat(),
                    'created_by': latest_status.created_by,
                    'comments': latest_status.comments,
                    'rejection_reason': latest_status.rejection_reason,
                    'reject_category': latest_status.reject_category,
                    'is_active': latest_status.is_active,
                    'receiver_latest_status': receiver_latest_status
                }

            # Build final purchase response (✅ includes materials + latest status)
            purchase_list.append({
                'purchase_id': purchase.purchase_id,
                'user_id': purchase.user_id,
                'user_name': current_user['full_name'],
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date,
                'project_id': purchase.project_id,
                'purpose': purchase.purpose,
                'material_ids': material_ids,
                'materials': material_data,     # ✅ nested materials
                'file_path': purchase.file_path,
                'email_sent': purchase.email_sent,
                'created_at': purchase.created_at,
                'created_by': purchase.created_by,
                'last_modified_at': purchase.last_modified_at,
                'last_modified_by': purchase.last_modified_by,
                'latest_status': latest_status_info  # ✅ latest status details
            })

        return jsonify({
            'success': True,
            'message': 'Purchase requests fetched successfully',
            'purchase_requests': purchase_list
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

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def file_upload(purchase_id):
    try:
        # Check if user is logged in
        current_user = g.get("user")
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        if current_user['role'] == 'procurement':
            if 'file' not in request.files:
                return jsonify({'error': 'No file part in the request'}), 400

            file = request.files['file']

            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            if not allowed_file(file.filename):
                return jsonify({'error': 'File type not allowed'}), 400

            # Prepare file for upload
            filename = secure_filename(file.filename)
            file_path = f"{purchase_id}/{filename}"
            file_content = file.read()

            # Optional: delete existing file
            try:
                supabase.storage.from_(SUPABASE_BUCKET).remove([file_path])
            except Exception as e:
                log.warning(f"Failed to delete existing file: {e}")

            # Upload the file
            response = supabase.storage.from_(SUPABASE_BUCKET).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": file.content_type}
            )

            if isinstance(response, dict) and response.get("error"):
                return jsonify({'error': 'Upload failed', 'details': response['error']}), 500

            # 🔥 Build public URL manually
            public_url = f"{file_path}"

            # Optionally update your database (example)
            purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
            if not purchase:
                return jsonify({'error': 'Purchase request not found'}), 404

            purchase.file_path = public_url
            purchase.last_modified_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'File uploaded successfully',
                'file_url': public_url
            }), 200

        if current_user['role'] == 'accounts':
            if 'file' not in request.files:
                return jsonify({'error': 'No file part in the request'}), 400

            file = request.files['file']

            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            if not allowed_file(file.filename):
                return jsonify({'error': 'File type not allowed'}), 400

            # Prepare file for upload
            filename = secure_filename(file.filename)
            file_path = f"{purchase_id}/{filename}"
            file_content = file.read()

            # Optional: delete existing file
            try:
                supabase.storage.from_(ACCOUNT_BUCKET).remove([file_path])
            except Exception as e:
                log.warning(f"Failed to delete existing file: {e}")

            # Upload the file
            response = supabase.storage.from_(SUPABASE_BUCKET).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": file.content_type}
            )

            if isinstance(response, dict) and response.get("error"):
                return jsonify({'error': 'Upload failed', 'details': response['error']}), 500

            # 🔥 Build public URL manually
            public_url = f"{file_path}"

            # Optionally update your database (example)
            purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
            if not purchase:
                return jsonify({'error': 'Purchase request not found'}), 404

            purchase.file_path = public_url
            purchase.last_modified_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'File uploaded successfully',
                'file_url': public_url
            }), 200

    except Exception as e:
        log.error(f"File upload error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def send_purchase_request_email(purchase_id):
    """API to manually trigger email for a purchase request"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role not in ['siteSupervisor', 'mepSupervisor', 'procurement', 'projectManager', 'technicalDirector']:
            return jsonify({'error': 'Insufficient permissions'}), 403

        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

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
            'role': role.role
        }

        email_service = EmailService()
        
        # Determine which email method to use based on user role
        if role.role == 'procurement':
            # Procurement sends to project manager only
            procurement_info = {
                'full_name': user_name,
                'user_id': user_id,
                'email': current_user.get('email', ''),
                'role': role.role
            }
            
            # Create procurement status entry when sending to PM
            try:
                from models.purchase_status import PurchaseStatus
                procurement_status = PurchaseStatus.create_new_status(
                    purchase_id=purchase_id,
                    sender_role='procurement',
                    receiver_role='projectManager',
                    status='approved',  # Procurement approved and sending to PM
                    decision_by_user_id=user_id,
                    comments=f'Procurement reviewed and sent to Project Manager for approval',
                    created_by=user_name
                )
                db.session.add(procurement_status)
                db.session.commit()  # Commit the status entry immediately
                log.info(f"Created and committed procurement status entry for purchase #{purchase_id}")
            except Exception as e:
                db.session.rollback()
                log.error(f"Error creating procurement status entry: {str(e)}")
                # Continue with email even if status creation fails
            
            success = email_service.send_procurement_to_project_manager_notification(purchase_data, materials, requester_info, procurement_info)
        else:
            # All other roles (siteSupervisor, mepSupervisor, projectManager, technicalDirector) send to all procurement
            # Create initial status entry for the requester
            try:
                from models.purchase_status import PurchaseStatus
                initial_status = PurchaseStatus.create_new_status(
                    purchase_id=purchase_id,
                    sender_role=role.role,
                    receiver_role='procurement',
                    status='pending',  # Initial status when sending to procurement
                    decision_by_user_id=user_id,
                    comments=f'Purchase request created and sent to Procurement team',
                    created_by=user_name
                )
                db.session.add(initial_status)
                db.session.commit()  # Commit the status entry immediately
                log.info(f"Created and committed initial status entry for purchase #{purchase_id}")
            except Exception as e:
                db.session.rollback()
                log.error(f"Error creating initial status entry: {str(e)}")
                # Continue with email even if status creation fails
            
            success = email_service.send_purchase_request_notification(purchase_data, materials, requester_info)
        
        if success:
            # Update the email_sent status in database
            purchase.email_sent = True
            purchase.last_modified_by = current_user['full_name']
            
            # Update the existing status entry to indicate email was sent
            try:
                from models.purchase_status import PurchaseStatus
                latest_status = PurchaseStatus.get_latest_status(purchase_id)
                if latest_status:
                    latest_status.comments = f"{latest_status.comments} (Email sent to {'procurement' if role.role != 'procurement' else 'projectManager'})"
                    db.session.commit()
                    log.info(f"Updated status entry to indicate email sent for purchase #{purchase_id}")
            except Exception as e:
                log.error(f"Error updating status comments: {str(e)}")
                # Continue even if status update fails
            
            return jsonify({'success': True, 'message': f'Email sent for purchase request #{purchase_id}'}), 200
        else:
            return jsonify({'success': False, 'message': f'Failed to send email for purchase request #{purchase_id}'}), 500

    except Exception as e:
        log.error(f"Error in send_purchase_request_email: {str(e)}")
        return jsonify({'error': str(e)}), 500