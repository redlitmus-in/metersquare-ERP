from collections import Counter, defaultdict
from flask import g, request, jsonify
from datetime import datetime
from sqlalchemy import and_, desc
from config.logging import get_logger
from config.db import db
from models.role import Role
from models.purchase import Purchase
from models.material import Material
from models.purchase_status import PurchaseStatus
from models.purchase_history import PurchaseHistory

log = get_logger()

def _get_procurement_status_counts(requests):
    """Count procurement statuses for a list of requests"""
    counts = Counter()

    for purchase in requests:
        # Get the latest status for this purchase (regardless of sender role)
        latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)
        
        if latest_status:
            counts[latest_status.status.lower()] += 1
        else:
            counts['pending'] += 1
    
    return {
        'approved': counts.get('approved', 0),
        'rejected': counts.get('rejected', 0),
        'pending': counts.get('pending', 0),
        'under_review': counts.get('under_review', 0)
    }


def _get_material_statistics(all_requests):
    """Aggregate material statistics across all requests"""
    all_material_ids = [mid for p in all_requests if p.material_ids for mid in p.material_ids]
    if not all_material_ids:
        return {
            'summary': {
                'total_materials': 0,
                'total_quantity': 0,
                'total_cost': 0,
                'avg_quantity_per_material': 0,
                'avg_cost_per_material': 0,
                'avg_cost_per_unit': 0
            },
            'category_distribution': {},
            'unit_distribution': {},
            'priority_distribution': {},
            'cost_by_category': {},
            'top_materials_by_quantity': [],
            'top_materials_by_cost': []
        }

    materials = Material.query.filter(
        Material.is_deleted == False,
        Material.material_id.in_(all_material_ids)
    ).all()

    total_quantity = sum(m.quantity or 0 for m in materials)
    total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)
    total_materials = len(materials)

    # Distributions
    category_counts = Counter(m.category or 'Uncategorized' for m in materials)
    unit_counts = Counter(m.unit or 'Unknown' for m in materials)
    priority_counts = Counter(m.priority or 'Medium' for m in materials)

    cost_by_category = defaultdict(float)
    for m in materials:
        category = m.category or 'Uncategorized'
        cost_by_category[category] += (m.cost or 0) * (m.quantity or 0)

    # Top materials
    top_by_quantity = sorted(materials, key=lambda m: m.quantity or 0, reverse=True)[:5]
    top_by_cost = sorted(materials, key=lambda m: (m.cost or 0) * (m.quantity or 0), reverse=True)[:5]

    return {
        'summary': {
            'total_materials': total_materials,
            'total_quantity': total_quantity,
            'total_cost': round(total_cost, 2),
            'avg_quantity_per_material': round(total_quantity / total_materials, 2) if total_materials else 0,
            'avg_cost_per_material': round(total_cost / total_materials, 2) if total_materials else 0,
            'avg_cost_per_unit': round(total_cost / total_quantity, 2) if total_quantity else 0
        },
        'category_distribution': dict(category_counts),
        'unit_distribution': dict(unit_counts),
        'priority_distribution': dict(priority_counts),
        'cost_by_category': {k: round(v, 2) for k, v in cost_by_category.items()},
        'top_materials_by_quantity': [
            {
                'material_id': m.material_id,
                'description': m.description,
                'quantity': m.quantity,
                'unit': m.unit,
                'category': m.category,
                'cost': m.cost,
                'priority': m.priority
            } for m in top_by_quantity
        ],
        'top_materials_by_cost': [
            {
                'material_id': m.material_id,
                'description': m.description,
                'quantity': m.quantity,
                'unit': m.unit,
                'category': m.category,
                'unit_cost': m.cost,
                'total_cost': (m.cost or 0) * (m.quantity or 0),
                'priority': m.priority
            } for m in top_by_cost
        ]
    }


def _get_purchase_material_summary(purchase):
    """Quick material summary for one purchase"""
    if not purchase.material_ids:
        return {'total_materials': 0, 'total_quantity': 0, 'total_cost': 0, 'categories': [], 'units': []}

    materials = Material.query.filter(
        Material.is_deleted == False,
        Material.material_id.in_(purchase.material_ids)
    ).all()

    total_quantity = sum(m.quantity or 0 for m in materials)
    total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)

    return {
        'total_materials': len(materials),
        'total_quantity': total_quantity,
        'total_cost': round(total_cost, 2),
        'categories': list({m.category for m in materials if m.category}),
        'units': list({m.unit for m in materials if m.unit})
    }


def get_procurement_dashboard():
    """Procurement dashboard endpoint"""
    try:
        current_user = getattr(g, "user", None)
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'procurement':
            return jsonify({"error": "Invalid role"}), 403

        # All requests
        all_requests = Purchase.query.filter(
            Purchase.is_deleted == False,
            Purchase.email_sent == True
        ).all()

        total_requests = len(all_requests)
        status_counts = _get_procurement_status_counts(all_requests)

        # Recent 10 requests
        recent_requests = Purchase.query.filter(
            Purchase.is_deleted == False,
            Purchase.email_sent == True
        ).order_by(desc(Purchase.created_at)).limit(10).all()

        recent_data = []
        for purchase in recent_requests:
            # Get the latest status for this purchase (regardless of sender role)
            latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)
            
            recent_data.append({
                'purchase_id': purchase.purchase_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'purpose': purchase.purpose,
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'email_sent': purchase.email_sent,
                'latest_status': latest_status.status if latest_status else 'pending',
                'status_sender': latest_status.sender if latest_status else None,
                'status_receiver': latest_status.receiver if latest_status else None,
                'status_role': latest_status.role if latest_status else None,
                'status_date': latest_status.created_at.isoformat() if latest_status and latest_status.created_at else None,
                'decision_date': latest_status.decision_date.isoformat() if latest_status and latest_status.decision_date else None,
                'status_comments': latest_status.comments if latest_status else None,
                'material_summary': _get_purchase_material_summary(purchase)
            })

        dashboard_data = {
            'material_statistics': _get_material_statistics(all_requests),
            'recent_requests': recent_data,
            'status_breakdown': status_counts
        }

        return jsonify({"success": True, "dashboard_data": dashboard_data}), 200

    except Exception as e:
        log.error(f"Error fetching procurement dashboard: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_all_procurement():
    """Optimized procurement requests retrieval with batch loading"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Quick role check
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'procurement':
            return jsonify({"error": "Invalid role"}), 403

        # Fetch all purchases with optimized query
        from sqlalchemy.orm import load_only
        procurement_purchases = Purchase.query.filter_by(
            email_sent=True,
            is_deleted=False
        ).options(
            load_only(
                Purchase.purchase_id,
                Purchase.requested_by,
                Purchase.user_id,
                Purchase.site_location,
                Purchase.date,
                Purchase.project_id,
                Purchase.purpose,
                Purchase.file_path,
                Purchase.email_sent,
                Purchase.material_ids,
                Purchase.created_at,
                Purchase.created_by,
                Purchase.last_modified_at,
                Purchase.last_modified_by
            )
        ).order_by(desc(Purchase.created_at)).all()

        if not procurement_purchases:
            return jsonify({
                "success": True,
                "procurement": [],
                "total_count": 0
            }), 200

        # Collect all material IDs and purchase IDs for batch loading
        all_material_ids = set()
        purchase_ids = []
        for purchase in procurement_purchases:
            purchase_ids.append(purchase.purchase_id)
            if purchase.material_ids:
                all_material_ids.update(purchase.material_ids)

        # Batch load all materials in one query
        materials_by_id = {}
        if all_material_ids:
            all_materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(list(all_material_ids))
                )
            ).options(
                load_only(
                    Material.material_id,
                    Material.description,
                    Material.specification,
                    Material.unit,
                    Material.quantity,
                    Material.category,
                    Material.cost,
                    Material.priority,
                    Material.design_reference
                )
            ).all()

            materials_by_id = {mat.material_id: mat for mat in all_materials}

        # Batch load all statuses in one query
        all_statuses = PurchaseStatus.query.filter(
            PurchaseStatus.purchase_id.in_(purchase_ids)
        ).options(
            load_only(
                PurchaseStatus.purchase_id,
                PurchaseStatus.status,
                PurchaseStatus.sender,
                PurchaseStatus.receiver,
                PurchaseStatus.role,
                PurchaseStatus.created_at,
                PurchaseStatus.decision_date,
                PurchaseStatus.comments,
                PurchaseStatus.reject_category,
                PurchaseStatus.rejection_reason
            )
        ).all()

        # Group statuses by purchase_id and find latest for each
        from collections import defaultdict
        statuses_by_purchase = defaultdict(list)
        for status in all_statuses:
            statuses_by_purchase[status.purchase_id].append(status)

        # Find latest status for each purchase
        latest_statuses = {}
        for purchase_id, status_list in statuses_by_purchase.items():
            if status_list:
                latest_statuses[purchase_id] = max(status_list, key=lambda s: s.created_at if s.created_at else datetime.min)

        # Build response data with optimized processing
        procurement_data = []
        for purchase in procurement_purchases:
            # Get materials for this purchase from pre-loaded data
            materials = []
            if purchase.material_ids:
                for mat_id in purchase.material_ids:
                    if mat_id in materials_by_id:
                        mat = materials_by_id[mat_id]
                        materials.append({
                            'material_id': mat.material_id,
                            'description': mat.description,
                            'specification': mat.specification,
                            'unit': mat.unit,
                            'quantity': mat.quantity,
                            'category': mat.category,
                            'cost': mat.cost,
                            'priority': mat.priority,
                            'design_reference': mat.design_reference
                        })

            # Get latest status from pre-loaded data
            latest_status = latest_statuses.get(purchase.purchase_id)

            # Build purchase dict efficiently
            purchase_dict = {
                'purchase_id': purchase.purchase_id,
                'requested_by': purchase.requested_by,
                'user_id': purchase.user_id,
                'site_location': purchase.site_location,
                'date': purchase.date,
                'project_id': purchase.project_id,
                'purpose': purchase.purpose,
                'file_path': purchase.file_path,
                'email_sent': purchase.email_sent,
                'materials': materials,
                'created_at': purchase.created_at,
                'created_by': purchase.created_by,
                'last_modified_at': purchase.last_modified_at,
                'last_modified_by': purchase.last_modified_by,
                'is_deleted': False
            }

            # Add status information
            if latest_status:
                purchase_dict['sender_latest_status'] = latest_status.status
                purchase_dict['status_sender'] = latest_status.sender
                purchase_dict['status_receiver'] = latest_status.receiver
                purchase_dict['status_role'] = latest_status.role
                purchase_dict['status_date'] = latest_status.created_at.isoformat() if latest_status.created_at else None
                purchase_dict['decision_date'] = latest_status.decision_date.isoformat() if latest_status.decision_date else None
                purchase_dict['status_comments'] = latest_status.comments
                purchase_dict['reject_category'] = latest_status.reject_category
                purchase_dict['rejection_reason'] = latest_status.rejection_reason

                # Add status_info for compatibility
                purchase_dict['status_info'] = {
                    'status': latest_status.status,
                    'sender': latest_status.sender,
                    'receiver': latest_status.receiver,
                    'reject_category': latest_status.reject_category,
                    'rejection_reason': latest_status.rejection_reason
                }

                # Determine receiver_latest_status
                if (latest_status.receiver == 'procurement' and
                    latest_status.status == 'rejected' and
                    latest_status.sender in ['estimation', 'projectManager']):
                    purchase_dict['receiver_latest_status'] = "pending"
                elif latest_status.sender == 'accounts' and latest_status.receiver == 'accounts':
                    purchase_dict['receiver_latest_status'] = "task completed"
                elif latest_status.sender == 'accounts':
                    purchase_dict['receiver_latest_status'] = latest_status.status
                else:
                    purchase_dict['receiver_latest_status'] = latest_status.status
            else:
                purchase_dict['sender_latest_status'] = 'pending'
                purchase_dict['status_sender'] = None
                purchase_dict['status_receiver'] = None
                purchase_dict['status_role'] = None
                purchase_dict['status_date'] = None
                purchase_dict['decision_date'] = None
                purchase_dict['status_comments'] = None
                purchase_dict['receiver_latest_status'] = "pending"

            procurement_data.append(purchase_dict)

        return jsonify({
            "success": True,
            "procurement": procurement_data,
            "total_count": len(procurement_data)
        }), 200
    except Exception as e:
        log.error(f"Error fetching procurement: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_purchase_id_history(purchase_id):
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role not in ['siteSupervisor', 'mepSupervisor', 'procurement', 'projectManager','estimation','technicalDirector']:
            return jsonify({
                'error': 'Invalid role. Only Site Supervisor, MEP Supervisor, Procurement team, or Project Manager can view purchase history'
            }), 403

        # 🔹 Fetch purchase by ID
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({'error': 'Purchase request not found'}), 404

        # 🔹 Get related materials
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
                    'created_at': mat.created_at,
                    'created_by': mat.created_by
                })

        approvals = []
        # 🔹 Get approvals
        purchase_history = PurchaseHistory.query.filter_by(purchase_id=purchase.purchase_id).first()

        if purchase_history:
            approvals = {
                "id": purchase_history.purchase_history_id,
                "purchase_id": purchase_history.purchase_id,
                "action": purchase_history.action,
                "created_by": purchase_history.created_by,
                "created_at": purchase_history.created_at,
                "last_modified_by": purchase_history.last_modified_by,
                "last_modified_at": purchase_history.last_modified_at
            }
        # 🔹 Final purchase response with nested materials & approvals
        purchase_data = {
            'purchase_id': purchase.purchase_id,
            'requested_by': purchase.requested_by,
            'user_id': purchase.user_id,
            'user_name': current_user['full_name'],
            'site_location': purchase.site_location,
            'date': purchase.date,
            'project_id': purchase.project_id,
            'purpose': purchase.purpose,
            'material_ids': purchase.material_ids,
            'materials': materials,   # ✅ nested
            'file_path': purchase.file_path,
            'email_sent': purchase.email_sent,
            'created_at': purchase.created_at,
            'created_by': purchase.created_by,
            'last_modified_at': purchase.last_modified_at,
            'last_modified_by': purchase.last_modified_by,
            'approvals': approvals    # ✅ nested
        }

        return jsonify({
            'success': True,
            'message': 'Purchase request fetched successfully',
            'purchase': purchase_data
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500