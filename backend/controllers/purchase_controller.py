import os
from flask import g, request, jsonify, current_app
from sqlalchemy import and_
from models.material import Material
from models.purchase import Purchase
from models.role import Role
from config.db import db
from datetime import datetime
from controllers.workflow_controller import WorkflowController
from config.logging import get_logger
from werkzeug.utils import secure_filename
from supabase import create_client, Client

log = get_logger()

def create_purchase_request():
    try: 
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        # Validate role
        if not role or role.role not in ['siteEngineer', 'mepSupervisor']:
            return jsonify({
                'error': 'Invalid role. Only Site Supervisor or MEP Supervisor can create requisition'
            }), 403

        data = request.get_json()
        materials_data = data.get('materials', [])
        if not isinstance(materials_data, list) or not materials_data:
            return jsonify({"error": "Materials must be a non-empty list"}), 400

        material_ids = []
        
        # Start transaction
        db.session.begin_nested()

        # Loop through material items
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
                created_at=datetime.utcnow(),
                created_by=current_user['full_name']
            )
            db.session.add(new_material)
            db.session.flush()  # Use flush to assign ID without committing
            material_ids.append(new_material.material_id)

        # Now create purchase entry with material_ids as a list of integers
        new_purchase = Purchase(
            requested_by=current_user['full_name'],
            site_location=data.get('site_location'),
            date=data.get('date'),
            project_id=data.get('project_id'),
            purpose=data.get('purpose'),
            material_ids=material_ids,  # This must be list of ints, no conversion needed
            file_path=data.get('file_path'),
            created_at=datetime.utcnow(),
            created_by=current_user['full_name']
        )
        db.session.add(new_purchase)
        
        # Commit the entire transaction
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Purchase requisition created successfully',
            'purchase_id': new_purchase.purchase_id,
            'material_ids': material_ids
        }), 200

    except Exception as e:
        # Rollback the main transaction
        db.session.rollback()
        print(f"Error creating purchase request: {str(e)}")
        return jsonify({'error': str(e)}), 500

def get_all_purchase_request():
    try:
        # Fetch all purchases where is_deleted=False (assuming Purchase has is_deleted column)
        purchases = Purchase.query.filter_by(is_deleted=False).all()

        # Prepare list to hold all materials for all purchases
        all_materials = []

        # For each purchase, get its material_ids and query Materials
        for purchase in purchases:
            if not purchase.material_ids:
                continue
            # Query materials for this purchase (filter is_deleted=False and material_id in purchase.material_ids)
            materials = Material.query.filter(
                Material.is_deleted == False,
                Material.material_id.in_(purchase.material_ids)
            ).all()
            
            # Convert materials to dict for JSON serialization
            for mat in materials:
                all_materials.append({
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

        # Serialize purchases to dicts for JSON response
        purchase_list = []
        for p in purchases:
            purchase_list.append({
                'purchase_id': p.purchase_id,
                'requested_by': p.requested_by,
                'site_location': p.site_location,
                'date': p.date,
                'project_id': p.project_id,
                'purpose': p.purpose,
                'material_ids': p.material_ids,
                'file_path': p.file_path,
                'created_at': p.created_at,
                'created_by': p.created_by
            })

        return jsonify({
            'success': True,
            'message': 'Purchase requests fetched successfully',
            'purchase_requests': purchase_list,
            'materials': all_materials
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_purchase_request_by_id(purchase_id):
    try:
        # Fetch the purchase by ID, assuming it has an is_deleted flag
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()

        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Get materials linked to this purchase
        material_ids = purchase.material_ids or []
        materials = []

        if material_ids:
            material_objects = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(material_ids)
                )
            ).all()

            # Serialize materials
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
                    'created_at': mat.created_at,
                    'created_by': mat.created_by
                })
        # Serialize purchase
        purchase_data = {
            'purchase_id': purchase.purchase_id,
            'requested_by': purchase.requested_by,
            'site_location': purchase.site_location,
            'date': purchase.date,
            'project_id': purchase.project_id,
            'purpose': purchase.purpose,
            'material_ids': purchase.material_ids,
            'file_path': purchase.file_path,
            'created_at': purchase.created_at,
            'created_by': purchase.created_by
        }

        return jsonify({
            'success': True,
            'message': 'Purchase request fetched successfully',
            'purchase': purchase_data,
            'materials': materials
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

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