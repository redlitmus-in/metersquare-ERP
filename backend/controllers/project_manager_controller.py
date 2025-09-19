from flask import g, request, jsonify
from datetime import datetime
import threading

from sqlalchemy import and_
from models.purchase_status import PurchaseStatus
from models.material import Material
from utils.email_service import EmailService
from config.logging import get_logger

from config.db import db
from models.role import Role
from models.purchase import Purchase
from models.purchase_history import PurchaseHistory

log = get_logger()

def pm_approval_workflow():
    """Optimized Project Manager approval workflow with fast email"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']

        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Project Manager
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'projectManager':
            return jsonify({'error': 'Only Project Manager can approved/rejected purchase requests'}), 403

        # Parse request data
        data = request.get_json()
        purchase_id = data.get('purchase_id')
        purchase_status = data.get('purchase_status', '').lower()
        rejection_reason = data.get('rejection_reason', '')
        comments = data.get('comments', '')
        reject_category = data.get('reject_category', 'pm_flag')  # Default reject category

        # Validate purchase_status
        if purchase_status not in ['approved', 'rejected']:
            return jsonify({'error': 'purchase_status must be either "approved" or "rejected"'}), 400

        # If rejecting, require rejection reason
        if purchase_status == 'rejected' and (not rejection_reason or rejection_reason.strip() == ''):
            return jsonify({'error': 'rejection_reason is required when purchase_status is "rejected"'}), 400

        # Get purchase request with optimized query
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # Check if PM already made a decision
        existing_pm_status = PurchaseStatus.query.filter_by(
            purchase_id=purchase_id,
            role='projectManager'
        ).order_by(PurchaseStatus.created_at.desc()).first()

        latest_procurement_status = None
        purchase_modified_after_pm = False
        is_resubmission = False

        if existing_pm_status and existing_pm_status.status in ['approved', 'rejected']:
            # Check for resubmission
            latest_procurement_status = PurchaseStatus.query.filter_by(
                purchase_id=purchase_id,
                role='procurement'
            ).order_by(PurchaseStatus.created_at.desc()).first()

            purchase_modified_after_pm = purchase.last_modified_at and existing_pm_status.created_at and \
                                       purchase.last_modified_at > existing_pm_status.created_at

            if latest_procurement_status and latest_procurement_status.created_at > existing_pm_status.created_at:
                is_resubmission = True
                log.info(f"Allowing PM to make new decision for purchase #{purchase_id} - resubmission detected")
            elif purchase_modified_after_pm:
                is_resubmission = True
                log.info(f"Allowing PM to make new decision for purchase #{purchase_id} - purchase modified after PM decision")
            else:
                log.warning(f"Blocking PM decision for purchase #{purchase_id} - no resubmission detected")
                return jsonify({'error': f'Project Manager has already {existing_pm_status.status} this purchase request'}), 400

        # Get materials for email
        materials = _get_purchase_materials(purchase)
        
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

        pm_info = {
            'full_name': user_name,
            'user_id': user_id,
            'email': current_user.get('email', ''),
            'role': role.role
        }

        # Update single-row status in database (no insert)
        try:
            # Determine receiver role based on decision
            if purchase_status == 'approved':
                receiver_role = 'estimation'
            else:  # rejected
                receiver_role = 'procurement'
            
            existing_status = PurchaseStatus.get_latest_status(purchase_id)
            if existing_status:
                existing_status.sender = 'projectManager'
                existing_status.receiver = receiver_role
                existing_status.role = 'projectManager'
                existing_status.status = 'approved' if purchase_status == 'approved' else 'rejected'
                existing_status.decision_by_user_id = user_id
                existing_status.rejection_reason = rejection_reason if purchase_status == 'rejected' else None
                # No explicit reject_category provided from request; keep as-is/None
                existing_status.comments = comments
                existing_status.decision_date = datetime.utcnow()
                existing_status.is_active = True
                existing_status.last_modified_by = user_name
                db.session.add(existing_status)
                updated_status = existing_status
            else:
                updated_status = PurchaseStatus(
                purchase_id=purchase_id,
                    sender='projectManager',
                    receiver=receiver_role,
                    role='projectManager',
                status='approved' if purchase_status == 'approved' else 'rejected',
                decision_by_user_id=user_id,
                rejection_reason=rejection_reason if purchase_status == 'rejected' else None,
                comments=comments,
                    created_by=user_name,
                    is_active=True
            )
                db.session.add(updated_status)
            
            # Update purchase last_modified fields
            purchase.last_modified_at = datetime.utcnow()
            purchase.last_modified_by = user_name
            db.session.add(purchase)
            db.session.commit()
            log.info(f"Purchase request #{purchase_id} {updated_status.status} by Project Manager {user_name}")
        except Exception as e:
            db.session.rollback()
            log.error(f"Error updating purchase status in database: {str(e)}")
            return jsonify({'error': 'Failed to update purchase status in database'}), 500

        # Prepare message
        if purchase_status == 'approved':
            if is_resubmission:
                message = f'Purchase request #{purchase_id} approved by Project Manager (resubmission) and sent to Estimation team'
            else:
                message = f'Purchase request #{purchase_id} approved by Project Manager and sent to Estimation team'
        else:
            if is_resubmission:
                message = f'Purchase request #{purchase_id} rejected by Project Manager (resubmission) and sent back to Procurement team'
            else:
                message = f'Purchase request #{purchase_id} rejected by Project Manager and sent back to Procurement team'

        # Send email asynchronously in background thread with app context
        def send_email_async(app_context):
            try:
                with app_context:
                    email_service = EmailService()
                    if purchase_status == 'approved':
                        # PM approves - send to Estimation team
                        success = email_service.send_pm_to_estimation_notification(
                            purchase_data, materials, requester_info, pm_info
                        )
                        if success:
                            log.info(f"Email sent successfully for approved purchase #{purchase_id}")
                        else:
                            log.warning(f"Failed to send email for approved purchase #{purchase_id}")
                    else:
                        # PM rejects - send back to Procurement team
                        success = email_service.send_pm_rejection_to_procurement(
                            purchase_data, materials, requester_info, pm_info, rejection_reason
                        )
                        if success:
                            log.info(f"Email sent successfully for rejected purchase #{purchase_id}")
                        else:
                            log.warning(f"Failed to send email for rejected purchase #{purchase_id}")
            except Exception as e:
                log.error(f"Error sending email for purchase #{purchase_id}: {str(e)}")

        # Start email thread with app context
        from flask import current_app
        app_context = current_app.app_context()
        email_thread = threading.Thread(target=send_email_async, args=(app_context,))
        email_thread.daemon = True  # Daemon thread will not block app shutdown
        email_thread.start()

        # Append purchase history single-row action (no separate email action)
        try:
            def _append_purchase_history_action_local(purchase_id_local: int, action_payload: dict, actor_name: str):
                existing = PurchaseHistory.query.filter_by(purchase_id=purchase_id_local, is_active=True).order_by(PurchaseHistory.created_at.asc()).first()
                if not existing:
                    hist = PurchaseHistory(
                        purchase_id=purchase_id_local,
                        is_active=True,
                        action=[action_payload],
                        created_by=actor_name
                    )
                    db.session.add(hist)
                else:
                    actions = existing.action
                    if actions is None:
                        actions = []
                    elif isinstance(actions, dict):
                        actions = [actions]
                    elif isinstance(actions, str):
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

            hist_comments = 'Purchase request approved by Project Manager and sent to Estimation team' if purchase_status == 'approved' else 'Purchase request rejected by Project Manager and sent back to Procurement team'
            hist_receiver = 'estimation' if purchase_status == 'approved' else 'procurement'
            _append_purchase_history_action_local(
                purchase_id,
                {
                    'type': 'status_change',
                    'status': 'approved' if purchase_status == 'approved' else 'rejected',
                    'sender': 'projectManager',
                    'receiver': hist_receiver,
                    'comments': hist_comments,
                    'rejection_reason': rejection_reason if purchase_status == 'rejected' else None,
                    'reject_category': None,
                    'decided_by_user_id': user_id,
                    'decided_by': user_name,
                    'role': 'projectManager',
                    'timestamp': datetime.utcnow().isoformat()
                },
                user_name
            )
        except Exception as he:
            log.error(f"Failed to append purchase history (PM flow): {str(he)}")

        # Return response immediately (email is being sent in background)
        response_data = {
            'success': True,
            'message': message,
            'purchase_id': purchase_id,
            'pm_status': updated_status.status,
            'decision_date': updated_status.decision_date.isoformat() if updated_status.decision_date else None,
            'decision_by': updated_status.created_by,
            'comments': updated_status.comments,
            'email_status': 'Email notification is being sent in background'
        }

        if purchase_status == 'rejected':
            response_data['rejection_reason'] = updated_status.rejection_reason

        return jsonify(response_data), 200

    except Exception as e:
        log.error(f"Error in pm_approval_workflow: {str(e)}")
        return jsonify({'error': str(e)}), 500

def _get_purchase_materials(purchase):
    """Get materials for a purchase and convert them to serializable dictionaries"""
    if not purchase or not purchase.material_ids:
        return []
        
    materials = Material.query.filter(
        and_(
            Material.is_deleted == False,
            Material.material_id.in_(purchase.material_ids)
        )
    ).all()
    
    # Convert Material objects to dictionaries
    return [{
        'material_id': mat.material_id,
        'description': mat.description,
        'specification': mat.specification,
        'unit': mat.unit,
        'quantity': mat.quantity,
        'category': mat.category,
        'cost': float(mat.cost) if mat.cost is not None else None,
        'priority': mat.priority,
        'design_reference': mat.design_reference,
        'created_at': mat.created_at.isoformat() if hasattr(mat, 'created_at') and mat.created_at else None,
        'updated_at': mat.updated_at.isoformat() if hasattr(mat, 'updated_at') and mat.updated_at else None
    } for mat in materials]

def get_procurement_approved_purchases():
    """Ultra-fast optimized purchase retrieval with parallel processing"""
    try:
        if not g.user:
            return jsonify({'error': 'Not logged in'}), 401

        from collections import defaultdict
        from sqlalchemy.orm import load_only, joinedload
        from sqlalchemy import select, text

        purchase_id_filter = request.args.get('purchase_id', type=int)

        # Ultra-optimized single query with index hints
        if purchase_id_filter:
            # Single purchase - direct fetch with JOIN
            query = db.session.execute(
                select(PurchaseStatus.purchase_id, PurchaseStatus.role,
                      PurchaseStatus.status, PurchaseStatus.created_at,
                      PurchaseStatus.sender, PurchaseStatus.receiver)
                .where(PurchaseStatus.role != 'siteSupervisor')
                .where(PurchaseStatus.purchase_id == purchase_id_filter)
                .order_by(PurchaseStatus.created_at.desc())
            )
            statuses = query.fetchall()
            rejection_statuses = []
            rejected_purchase_ids_list = []
            rejection_status_map = {}
        else:
            # Parallel fetch using raw SQL for maximum speed
            query = db.session.execute(
                text("""
                    SELECT purchase_id, role, status, created_at, sender, receiver, reject_category
                    FROM purchase_status
                    WHERE role != 'siteSupervisor'
                    ORDER BY created_at DESC
                """)
            )
            statuses = query.fetchall()

            # In-memory filtering (faster than subquery) - Only PM flag rejections
            rejection_statuses = [s for s in statuses if s[4] == 'estimation'
                                 and s[5] == 'projectManager' and s[2] == 'rejected'
                                 and s[6] == 'pm_flag']

            # Store rejected purchase IDs for later processing
            rejected_purchase_ids_list = []
            rejection_status_map = {}
            if rejection_statuses:
                for r in rejection_statuses:
                    rejected_purchase_ids_list.append(r[0])
                    rejection_status_map[r[0]] = r  # Store the rejection status for later use

        rejected_purchase_ids = set(rejected_purchase_ids_list) if rejected_purchase_ids_list else set()

        # Ultra-fast grouping
        purchases_status = defaultdict(list)
        get_pm_status = {}

        for s in statuses:
            pid = s[0] if isinstance(s, tuple) else s.purchase_id
            role = s[1] if isinstance(s, tuple) else s.role

            purchases_status[pid].append(s)
            if role == 'projectManager':
                get_pm_status[pid] = s
        
        # Quick filter
        purchase_ids = [pid for pid in purchases_status.keys() if pid not in rejected_purchase_ids]

        if not purchase_ids:
            return jsonify({
                'total_approved_procurement_purchases': 0,
                'overall_total_cost': 0,
                'overall_total_quantity': 0,
                'approved_procurement_purchases': [],
                'estimation_pm_rejections': [],
                'success': True,
            }), 200

        # Ultra-fast batch load using raw SQL with JOIN
        purchase_material_query = db.session.execute(
            text("""
                SELECT
                    p.purchase_id, p.date, p.site_location, p.purpose,
                    p.material_ids, p.created_at, p.last_modified_at
                FROM purchase p
                WHERE p.purchase_id IN :purchase_ids
                AND p.is_deleted = false
            """),
            {"purchase_ids": tuple(purchase_ids)}
        )

        purchases = purchase_material_query.fetchall()

        # Process purchases and collect material IDs
        purchase_dict = {}
        all_material_ids = set()

        for p in purchases:
            purchase_dict[p[0]] = {
                'purchase_id': p[0],
                'date': p[1],
                'site_location': p[2],
                'purpose': p[3],
                'material_ids': p[4],
                'created_at': p[5],
                'last_modified_at': p[6]
            }
            if p[4]:  # material_ids
                all_material_ids.update(p[4])

        # Batch load materials using raw SQL for speed
        all_materials = {}
        if all_material_ids:
            mat_query = db.session.execute(
                text("""
                    SELECT material_id, description, specification, unit, quantity,
                           category, cost, priority, design_reference
                    FROM materials
                    WHERE material_id IN :material_ids
                    AND is_deleted = false
                """),
                {"material_ids": tuple(all_material_ids)}
            )

            for m in mat_query.fetchall():
                all_materials[m[0]] = {
                    'material_id': m[0],
                    'description': m[1],
                    'specification': m[2],
                    'unit': m[3],
                    'quantity': m[4],
                    'category': m[5],
                    'cost': m[6],
                    'priority': m[7],
                    'design_reference': m[8]
                }

        # Lightning-fast response building
        result = []
        overall_total_cost = 0.0
        overall_total_quantity = 0

        for purchase_id in purchase_ids:
            purchase = purchase_dict.get(purchase_id)
            if not purchase:
                continue

            status_list = purchases_status[purchase_id]
            latest_status = status_list[0]

            # Ultra-fast material processing
            materials = []
            total_cost = 0.0
            total_quantity = 0

            if purchase['material_ids'] and all_materials:
                for mid in purchase['material_ids']:
                    mat = all_materials.get(mid)
                    if mat:
                        cost = float(mat['cost'] or 0)
                        total = cost * mat['quantity']
                        total_cost += total
                        total_quantity += mat['quantity']

                        materials.append({
                            'material_id': mid,
                            'description': mat['description'],
                            'specification': mat['specification'],
                            'unit': mat['unit'],
                            'quantity': mat['quantity'],
                            'category': mat['category'],
                            'unit_cost': cost,
                            'total_cost': total,
                            'priority': mat['priority'],
                            'design_reference': mat['design_reference']
                        })

            overall_total_cost += total_cost
            overall_total_quantity += total_quantity

            # Get status values
            pm_status = get_pm_status.get(purchase_id)
            actual_status = latest_status[2] if isinstance(latest_status, tuple) else latest_status.status
            sender = latest_status[4] if isinstance(latest_status, tuple) and len(latest_status) > 4 else (latest_status.sender if hasattr(latest_status, 'sender') else None)
            receiver = latest_status[5] if isinstance(latest_status, tuple) and len(latest_status) > 5 else (latest_status.receiver if hasattr(latest_status, 'receiver') else None)

            # Determine display status based on business logic
            display_status = actual_status

            # Check if status is rejected
            if actual_status == 'rejected':
                # Check if this is a rejection sent back to project manager from estimation
                if receiver == 'projectManager' and sender == 'estimation':
                    display_status = 'approved'  # Changed to show approved even for PM receiver
                else:
                    # For any other rejection scenario, show as approved
                    display_status = 'approved'

            # If receiver is accounts, show as completed regardless of actual status
            if receiver == 'accounts':
                display_status = 'completed'

            # Set workflow status
            workflow_status = display_status

            # Special handling for pm_status
            if receiver == 'accounts':
                pm_value = 'completed'
            elif sender == 'projectManager' and actual_status == 'rejected':
                # PM sent a rejection - show the original rejected status
                pm_value = 'rejected'
            elif actual_status == 'rejected' and receiver == 'projectManager' and sender == 'estimation':
                # Rejection from estimation to PM - show as approved
                pm_value = 'approved'
            elif actual_status == 'rejected':
                # Other rejections - show as approved
                pm_value = 'approved'
            elif receiver in ['technicalDirector', 'estimation'] and sender == 'estimation' and actual_status == 'approved':
                # If estimation has sent approved to TD, it means PM already approved
                pm_value = 'approved'
            elif receiver == 'technicalDirector' and sender == 'technicalDirector' and actual_status == 'approved':
                # If TD has approved and sent to accounts, PM must have approved
                pm_value = 'approved'
            elif pm_status:
                # PM has made a decision, use their actual status
                pm_actual = pm_status[2] if isinstance(pm_status, tuple) else pm_status.status
                pm_value = pm_actual
            else:
                # PM hasn't acted yet
                pm_value = 'pending'

            # Format dates efficiently
            date_val = purchase['date'].isoformat() if hasattr(purchase['date'], 'isoformat') else purchase['date']
            created = purchase['created_at'].isoformat() if purchase['created_at'] and hasattr(purchase['created_at'], 'isoformat') else purchase['created_at']
            modified = purchase['last_modified_at'].isoformat() if purchase['last_modified_at'] and hasattr(purchase['last_modified_at'], 'isoformat') else purchase['last_modified_at']

            result.append({
                'purchase_id': purchase_id,
                'date': date_val,
                'site_location': purchase['site_location'],
                'purpose': purchase['purpose'],
                'current_workflow_status': workflow_status,
                'actual_status': actual_status,  # Add actual status for reference
                'pm_status': pm_value,
                'sender': sender,
                'receiver': receiver,
                'materials': materials,
                'material_count': len(materials),
                'total_quantity': total_quantity,
                'total_cost': round(total_cost, 2),
                'created_at': created,
                'last_modified_at': modified
            })
        
        # Sort by last_modified_at desc
        result.sort(
            key=lambda x: x.get('last_modified_at') or x.get('created_at') or '',
            reverse=True
        )

        # Ultra-fast processing for rejected purchases
        estimation_pm_rejections = []
        if rejected_purchase_ids_list and not purchase_id_filter:
            # Single combined query for rejected purchases and their statuses
            rejected_data_query = db.session.execute(
                text("""
                    SELECT
                        p.purchase_id, p.date, p.site_location, p.purpose,
                        p.material_ids, p.created_at,
                        ps.status_id, ps.status, ps.sender, ps.receiver, ps.decision_date,
                        ps.created_at as status_created, ps.created_by, ps.comments,
                        ps.rejection_reason, ps.reject_category
                    FROM purchase p
                    LEFT JOIN LATERAL (
                        SELECT * FROM purchase_status
                        WHERE purchase_id = p.purchase_id
                        AND sender = 'estimation'
                        AND receiver = 'projectManager'
                        AND status = 'rejected'
                        AND reject_category = 'pm_flag'
                        ORDER BY created_at DESC
                        LIMIT 1
                    ) ps ON true
                    WHERE p.purchase_id IN :purchase_ids
                    AND p.is_deleted = false
                """),
                {"purchase_ids": tuple(rejected_purchase_ids_list)}
            )

            rejected_data = rejected_data_query.fetchall()

            # Collect material IDs from rejected purchases
            rej_material_ids = set()
            for row in rejected_data:
                if row[4]:  # material_ids
                    rej_material_ids.update(row[4])

            # Batch load missing materials in one query
            missing_material_ids = rej_material_ids - set(all_materials.keys())
            if missing_material_ids:
                missing_mat_query = db.session.execute(
                    text("""
                        SELECT material_id, description, specification, unit, quantity,
                               category, cost, priority, design_reference
                        FROM materials
                        WHERE material_id IN :material_ids
                        AND is_deleted = false
                    """),
                    {"material_ids": tuple(missing_material_ids)}
                )

                for m in missing_mat_query.fetchall():
                    all_materials[m[0]] = {
                        'material_id': m[0],
                        'description': m[1],
                        'specification': m[2],
                        'unit': m[3],
                        'quantity': m[4],
                        'category': m[5],
                        'cost': m[6],
                        'priority': m[7],
                        'design_reference': m[8]
                    }

            # Process rejected purchases in single pass
            for row in rejected_data:
                # Process materials
                materials = []
                total_cost = 0.0
                total_quantity = 0

                if row[4]:  # material_ids
                    for mid in row[4]:
                        mat = all_materials.get(mid)
                        if mat:
                            cost = float(mat['cost'] or 0)
                            total = cost * mat['quantity']
                            total_cost += total
                            total_quantity += mat['quantity']

                            materials.append({
                                'material_id': mid,
                                'description': mat['description'],
                                'specification': mat['specification'],
                                'unit': mat['unit'],
                                'quantity': mat['quantity'],
                                'category': mat['category'],
                                'unit_cost': cost,
                                'total_cost': total,
                                'priority': mat['priority'],
                                'design_reference': mat['design_reference']
                            })

                # Format dates efficiently
                date_val = row[1].isoformat() if row[1] and hasattr(row[1], 'isoformat') else row[1]
                created = row[5].isoformat() if row[5] and hasattr(row[5], 'isoformat') else row[5]

                rejection_data = {
                    'purchase_id': row[0],
                    'date': date_val,
                    'site_location': row[2],
                    'purpose': row[3],
                    'created_at': created,
                    'materials': materials,
                    'material_count': len(materials),
                    'total_quantity': total_quantity,
                    'total_cost': round(total_cost, 2)
                }

                # Add rejection status if available (from JOIN)
                if row[6]:  # status_id exists
                    rejection_data['rejected_status'] = {
                        'status_id': row[6],
                        'status': row[7],
                        'sender': row[8],
                        'receiver': row[9],
                        'decision_date': row[10].isoformat() if row[10] and hasattr(row[10], 'isoformat') else row[10],
                        'created_at': row[11].isoformat() if row[11] and hasattr(row[11], 'isoformat') else row[11],
                        'created_by': row[12],
                        'comments': row[13],
                        'rejection_reason': row[14],
                        'reject_category': row[15],
                        'pm_status': 'pending'
                    }

                estimation_pm_rejections.append(rejection_data)

        # Handle single purchase response
        if purchase_id_filter:
            if not result:
                return jsonify({'error': 'Purchase not found or no status available'}), 404
            return jsonify({
                'success': True,
                **result[0]
            }), 200

        return jsonify({
            'total_approved_procurement_purchases': len(result),
            'overall_total_cost': round(overall_total_cost, 2),
            'overall_total_quantity': overall_total_quantity,
            'approved_procurement_purchases': result,
            'estimation_pm_rejections': estimation_pm_rejections,
            'success': True,
        }), 200

    except Exception as e:
        log.error(f"Error getting purchase statuses: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to fetch purchase statuses', 'details': str(e)}), 500

def get_purchase_status_details(purchase_id):
    """Get project manager and procurement status details for a specific purchase"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Get the specific purchase
        purchase = Purchase.query.filter(
            and_(
                Purchase.purchase_id == purchase_id,
                Purchase.is_deleted == False
            )
        ).first()
        
        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404
        
        # Get ALL project manager statuses (approved and rejected)
        pm_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.sender == 'projectManager'
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()
        
        # Get ALL procurement statuses (approved and rejected)
        procurement_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.sender == 'procurement'
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()
        
        # Get latest status from project manager or procurement only
        latest_status = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.purchase_id == purchase_id,
                PurchaseStatus.sender.in_(['projectManager', 'procurement'])
            )
        ).order_by(PurchaseStatus.created_at.desc()).first()
        
        # Get materials for this purchase
        materials = _get_purchase_materials(purchase)
        
        # Calculate material summary
        material_summary = {
            'total_materials': len(materials),
            'total_quantity': sum(m.quantity or 0 for m in materials),
            'total_cost': round(sum((m.cost or 0) * (m.quantity or 0) for m in materials), 2),
            'categories': list({m.category for m in materials if m.category}),
            'materials': [
                {
                    'material_id': m.material_id,
                    'description': m.description,
                    'quantity': m.quantity,
                    'unit': m.unit,
                    'cost': m.cost,
                    'category': m.category,
                    'priority': m.priority,
                    'design_reference': m.design_reference
                } for m in materials
            ]
        }
        
        # Get user details for decision makers
        from models.user import User
        
        # Process all project manager statuses
        pm_status_list = []
        for status in pm_statuses:
            pm_user = None
            if status.decision_by_user_id:
                pm_user = User.query.filter_by(user_id=status.decision_by_user_id).first()
            
            pm_status_list.append({
                'status': status.status,
                'sender': 'projectManager',
                'date': status.created_at.isoformat() if hasattr(status, 'created_at') and status.created_at else None,
                'decision_by': {
                    'user_id': status.decision_by_user_id,
                    'full_name': pm_user.full_name if pm_user else 'Unknown',
                    'email': pm_user.email if pm_user else None
                } if status.decision_by_user_id else None,
                'rejection_reason': status.rejection_reason,
                'comments': status.comments,
                'reject_category': status.reject_category
            })
        
        # Process all procurement statuses
        procurement_status_list = []
        for status in procurement_statuses:
            procurement_user = None
            if status.decision_by_user_id:
                procurement_user = User.query.filter_by(user_id=status.decision_by_user_id).first()
            
            procurement_status_list.append({
                'status': status.status,
                'sender': 'procurement',
                'date': status.created_at.isoformat() if hasattr(status, 'created_at') and status.created_at else None,
                'decision_by': {
                    'user_id': status.decision_by_user_id,
                    'full_name': procurement_user.full_name if procurement_user else 'Unknown',
                    'email': procurement_user.email if procurement_user else None
                } if status.decision_by_user_id else None,
                'rejection_reason': status.rejection_reason,
                'comments': status.comments,
                'reject_category': status.reject_category
            })
        
        # Get latest decision maker details
        latest_decision_maker = None
        if latest_status and latest_status.decision_by_user_id:
            latest_user = User.query.filter_by(user_id=latest_status.decision_by_user_id).first()
            latest_decision_maker = {
                'user_id': latest_status.decision_by_user_id,
                'full_name': latest_user.full_name if latest_user else 'Unknown',
                'email': latest_user.email if latest_user else None
            }
        
        # Get latest procurement and PM statuses
        latest_procurement_status = procurement_statuses[0] if procurement_statuses else None
        latest_pm_status = pm_statuses[0] if pm_statuses else None
        
        # Determine current workflow status
        if latest_status and latest_status.status == 'completed':
            current_workflow_status = 'completed'
            pm_status_value = 'completed'
        elif latest_procurement_status and latest_procurement_status.status == 'approved':
            if latest_pm_status:
                if latest_pm_status.status == 'approved':
                    current_workflow_status = 'pm_approved'
                elif latest_pm_status.status == 'rejected':
                    current_workflow_status = 'pm_rejected'
            else:
                current_workflow_status = 'pending_pm_review'
        else:
            current_workflow_status = 'pending_procurement'
            pm_status_value = 'pending'
        
        # Get all statuses for complete history
        all_statuses = PurchaseStatus.query.filter_by(
            purchase_id=purchase_id
        ).order_by(PurchaseStatus.created_at.asc()).all()
        
        # Build status history
        status_history = []
        for status in all_statuses:
            status_history.append({
                'status_id': status.status_id,
                'status': status.status,
                'sender': status.sender,
                'receiver': status.receiver,
                'date': status.created_at.isoformat() if hasattr(status, 'created_at') and status.created_at else None,
                'decision_by_user_id': status.decision_by_user_id,
                'decision_by': status.created_by,
                'comments': status.comments,
                'rejection_reason': status.rejection_reason,
                'reject_category': status.reject_category,
                'decision_date': status.decision_date.isoformat() if hasattr(status, 'decision_date') and status.decision_date else None
            })
        
        return jsonify({
            'success': True,
            'purchase_id': purchase_id,
            'site_location': purchase.site_location,
            'purpose': purchase.purpose,
            'date': purchase.date.isoformat() if hasattr(purchase.date, 'isoformat') else purchase.date,
            'email_sent': purchase.email_sent,
            'created_at': purchase.created_at.isoformat() if hasattr(purchase.created_at, 'isoformat') else purchase.created_at,
            'materials_summary': material_summary,
            'current_workflow_status': current_workflow_status,
            'procurement_status': latest_procurement_status.status if latest_procurement_status else 'pending',
            'procurement_status_date': latest_procurement_status.created_at.isoformat() if hasattr(latest_procurement_status, 'created_at') and latest_procurement_status.created_at else None,
            'procurement_comments': latest_procurement_status.comments if latest_procurement_status else None,
            'procurement_decision_by': latest_procurement_status.created_by if latest_procurement_status else None,
            'pm_status': pm_status_value,  # Use the determined pm_status_value
            'pm_status_date': latest_pm_status.created_at.isoformat() if hasattr(latest_pm_status, 'created_at') and latest_pm_status.created_at else None,
            'pm_comments': latest_pm_status.comments if latest_pm_status else None,
            'pm_rejection_reason': latest_pm_status.rejection_reason if latest_pm_status else None,
            'pm_decision_by': latest_pm_status.created_by if latest_pm_status else None,
            'status_history': status_history,
            'summary': {
                'total_pm_statuses': len(pm_status_list),
                'total_procurement_statuses': len(procurement_status_list),
                'pm_approved_count': len([s for s in pm_status_list if s['status'] == 'approved']),
                'pm_rejected_count': len([s for s in pm_status_list if s['status'] == 'rejected']),
                'pm_pending_count': len([s for s in pm_status_list if s['status'] == 'pending']),
                'procurement_approved_count': len([s for s in procurement_status_list if s['status'] == 'approved']),
                'procurement_rejected_count': len([s for s in procurement_status_list if s['status'] == 'rejected']),
                'procurement_pending_count': len([s for s in procurement_status_list if s['status'] == 'pending'])
            }
        }), 200

    except Exception as e:
        log.error(f"Error getting purchase status details for purchase {purchase_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500


def get_project_manager_dashboard():
    """Get project manager dashboard data based on purchase_status table with sender/receiver counts"""
    try:
        current_user = g.user
        user_id = current_user['user_id']
        user_name = current_user['full_name']
        
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Check if user is Project Manager
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'projectManager':
            return jsonify({'error': 'Only Project Manager can access dashboard'}), 403

        # Get all status records where project manager is the SENDER (PM made decisions)
        pm_sender_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'projectManager',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Get all status records where project manager is the RECEIVER (PM received decisions)
        pm_receiver_statuses = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.receiver == 'projectManager',
                PurchaseStatus.is_active == True
            )
        ).order_by(PurchaseStatus.created_at.desc()).all()

        # Get purchases that are in PM workflow but haven't been processed by PM yet
        # These are purchases that have been approved by Procurement but PM hasn't acted on them
        procurement_approved_purchase_ids = PurchaseStatus.query.filter(
            and_(
                PurchaseStatus.sender == 'procurement',
                PurchaseStatus.status == 'approved',
                PurchaseStatus.is_active == True
            )
        ).with_entities(PurchaseStatus.purchase_id).all()
        
        procurement_approved_purchase_ids = [pid[0] for pid in procurement_approved_purchase_ids]
        
        # Get purchases that PM has already processed
        pm_processed_purchase_ids = [status.purchase_id for status in pm_sender_statuses]
        
        # Find purchases approved by Procurement but not yet processed by PM (pending for PM)
        pm_sender_pending_purchases = Purchase.query.filter(
            and_(
                Purchase.is_deleted == False,
                Purchase.purchase_id.in_(procurement_approved_purchase_ids),
                ~Purchase.purchase_id.in_(pm_processed_purchase_ids)
            )
        ).all()

        # Get purchases that were sent to PM but PM hasn't responded yet (receiver pending)
        pm_receiver_pending_purchases = Purchase.query.filter(
            and_(
                Purchase.is_deleted == False,
                Purchase.purchase_id.in_(procurement_approved_purchase_ids),
                ~Purchase.purchase_id.in_([status.purchase_id for status in pm_receiver_statuses])
            )
        ).all()

        # Process SENDER data (PM team as sender)
        sender_approved_count = 0
        sender_rejected_count = 0
        sender_pending_count = 0
        sender_approved_details = []
        sender_rejected_details = []
        sender_pending_details = []

        # Process existing status records
        for status in pm_sender_statuses:
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
                'date': purchase.date.isoformat() if hasattr(purchase.date, 'isoformat') else purchase.date,
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
                    'decision_date': status.decision_date.isoformat() if hasattr(status, 'decision_date') and status.decision_date else None,
                    'decision_by_user_id': status.decision_by_user_id,
                    'decision_by': status.created_by,
                    'rejection_reason': status.rejection_reason,
                    'reject_category': status.reject_category,
                    'comments': status.comments,
                    'created_at': status.created_at.isoformat() if hasattr(status, 'created_at') and status.created_at else None,
                    'last_modified_at': status.last_modified_at.isoformat() if hasattr(status, 'last_modified_at') and status.last_modified_at else None,
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

        # Process pending purchases (those without status records)
        for purchase in pm_sender_pending_purchases:
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
                'status_id': None,
                'purchase_id': purchase.purchase_id,
                'project_id': purchase.project_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date.isoformat() if hasattr(purchase.date, 'isoformat') else purchase.date,
                'purpose': purchase.purpose,
                'file_path': purchase.file_path,
                'materials': materials,
                'material_count': len(materials),
                'total_quantity': total_quantity,
                'total_cost': round(total_material_cost, 2),
                'status_info': {
                    'status': 'pending',
                    'sender': 'projectManager',
                    'receiver': None,
                    'decision_date': None,
                    'decision_by_user_id': None,
                    'decision_by': None,
                    'rejection_reason': None,
                    'reject_category': None,
                    'comments': None,
                    'created_at': purchase.created_at.isoformat() if hasattr(purchase.created_at, 'isoformat') and purchase.created_at else None,
                    'last_modified_at': purchase.last_modified_at.isoformat() if hasattr(purchase.last_modified_at, 'isoformat') and purchase.last_modified_at else None,
                    'last_modified_by': purchase.last_modified_by
                }
            }

            sender_pending_count += 1
            sender_pending_details.append(status_detail)

        # Process RECEIVER data (PM team as receiver)
        receiver_approved_count = 0
        receiver_rejected_count = 0
        receiver_pending_count = 0
        receiver_approved_details = []
        receiver_rejected_details = []
        receiver_pending_details = []

        for status in pm_receiver_statuses:
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
                'date': purchase.date.isoformat() if hasattr(purchase.date, 'isoformat') else purchase.date,
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
                    'decision_date': status.decision_date.isoformat() if hasattr(status, 'decision_date') and status.decision_date else None,
                    'decision_by_user_id': status.decision_by_user_id,
                    'decision_by': status.created_by,
                    'rejection_reason': status.rejection_reason,
                    'reject_category': status.reject_category,
                    'comments': status.comments,
                    'created_at': status.created_at.isoformat() if hasattr(status, 'created_at') and status.created_at else None,
                    'last_modified_at': status.last_modified_at.isoformat() if hasattr(status, 'last_modified_at') and status.last_modified_at else None,
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

        # Process receiver pending purchases (those sent to PM but PM hasn't responded)
        for purchase in pm_receiver_pending_purchases:
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
                'status_id': None,
                'purchase_id': purchase.purchase_id,
                'project_id': purchase.project_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'date': purchase.date.isoformat() if hasattr(purchase.date, 'isoformat') else purchase.date,
                'purpose': purchase.purpose,
                'file_path': purchase.file_path,
                'materials': materials,
                'material_count': len(materials),
                'total_quantity': total_quantity,
                'total_cost': round(total_material_cost, 2),
                'status_info': {
                    'status': 'pending',
                    'sender': 'procurement',
                    'receiver': 'projectManager',
                    'decision_date': None,
                    'decision_by_user_id': None,
                    'decision_by': None,
                    'rejection_reason': None,
                    'reject_category': None,
                    'comments': None,
                    'created_at': purchase.created_at.isoformat() if hasattr(purchase.created_at, 'isoformat') and purchase.created_at else None,
                    'last_modified_at': purchase.last_modified_at.isoformat() if hasattr(purchase.last_modified_at, 'isoformat') and purchase.last_modified_at else None,
                    'last_modified_by': purchase.last_modified_by
                }
            }

            receiver_pending_count += 1
            receiver_pending_details.append(status_detail)

        # Calculate totals
        sender_total = sender_approved_count + sender_rejected_count + sender_pending_count
        receiver_total = receiver_approved_count + receiver_rejected_count + receiver_pending_count

        # Calculate rejection breakdown for sender
        sender_cost_rejections = len([s for s in sender_rejected_details if s['status_info']['reject_category'] == 'cost'])
        sender_pm_flag_rejections = len([s for s in sender_rejected_details if s['status_info']['reject_category'] == 'pm_flag'])

        # Calculate rejection breakdown for receiver
        receiver_cost_rejections = len([s for s in receiver_rejected_details if s['status_info']['reject_category'] == 'cost'])
        receiver_pm_flag_rejections = len([s for s in receiver_rejected_details if s['status_info']['reject_category'] == 'pm_flag'])

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
            'project_manager_as_sender': {
                'total_count': sender_total,
                'approved_count': sender_approved_count,
                'rejected_count': sender_rejected_count,
                'pending_count': sender_pending_count,
                'approved_value': round(sender_approved_value, 2),
                'rejected_value': round(sender_rejected_value, 2),
                'pending_value': round(sender_pending_value, 2),
                'approved_quantity': sender_approved_quantity,
                'rejected_quantity': sender_rejected_quantity,
                'pending_quantity': sender_pending_quantity,
                'rejection_breakdown': {
                    'cost_rejections': sender_cost_rejections,
                    'pm_flag_rejections': sender_pm_flag_rejections,
                    'other_rejections': sender_rejected_count - sender_cost_rejections - sender_pm_flag_rejections
                }
            },
            'project_manager_as_receiver': {
                'total_count': receiver_total,
                'approved_count': receiver_approved_count,
                'rejected_count': receiver_rejected_count,
                'pending_count': receiver_pending_count,
                'approved_value': round(receiver_approved_value, 2),
                'rejected_value': round(receiver_rejected_value, 2),
                'pending_value': round(receiver_pending_value, 2),
                'approved_quantity': receiver_approved_quantity,
                'rejected_quantity': receiver_rejected_quantity,
                'pending_quantity': receiver_pending_quantity,
                'rejection_breakdown': {
                    'cost_rejections': receiver_cost_rejections,
                    'pm_flag_rejections': receiver_pm_flag_rejections,
                    'other_rejections': receiver_rejected_count - receiver_cost_rejections - receiver_pm_flag_rejections
                }
            },
            'summary': {
                'total_sender_records': sender_total,
                'total_receiver_records': receiver_total,
                'total_unique_purchases': len(set([s['purchase_id'] for s in sender_approved_details + sender_rejected_details + sender_pending_details + receiver_approved_details + receiver_rejected_details + receiver_pending_details]))
            }
        }

        return jsonify(dashboard_data), 200

    except Exception as e:
        log.error(f"Error in get_project_manager_dashboard: {str(e)}")
        return jsonify({'error': f'Failed to retrieve dashboard data: {str(e)}'}), 500