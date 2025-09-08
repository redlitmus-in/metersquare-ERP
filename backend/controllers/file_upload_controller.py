from flask import request, jsonify
from sqlalchemy.orm.attributes import flag_modified
import os
from models.payment_transaction import PaymentTransaction
from models.purchase_status import PurchaseStatus
from models.approval import Approval
from models.material import Material
from models.purchase import Purchase
from models.role import Role
from models.payment_transaction import PaymentTransaction
from config.db import db
from datetime import datetime
from config.logging import get_logger
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from utils.email_service import *
from utils.email_service import EmailService
log = get_logger()

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY') # Use service role for uploading
SUPABASE_BUCKET = "file_upload"
ACCOUNT_BUCKET = "account_file"
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}

# Initialize Supabase client
supabase: Client = create_client(supabase_url, supabase_key)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_files(key, id):
    get_purchase_id = None
    files = []

    if "file" in request.files:
        files = request.files.getlist("file")

    uploaded_files = []
    
    log.info(f"Upload request - key: {key}, id: {id}, files count: {len(files)}")
    
    # Extended list of roles that can upload purchase files
    if key in ["siteSupervisor","mepSupervisor","procurement","projectManager","estimation","technicalDirector"]:
        role_folder_map = {
            "siteSupervisor": "sitesupervisor",
            "mepSupervisor": "mepsupervisor",
            "procurement": "procurement",
            "projectManager": "projectmanager",
            "estimation": "estimation",
            "technicalDirector": "technicaldirector"
        }
        base_folder = role_folder_map.get(key, key.lower())
        get_purchase = Purchase.query.filter_by(purchase_id=id).first()
        if not get_purchase:
            return jsonify({"error": "Purchase not found"}), 404
        # Process each uploaded file
        for index, file in enumerate(files):
            if file.filename == '':
                continue
            try:
                # Generate secure filename
                filename = secure_filename(file.filename)
                file_name = os.path.splitext(filename)[0]
                file_extension = os.path.splitext(filename)[1]
                
                # Create unique filename with index
                unique_filename = f"{file_name}_{index}{file_extension}"
                # Store in role-specific folder
                supabase_path = f"{base_folder}/{id}/{unique_filename}"
                
                # Read file content
                file_content = file.read()
                
                # Upload to Supabase storage
                try:
                    # Check if file already exists and delete it first
                    try:
                        supabase.storage.from_(SUPABASE_BUCKET).remove([supabase_path])
                    except:
                        pass
                    
                    # Upload file to Supabase storage
                    supabase_response = supabase.storage.from_(SUPABASE_BUCKET).upload(
                        path=supabase_path,
                        file=file_content,
                        file_options={"content-type": file.content_type or "application/octet-stream"}
                    )
                    # Check if upload was successful (response should be a dict or have success indicator)
                    if isinstance(supabase_response, dict) and supabase_response.get('error'):
                        return jsonify({"error": f"Failed to upload file to storage: {supabase_response['error']}"}), 500
                    public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(supabase_path)
                except Exception as e:
                    log.error(f"Supabase storage error: {str(e)}")
                    return jsonify({"error": f"Failed to upload file to Supabase storage: {str(e)}"}), 500
                
                # Store file information (shortened to fit in 255 char limit)
                uploaded_files.append({
                    "fn": unique_filename,  # filename
                    "orig": filename,      # original_filename
                    "path": supabase_path, # file_path
                    "size": len(file_content), # file_size
                    "type": file.content_type or "application/octet-stream" # content_type
                })
                
            except Exception as e:
                log.error(f"File processing error: {str(e)}")
                return jsonify({"error": f"Failed to process file {file.filename}: {str(e)}"}), 500
        # Update purchase with file path (store only filenames)
        try:
            # Store only filenames as comma-separated string
            filenames = [file_info["fn"] for file_info in uploaded_files]
            get_purchase.file_path = ",".join(filenames)
        except Exception as e:
            log.error(f"Failed to store filenames: {str(e)}")
            return jsonify({"error": f"Failed to process file data: {str(e)}"}), 500

        try:
            db.session.commit()
            return jsonify({
                "message": "Files uploaded successfully to Supabase storage",
                "uploaded_files": uploaded_files,
                "total_files": len(uploaded_files)
            }), 200
        except Exception as e:
            db.session.rollback()
            log.error(f"Database error for purchase {id}: {str(e)}")
            return jsonify({"error": f"Failed to save file information to database: {str(e)}"}), 500

    elif key == "accounts":
        get_account = PaymentTransaction.query.filter_by(purchase_id=id).first()
        if not get_account:
            return jsonify({"error": "Purchase not found"}), 404

        # Process each uploaded file
        for index, file in enumerate(files):
            if file.filename == '':
                continue
                
            try:
                # Generate secure filename
                filename = secure_filename(file.filename)
                file_name = os.path.splitext(filename)[0]
                file_extension = os.path.splitext(filename)[1]
                # Create unique filename with index
                unique_filename = f"{file_name}_{index}{file_extension}"
                supabase_path = f"accounts/{id}/{unique_filename}"
                # Read file content
                file_content = file.read()
                # Upload to Supabase storage
                try:
                    # Check if file already exists and delete it first
                    try:
                        supabase.storage.from_(SUPABASE_BUCKET).remove([supabase_path])
                    except:
                        pass
                    
                    # Upload file to Supabase storage
                    supabase_response = supabase.storage.from_(SUPABASE_BUCKET).upload(
                        path=supabase_path,
                        file=file_content,
                        file_options={"content-type": file.content_type or "application/octet-stream"}
                    )
                    # Check if upload was successful (response should be a dict or have success indicator)
                    if isinstance(supabase_response, dict) and supabase_response.get('error'):
                        return jsonify({"error": f"Failed to upload file to storage: {supabase_response['error']}"}), 500
                    
                    # Get public URL for the uploaded file
                    public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(supabase_path)
                    
                except Exception as e:
                    log.error(f"Supabase storage error: {str(e)}")
                    return jsonify({"error": f"Failed to upload file to Supabase storage: {str(e)}"}), 500
                
                # Store file information (shortened to fit in 255 char limit)
                uploaded_files.append({
                    "fn": unique_filename,  # filename
                    "orig": filename,      # original_filename
                    "path": supabase_path, # file_path
                    "size": len(file_content), # file_size
                    "type": file.content_type or "application/octet-stream" # content_type
                })
                
            except Exception as e:
                log.error(f"File processing error: {str(e)}")
                return jsonify({"error": f"Failed to process file {file.filename}: {str(e)}"}), 500
        # Update purchase with file path (store only filenames)
        try:
            # Store only filenames as comma-separated string
            filenames = [file_info["fn"] for file_info in uploaded_files]
            get_account.supporting_documents = ",".join(filenames)
        except Exception as e:
            log.error(f"Failed to store filenames: {str(e)}")
            return jsonify({"error": f"Failed to process file data: {str(e)}"}), 500
        try:
            db.session.commit()
            return jsonify({
                "message": "Files uploaded successfully to Supabase storage",
                "uploaded_files": uploaded_files,
                "total_files": len(uploaded_files)
            }), 200
        except Exception as e:
            db.session.rollback()
            log.error(f"Database error for purchase {id}: {str(e)}")
            return jsonify({"error": f"Failed to save file information to database: {str(e)}"}), 500

def get_uploaded_file(key, id):
    """Get uploaded files for a specific purchase from Supabase storage.
    Rules:
      - key == "accounts": list ONLY from accounts/{purchase_id}
      - key in {procurement, projectManager, technicalDirector}: list from ALL non-accounts folders
      - other allowed roles: list only from that role's folder
    """
    try:
        role_folder_map = {
            "siteSupervisor": "sitesupervisor",
            "mepSupervisor": "mepsupervisor",
            "procurement": "procurement",
            "projectManager": "projectmanager",
            "estimation": "estimation",
            "technicalDirector": "technicaldirector",
            "accounts": "accounts",
        }

        def list_folder(prefix_folder: str, purchase_id: str):
            try:
                entries = supabase.storage.from_(SUPABASE_BUCKET).list(path=f"{prefix_folder}/{purchase_id}")
                files = []
                if isinstance(entries, list):
                    for entry in entries:
                        name = entry.get('name') if isinstance(entry, dict) else None
                        if name:
                            path = f"{prefix_folder}/{purchase_id}/{name}"
                            public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(path)
                            files.append({
                                "filename": name,
                                "file_path": path,
                                "public_url": public_url,
                                "storage_bucket": SUPABASE_BUCKET,
                                "folder": prefix_folder,
                            })
                return files
            except Exception as e:
                log.warning(f"List storage failed for {prefix_folder}/{purchase_id}: {str(e)}")
                return []

        # Accounts: only its own folder (separate group response shape)
        if key == "accounts":
            accounts_files = list_folder(role_folder_map["accounts"], id)
            return jsonify({
                "success": True,
                "accounts_files": accounts_files,
                "purchase_files": [],
                "totals": {
                    "accounts_files": len(accounts_files),
                    "purchase_files": 0
                }
            }), 200

        allowed_roles = set(role_folder_map.keys())
        if key not in allowed_roles:
            return jsonify({"error": "Invalid key"}), 400

        # PM/procurement/TD: view non-accounts (purchase) union, and accounts separately
        elevated_view = {"procurement", "projectManager", "technicalDirector"}
        if key in elevated_view:
            accounts_files = list_folder(role_folder_map["accounts"], id)
            purchase_folders = [v for k, v in role_folder_map.items() if k != "accounts"]
            aggregated = []
            for folder in purchase_folders:
                aggregated.extend(list_folder(folder, id))
            # Legacy fallback: files that may exist at top-level {purchase_id}/ from earlier versions
            try:
                legacy_entries = supabase.storage.from_(SUPABASE_BUCKET).list(path=f"{id}")
                if isinstance(legacy_entries, list):
                    for entry in legacy_entries:
                        name = entry.get('name') if isinstance(entry, dict) else None
                        if name:
                            path = f"{id}/{name}"
                            public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(path)
                            aggregated.append({
                                "filename": name,
                                "file_path": path,
                                "public_url": public_url,
                                "storage_bucket": SUPABASE_BUCKET,
                                "folder": "legacy"
                            })
            except Exception as e:
                log.warning(f"Legacy list failed for {id}: {str(e)}")
            # dedupe by path
            unique_purchase = {f["file_path"]: f for f in aggregated}
            purchase_files = list(unique_purchase.values())
            return jsonify({
                "success": True,
                "accounts_files": accounts_files,
                "purchase_files": purchase_files,
                "totals": {
                    "accounts_files": len(accounts_files),
                    "purchase_files": len(purchase_files)
                }
            }), 200

        # Other roles: their own folder + legacy files
        folder = role_folder_map[key]
        files = list_folder(folder, id)
        
        # Also check for legacy files at top-level {id}/ from earlier versions
        try:
            legacy_entries = supabase.storage.from_(SUPABASE_BUCKET).list(path=f"{id}")
            if isinstance(legacy_entries, list):
                for entry in legacy_entries:
                    name = entry.get('name') if isinstance(entry, dict) else None
                    if name:
                        path = f"{id}/{name}"
                        public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(path)
                        files.append({
                            "filename": name,
                            "file_path": path,
                            "public_url": public_url,
                            "storage_bucket": SUPABASE_BUCKET,
                            "folder": "legacy"
                        })
        except Exception as e:
            log.warning(f"Legacy list failed for {id}: {str(e)}")
        
        # Dedupe by path
        unique_files = {f["file_path"]: f for f in files}
        purchase_files = list(unique_files.values())
        
        return jsonify({
            "success": True,
            "accounts_files": [],
            "purchase_files": purchase_files,
            "totals": {
                "accounts_files": 0,
                "purchase_files": len(purchase_files)
            }
        }), 200
    except Exception as e:
        log.error(f"get_uploaded_file failed for key={key}, id={id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

def all_delete_file(key, id):
    """Delete all uploaded files for a specific purchase"""
    try:
        if key in ["siteSupervisor","mepSupervisor","procurement","projectManager","estimation","technicalDirector"]:
            role_folder_map = {
                "siteSupervisor": "sitesupervisor",
                "mepSupervisor": "mepsupervisor",
                "procurement": "procurement",
                "projectManager": "projectmanager",
                "estimation": "estimation",
                "technicalDirector": "technicaldirector",
            }
            base_folder = role_folder_map.get(key, key.lower())
            get_purchase = Purchase.query.filter_by(purchase_id=id).first()
            if not get_purchase:
                return jsonify({"error": "Purchase not found"}), 404
            
            # Get current files and delete from Supabase storage
            if get_purchase.file_path:
                try:
                    filenames = get_purchase.file_path.split(",")
                    
                    # Delete each file from Supabase storage
                    for filename in filenames:
                        if filename.strip():
                            # Files are stored directly under purchase_id
                            file_path = f"{id}/{filename.strip()}"
                            try:
                                supabase.storage.from_(SUPABASE_BUCKET).remove([file_path])
                                log.info(f"Deleted file from Supabase: {file_path}")
                            except Exception as e:
                                log.warning(f"Failed to delete file: {file_path} - {str(e)}")
                            
                except Exception as e:
                    log.warning(f"Failed to parse filenames for purchase {id}: {str(e)}")
            
            # Clear all uploaded files from database
            get_purchase.file_path = None
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "All files deleted successfully from Supabase storage and database"
            }), 200
        else:
            return jsonify({"error": "Invalid key"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

def delete_file_file(key, id):
    """Delete specific files from uploaded files"""
    try:
        if key in ["siteSupervisor","mepSupervisor","procurement","projectManager","estimation","technicalDirector"]:
            role_folder_map = {
                "siteSupervisor": "sitesupervisor",
                "mepSupervisor": "mepsupervisor",
                "procurement": "procurement",
                "projectManager": "projectmanager",
                "estimation": "estimation",
                "technicalDirector": "technicaldirector",
            }
            base_folder = role_folder_map.get(key, key.lower())
            
            get_purchase = Purchase.query.filter_by(purchase_id=id).first()
            if not get_purchase:
                return jsonify({"error": "Purchase not found"}), 404
            
            # Get files to delete from request body
            data = request.get_json()
            files_to_delete = data.get('deletedfiles_name', [])
            
            if not files_to_delete:
                return jsonify({"error": "No files specified for deletion"}), 400
                
            log.info(f"Request to delete files: {files_to_delete} for purchase {id}")
            
            # Parse current filenames from file_path (comma-separated string)
            current_files = []
            if get_purchase.file_path:
                try:
                    current_files = [f.strip() for f in get_purchase.file_path.split(",")]
                except Exception as e:
                    log.error(f"Failed to parse filenames: {str(e)}")
                    current_files = []
            
            log.info(f"Current files in database: {current_files}")
            
            # Delete each file from Supabase storage
            deleted_count = 0
            failed_files = []
            
            for filename in files_to_delete:
                filename = filename.strip()
                
                # Files are stored directly under purchase_id
                file_path = f"{id}/{filename}"
                
                try:
                    # Attempt to delete the file
                    response = supabase.storage.from_(SUPABASE_BUCKET).remove([file_path])
                    log.info(f"Successfully deleted file from Supabase: {file_path}")
                    deleted_count += 1
                except Exception as e:
                    log.error(f"Failed to delete file {file_path}: {str(e)}")
                    failed_files.append(filename)
            
            # Update database with remaining files
            remaining_files = [f for f in current_files if f not in files_to_delete]
            if remaining_files:
                get_purchase.file_path = ",".join(remaining_files)
            else:
                get_purchase.file_path = None
                
            db.session.commit()
            
            log.info(f"Deletion complete. Deleted: {deleted_count}, Failed: {len(failed_files)}, Remaining in DB: {len(remaining_files)}")
            
            return jsonify({
                "success": True,
                "message": f"File deletion process completed",
                "deleted_count": deleted_count,
                "failed_files": failed_files,
                "remaining_files": len(remaining_files),
                "updated_file_path": get_purchase.file_path
            }), 200
        else:
            return jsonify({"error": "Invalid key"}), 400
    except Exception as e:
        db.session.rollback()
        log.error(f"Error in delete_file_file: {str(e)}")
        return jsonify({"error": str(e)}), 500