from flask import request, jsonify
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from models.payment_transaction import PaymentTransaction
from models.purchase_status import PurchaseStatus
from models.purchase import Purchase
from config.db import db
from config.logging import get_logger
from werkzeug.utils import secure_filename
from supabase import create_client, Client
log = get_logger()

# Configuration constants
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
SUPABASE_BUCKET = "file_upload"
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'gif', 'bmp', 'txt', 'xlsx', 'xls'}
MAX_WORKERS = 12  # Increased for better parallelism
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max file size

# Role to folder mapping - defined once
ROLE_FOLDER_MAP = {
    "siteSupervisor": "sitesupervisor",
    "mepSupervisor": "mepsupervisor",
    "procurement": "procurement",
    "projectManager": "projectmanager",
    "estimation": "estimation",
    "technicalDirector": "technicaldirector",
    "accounts": "accounts"
}

# Validate Supabase configuration
if not supabase_url or not supabase_key:
    log.error("Supabase URL or Key not configured in environment variables")
    raise ValueError("Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_KEY environment variables")

# Initialize single reusable client
try:
    supabase: Client = create_client(supabase_url, supabase_key)
    log.info(f"Supabase client initialized successfully with URL: {supabase_url[:30]}...")
    log.info(f"Using bucket: {SUPABASE_BUCKET}")
except Exception as e:
    log.error(f"Failed to initialize Supabase client: {str(e)}")
    log.error(f"SUPABASE_URL: {supabase_url[:30] if supabase_url else 'NOT SET'}")
    log.error(f"SUPABASE_KEY: {'SET' if supabase_key else 'NOT SET'}")
    raise

# Pre-build base URL for public files
PUBLIC_URL_BASE = f"{supabase_url}/storage/v1/object/public/{SUPABASE_BUCKET}/"


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Create a global executor for better resource management
global_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

def upload_single_file(path, content, content_type):
    """Optimized single file upload"""
    try:
        # Direct upload with upsert
        response = supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=path,
            file=content,
            file_options={
                "content-type": content_type,
                "upsert": "true"
            }
        )
        # Return URL immediately
        return f"{PUBLIC_URL_BASE}{path}"
    except Exception as e:
        error_msg = str(e)
        # Check if it's a file exists error
        if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
            # Try to update existing file
            try:
                response = supabase.storage.from_(SUPABASE_BUCKET).update(
                    path=path,
                    file=content,
                    file_options={"content-type": content_type}
                )
                return f"{PUBLIC_URL_BASE}{path}"
            except Exception as update_error:
                # Log the actual error for debugging
                log.error(f"Upload failed for {path}: {error_msg}, Update failed: {str(update_error)}")
                # Provide more specific error message
                if "storage" in str(update_error).lower():
                    raise Exception(f"Storage error: Check Supabase bucket permissions and configuration")
                elif "size" in str(update_error).lower():
                    raise Exception(f"File size error: File may be too large")
                else:
                    raise Exception(f"Upload failed: {str(update_error)[:100]}")
        else:
            # Log detailed error
            log.error(f"Initial upload failed for {path}: {error_msg}")
            # Provide more specific error messages
            if "unauthorized" in error_msg.lower() or "permission" in error_msg.lower():
                raise Exception(f"Permission denied: Check Supabase API key and bucket permissions")
            elif "not found" in error_msg.lower():
                raise Exception(f"Bucket not found: Verify '{SUPABASE_BUCKET}' bucket exists")
            elif "network" in error_msg.lower() or "connection" in error_msg.lower():
                raise Exception(f"Network error: Check internet connection and Supabase URL")
            else:
                # Return a more descriptive error
                raise Exception(f"Upload error: {error_msg[:100]}")

def process_file_batch(files, purchase_id, storage_path_prefix=""):
    """Ultra-fast parallel batch processing"""
    if not files:
        return [], []

    uploaded_files = []
    errors = []
    futures = []

    # Use global executor for all uploads
    for index, file in enumerate(files):
        if not file or file.filename == '':
            continue

        try:
            # Quick filename processing
            filename = secure_filename(file.filename)

            # Validate file extension
            if not allowed_file(filename):
                errors.append(f"{file.filename}: Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
                continue

            name_part, ext_part = os.path.splitext(filename)
            unique_filename = f"{name_part}_{index}{ext_part}"

            # Build path
            supabase_path = f"{storage_path_prefix}/{purchase_id}/{unique_filename}" if storage_path_prefix else f"{purchase_id}/{unique_filename}"

            # Read file
            file_content = file.read()
            file_size = len(file_content)

            # Validate file size
            if file_size > MAX_FILE_SIZE:
                errors.append(f"{file.filename}: File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.1f}MB")
                continue

            if file_size == 0:
                errors.append(f"{file.filename}: File is empty")
                continue

            content_type = file.content_type or "application/octet-stream"

            # Submit upload task immediately
            future = global_executor.submit(
                upload_single_file,
                supabase_path,
                file_content,
                content_type
            )

            futures.append((future, {
                "filename": unique_filename,
                "original": filename,
                "path": supabase_path,
                "size": len(file_content),
                "type": content_type
            }))
        except Exception as e:
            errors.append(f"Prep error for {file.filename}: {str(e)}")

    # Collect results as they complete
    for future, file_info in futures:
        try:
            public_url = future.result(timeout=5)  # Increased timeout to 5 seconds
            uploaded_files.append({
                "fn": file_info["filename"],
                "orig": file_info["original"],
                "path": file_info["path"],
                "size": file_info["size"],
                "type": file_info["type"],
                "url": public_url
            })
        except Exception as e:
            # Extract meaningful error message
            error_str = str(e)
            if "error:" in error_str.lower():
                # Extract the actual error message after "error:"
                error_msg = error_str.split(":", 1)[-1].strip() if ":" in error_str else error_str
            else:
                error_msg = error_str if error_str else "Upload failed - check logs for details"

            errors.append(f"{file_info['original']}: {error_msg}")
            log.error(f"Failed to upload {file_info['original']}: {error_msg}, Full error: {error_str}")

    return uploaded_files, errors

def upload_files(key, id):
    """Ultra-optimized file upload function"""
    start_time = time.time()

    files = request.files.getlist("file") if "file" in request.files else []

    if not files:
        return jsonify({"error": "No files provided"}), 400
    if key not in ROLE_FOLDER_MAP:
        return jsonify({"error": "Invalid role key"}), 400
    try:
        # Determine the entity and storage path based on role
        if key == "accounts":
            entity = PaymentTransaction.query.filter_by(purchase_id=id).first()
            if not entity:
                return jsonify({"error": "Payment transaction not found"}), 404
            storage_prefix = "accounts"
            field_name = "supporting_documents"
        else:
            # For purchase entity
            entity = Purchase.query.filter_by(purchase_id=id).first()
            if not entity:
                return jsonify({"error": "Purchase not found"}), 404
            storage_prefix = ""  # Purchase files go directly under purchase_id
            field_name = "file_path"

        # Process uploads concurrently
        uploaded_files, errors = process_file_batch(files, id, storage_prefix)

        # Check if any files were successfully uploaded
        if not uploaded_files and errors:
            # All uploads failed
            upload_time = time.time() - start_time
            log.error(f"All file uploads failed for {key}/{id}: {errors}")
            return jsonify({
                "error": "All file uploads failed",
                "message": "No files were uploaded successfully",
                "uploaded_files": [],
                "total_files": 0,
                "upload_time": f"{upload_time:.2f}s",
                "errors": errors,
                "details": "Check file size, format, and storage permissions"
            }), 400  # Return 400 Bad Request when all uploads fail

        # Update entity with filenames only if we have successful uploads
        if uploaded_files:
            filenames = [f["fn"] for f in uploaded_files]

            # For Purchase entity, handle file_path updates properly
            if isinstance(entity, Purchase):
                # Get existing file paths if any
                existing_files = []
                if entity.file_path:
                    existing_files = [f.strip() for f in entity.file_path.split(",") if f.strip()]

                # Append new files to existing ones
                all_files = existing_files + filenames
                entity.file_path = ",".join(all_files)
                log.info(f"Updated Purchase {id} file_path: {entity.file_path}")
            else:
                # For PaymentTransaction entity
                setattr(entity, field_name, ",".join(filenames))

            # Explicitly add entity to session and commit only if we have files to save
            db.session.add(entity)
            db.session.commit()

        upload_time = time.time() - start_time

        # Determine status code based on results
        status_code = 200 if uploaded_files else 207  # 207 for partial success

        # Determine appropriate message
        if uploaded_files and not errors:
            message = "All files uploaded successfully"
        elif uploaded_files and errors:
            message = f"Partial success: {len(uploaded_files)} files uploaded, {len(errors)} failed"
        else:
            message = "Upload completed with errors"

        return jsonify({
            "message": message,
            "success": len(uploaded_files) > 0,
            "uploaded_files": uploaded_files,
            "failed_count": len(errors),
            "total_files": len(uploaded_files),
            "upload_time": f"{upload_time:.2f}s",
            "errors": errors if errors else None,
            "file_path_updated": entity.file_path if isinstance(entity, Purchase) and uploaded_files else None
        }), status_code

    except Exception as e:
        db.session.rollback()
        log.error(f"Upload failed for {key}/{id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_uploaded_file(key, id):
    """Optimized file retrieval with caching and parallel processing"""
    start_time = time.time()

    try:
        def generate_public_url(file_path):
            """Generate public URL directly without API call"""
            return f"{PUBLIC_URL_BASE}{file_path}"

        def list_folder_optimized(prefix_folder: str, purchase_id: str):
            """Optimized folder listing with batch URL generation"""
            try:
                path = f"{prefix_folder}/{purchase_id}" if prefix_folder else purchase_id
                entries = supabase.storage.from_(SUPABASE_BUCKET).list(path=path)

                if not isinstance(entries, list):
                    return []

                # Process all entries with direct URL generation (no API calls)
                results = []
                for entry in entries:
                    if isinstance(entry, dict) and entry.get('name'):
                        file_path = f"{path}/{entry['name']}"
                        results.append({
                            "filename": entry['name'],
                            "file_path": file_path,
                            "public_url": generate_public_url(file_path),
                            "storage_bucket": SUPABASE_BUCKET,
                            "folder": prefix_folder or "root"
                        })
                return results

            except Exception as e:
                log.warning(f"List storage failed for {prefix_folder}/{purchase_id}: {str(e)}")
                return []

        # Validate key
        if key not in ROLE_FOLDER_MAP:
            return jsonify({"error": "Invalid key"}), 400
        # Quick response for accounts role
        if key == "accounts":
            accounts_files = list_folder_optimized(ROLE_FOLDER_MAP["accounts"], id)
            elapsed = time.time() - start_time
            return jsonify({
                "success": True,
                "accounts_files": accounts_files,
                "purchase_files": [],
                "totals": {
                    "accounts_files": len(accounts_files),
                    "purchase_files": 0
                },
                "response_time": f"{elapsed:.3f}s"
            }), 200

        # PM/procurement/TD: parallel loading for elevated roles
        elevated_view = {"procurement", "projectManager", "technicalDirector"}
        if key in elevated_view:
            # Prepare all folders to fetch in parallel
            folders_to_fetch = []
            # Add accounts folder
            folders_to_fetch.append((ROLE_FOLDER_MAP["accounts"], id))

            # Add all non-accounts folders
            for k, v in ROLE_FOLDER_MAP.items():
                if k != "accounts":
                    folders_to_fetch.append((v, id))

            # Add legacy folder (empty prefix means root)
            folders_to_fetch.append(("", id))

            # Fetch all folders in parallel
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = {}

                # Submit accounts folder separately for tracking
                accounts_future = executor.submit(list_folder_optimized, ROLE_FOLDER_MAP["accounts"], id)

                # Submit all other folders
                for folder, purchase_id in folders_to_fetch:
                    if folder != ROLE_FOLDER_MAP["accounts"]:
                        futures[executor.submit(list_folder_optimized, folder, purchase_id)] = folder

                # Get accounts files
                accounts_files = accounts_future.result(timeout=2)

                # Collect all other files
                all_purchase_files = []
                for future in as_completed(futures):
                    try:
                        files = future.result(timeout=2)
                        all_purchase_files.extend(files)
                    except Exception as e:
                        log.warning(f"Failed to fetch folder: {str(e)}")

            # Deduplicate by file_path
            unique_purchase = {f["file_path"]: f for f in all_purchase_files}
            purchase_files = list(unique_purchase.values())
            elapsed = time.time() - start_time
            return jsonify({
                "success": True,
                "accounts_files": accounts_files,
                "purchase_files": purchase_files,
                "totals": {
                    "accounts_files": len(accounts_files),
                    "purchase_files": len(purchase_files)
                },
                "response_time": f"{elapsed:.3f}s"
            }), 200

        # Other roles: parallel fetch accounts + role folder + legacy
        folders_to_fetch = [
            (ROLE_FOLDER_MAP["accounts"], id),  # accounts folder
            (ROLE_FOLDER_MAP[key], id),         # role-specific folder
            ("", id)                             # legacy/root folder
        ]

        # Fetch all folders in parallel
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(list_folder_optimized, folder, purchase_id): idx
                for idx, (folder, purchase_id) in enumerate(folders_to_fetch)
            }

            results = [None, None, None]
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    results[idx] = future.result(timeout=2)
                except Exception as e:
                    log.warning(f"Failed to fetch folder at index {idx}: {str(e)}")
                    results[idx] = []

        accounts_files = results[0] or []
        role_files = results[1] or []
        legacy_files = results[2] or []

        # Combine role and legacy files, then deduplicate
        combined_files = role_files + legacy_files
        unique_files = {f["file_path"]: f for f in combined_files}
        purchase_files = list(unique_files.values())
        elapsed = time.time() - start_time
        return jsonify({
            "success": True,
            "accounts_files": accounts_files,
            "purchase_files": purchase_files,
            "totals": {
                "accounts_files": len(accounts_files),
                "purchase_files": len(purchase_files)
            },
            "response_time": f"{elapsed:.3f}s"
        }), 200
    except Exception as e:
        log.error(f"get_uploaded_file failed for key={key}, id={id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

def all_delete_file(key, id):
    """Optimized batch file deletion"""
    try:
        # Validate key
        if key not in ROLE_FOLDER_MAP or key == "accounts":
            return jsonify({"error": "Invalid key"}), 400

        get_purchase = Purchase.query.filter_by(purchase_id=id).first()
        if not get_purchase:
            return jsonify({"error": "Purchase not found"}), 404

        # Get current files and delete from Supabase storage
        if get_purchase.file_path:
            filenames = [f.strip() for f in get_purchase.file_path.split(",") if f.strip()]

            # Batch delete files concurrently
            files_to_delete = [f"{id}/{filename}" for filename in filenames]

            # Delete files in batch using single client
            for file_path in files_to_delete:
                try:
                    supabase.storage.from_(SUPABASE_BUCKET).remove([file_path])
                except Exception as e:
                    log.warning(f"Failed to delete: {file_path} - {str(e)}")

        # Clear all uploaded files from database
        get_purchase.file_path = None
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "All files deleted successfully from Supabase storage and database"
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error in all_delete_file: {str(e)}")
        return jsonify({"error": str(e)}), 500

def delete_file_file(key, id):
    """Optimized selective file deletion"""
    try:
        if key not in ROLE_FOLDER_MAP or key == "accounts":
            return jsonify({"error": "Invalid key"}), 400

        get_purchase = Purchase.query.filter_by(purchase_id=id).first()
        if not get_purchase:
            return jsonify({"error": "Purchase not found"}), 404
        # Get files to delete from request body
        data = request.get_json()
        files_to_delete = data.get('deletedfiles_name', [])

        if not files_to_delete:
            return jsonify({"error": "No files specified for deletion"}), 400
        # Parse current filenames
        current_files = [f.strip() for f in (get_purchase.file_path or "").split(",") if f.strip()]
        # Use set for O(1) lookup
        files_to_delete_set = {f.strip() for f in files_to_delete}
        # Concurrent deletion
        deleted_count = 0
        failed_files = []
        # Fast batch deletion
        for filename in files_to_delete_set:
            file_path = f"{id}/{filename}"
            try:
                supabase.storage.from_(SUPABASE_BUCKET).remove([file_path])
                deleted_count += 1
            except Exception as e:
                log.error(f"Failed to delete {file_path}: {str(e)}")
                failed_files.append(filename)

        # Update database with remaining files
        remaining_files = [f for f in current_files if f not in files_to_delete_set]
        get_purchase.file_path = ",".join(remaining_files) if remaining_files else None
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "File deletion process completed",
            "deleted_count": deleted_count,
            "failed_files": failed_files,
            "remaining_files": len(remaining_files),
            "updated_file_path": get_purchase.file_path
        }), 200
    except Exception as e:
        db.session.rollback()
        log.error(f"Error in delete_file_file: {str(e)}")
        return jsonify({"error": str(e)}), 500