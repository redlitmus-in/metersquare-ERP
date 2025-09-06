import json
import os
from flask import g, request, jsonify, current_app
from sqlalchemy import and_, func
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.attributes import flag_modified
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
        allowed_roles = ['siteSupervisor', 'mepSupervisor', 'procurement', 'projectManager', 'technicalDirector', 'estimation', 'accounts', 'design']
        if not role or role.role not in allowed_roles:
            return jsonify({
                'error': 'Invalid role. Access denied for viewing purchase requisitions'
            }), 403

        # 🔹 Fetch purchases based on role
        if role.role == 'procurement':
            # Procurement team can see all purchases
            purchases = Purchase.query.filter_by(is_deleted=False).all()
            print(f"DEBUG: Procurement user {current_user['full_name']} - Found {len(purchases)} purchases") # Debug log
        elif role.role in ['projectManager', 'technicalDirector', 'estimation', 'accounts', 'design']:
            # Management roles can see all purchases for approval workflows
            purchases = Purchase.query.filter_by(is_deleted=False).all()
            print(f"DEBUG: Management role {role.role} user {current_user['full_name']} - Found {len(purchases)} purchases") # Debug log
        else:
            # Site/MEP supervisors can only see their own purchases
            purchases = Purchase.query.filter_by(is_deleted=False, user_id=current_user['user_id']).all()
            print(f"DEBUG: Supervisor role {role.role} user {current_user['full_name']} - Found {len(purchases)} purchases for user_id {current_user['user_id']}") # Debug log

        purchase_list = []

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

            # Fetch approvals for this purchase
            approvals = Approval.query.filter_by(purchase_id=purchase.purchase_id).all()
            approval_data = []
            for app in approvals:
                approval_data.append({
                    'approval_id': app.approval_id,
                    'reviewer_role': app.reviewer_role,
                    'status': app.status,
                    'comments': app.comments,
                    'reviewed_at': app.reviewed_at,
                    'reviewed_by': app.reviewed_by,
                    'created_at': app.created_at,
                    'created_by': app.created_by,
                    'last_modified_at': app.last_modified_at,
                    'last_modified_by': app.last_modified_by
                })

            # Build final purchase response (✅ includes materials + approvals)
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
                'approvals': approval_data       # ✅ nested approvals
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
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'accounts':
            return jsonify({'error': 'Only Accounts department can view purchase details'}), 403
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404
        # Get related materials
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

        # Get all status history for this purchase
        status_history = PurchaseStatus.query.filter_by(
            purchase_id=purchase_id
        ).order_by(PurchaseStatus.created_at.desc()).all()
        # Get sender/receiver analysis for this purchase - Using simpler approach
        sender_analysis = []
        sender_roles = db.session.query(PurchaseStatus.sender).filter_by(purchase_id=purchase_id).distinct().all()
        
        for role_data in sender_roles:
            sender_role = role_data[0]
            role_query = PurchaseStatus.query.filter_by(purchase_id=purchase_id, sender=sender_role)
            total_actions = role_query.count()
            approved_count = role_query.filter(PurchaseStatus.status == 'approved').count()
            rejected_count = role_query.filter(PurchaseStatus.status == 'rejected').count()
            pending_count = role_query.filter(PurchaseStatus.status == 'pending').count()
            
            sender_analysis.append({
                'sender_role': sender_role,
                'total_actions': total_actions,
                'approved_count': approved_count,
                'rejected_count': rejected_count,
                'pending_count': pending_count,
                'approval_rate': round((approved_count / total_actions * 100), 2) if total_actions > 0 else 0
            })

        receiver_analysis = []
        receiver_roles = db.session.query(PurchaseStatus.receiver).filter_by(purchase_id=purchase_id).distinct().all()
        
        for role_data in receiver_roles:
            receiver_role = role_data[0]
            role_query = PurchaseStatus.query.filter_by(purchase_id=purchase_id, receiver=receiver_role)
            total_received = role_query.count()
            approved_count = role_query.filter(PurchaseStatus.status == 'approved').count()
            rejected_count = role_query.filter(PurchaseStatus.status == 'rejected').count()
            pending_count = role_query.filter(PurchaseStatus.status == 'pending').count()
            
            receiver_analysis.append({
                'receiver_role': receiver_role,
                'total_received': total_received,
                'approved_count': approved_count,
                'rejected_count': rejected_count,
                'pending_count': pending_count,
                'approval_rate': round((approved_count / total_received * 100), 2) if total_received > 0 else 0
            })

        # Format status history
        formatted_status_history = []
        for status in status_history:
            formatted_status_history.append({
                'status_id': status.status_id,
                'purchase_id': status.purchase_id,
                'sender': status.sender,
                'receiver': status.receiver,
                'role': status.role,
                'status': status.status,
                'decision_by_user_id': status.decision_by_user_id,
                'decision_date': status.decision_date.isoformat() if status.decision_date else None,
                'rejection_reason': status.rejection_reason,
                'reject_category': status.reject_category,
                'comments': status.comments,
                'is_active': status.is_active,
                'created_at': status.created_at.isoformat() if status.created_at else None,
                'created_by': status.created_by,
                'last_modified_at': status.last_modified_at.isoformat() if status.last_modified_at else None,
                'last_modified_by': status.last_modified_by
            })
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
            'status_history': formatted_status_history
        }), 200

    except Exception as e:
        log.error(f"Error getting purchase details by ID: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def update_purchase_request(purchase_id):
    try:
        current_user = g.user
        data = request.get_json()

        # 🔹 1. Fetch purchase by ID
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id, is_deleted=False
        ).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # 🔹 2. Update purchase fields
        purchase.requested_by = data.get('requested_by', purchase.requested_by)
        purchase.site_location = data.get('site_location', purchase.site_location)
        purchase.date = data.get('date', purchase.date)
        purchase.project_id = data.get('project_id', purchase.project_id)
        purchase.purpose = data.get('purpose', purchase.purpose)
        purchase.file_path = data.get('file_path', purchase.file_path)
        purchase.last_modified_by = current_user['full_name']

        # 🔹 Ensure material_ids is a list
        if not purchase.material_ids:
            purchase.material_ids = []
        elif isinstance(purchase.material_ids, str):  
            import json
            purchase.material_ids = json.loads(purchase.material_ids)

        # 🔹 3. Handle materials
        new_materials = data.get("materials", [])
        
        # Log initial state
        log.info(f"Initial material_ids for purchase {purchase_id}: {purchase.material_ids}")
        
        
        # Log initial state
        log.info(f"Initial material_ids for purchase {purchase_id}: {purchase.material_ids}")
        
        for mat in new_materials:
            material_id = mat.get("material_id")

            if material_id:
                # ---- Update existing material ----
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
                # ---- Create new material ----
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

                # ✅ Append new material_id to purchase
                log.info(f"Created new material with ID {new_material.material_id}")
                log.info(f"Created new material with ID {new_material.material_id}")
                if new_material.material_id not in purchase.material_ids:
                    log.info(f"Adding new material_id {new_material.material_id} to purchase.material_ids")
                    log.info(f"Adding new material_id {new_material.material_id} to purchase.material_ids")
                    purchase.material_ids.append(new_material.material_id)

        # Log state before forcing update
        log.info(f"Material_ids before forcing update: {purchase.material_ids}")
        
        # 🔹 Force PostgreSQL to recognize the array mutation
        # This is crucial for ARRAY columns - we need to reassign the array
        temp_ids = list(purchase.material_ids)  # Create a new list object
        purchase.material_ids = temp_ids
        flag_modified(purchase, 'material_ids')  # Explicitly mark the field as modified
        
        log.info(f"Material_ids after forcing update: {purchase.material_ids}")
        

        # Log state before forcing update
        log.info(f"Material_ids before forcing update: {purchase.material_ids}")
        
        # 🔹 Force PostgreSQL to recognize the array mutation
        # This is crucial for ARRAY columns - we need to reassign the array
        temp_ids = list(purchase.material_ids)  # Create a new list object
        purchase.material_ids = temp_ids
        flag_modified(purchase, 'material_ids')  # Explicitly mark the field as modified
        
        log.info(f"Material_ids after forcing update: {purchase.material_ids}")
        
        # 🔹 Save purchase with updated material_ids
        purchase.last_modified_by = current_user['full_name']
        db.session.add(purchase)
        db.session.commit()
        
        # Verify the update by re-fetching
        db.session.refresh(purchase)
        log.info(f"Final material_ids after commit and refresh: {purchase.material_ids}")
        
        # Verify the update by re-fetching
        db.session.refresh(purchase)
        log.info(f"Final material_ids after commit and refresh: {purchase.material_ids}")

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

        # Check if file part exists
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