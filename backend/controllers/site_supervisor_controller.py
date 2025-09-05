from flask import jsonify, g
from sqlalchemy import and_, desc, func
import logging

from models.purchase import Purchase
from models.material import Material
from models.role import Role
from models.purchase_status import PurchaseStatus

log = logging.getLogger(__name__)

def get_site_supervisor_dashboard():
    """Get dashboard data for site supervisor"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is site supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'siteSupervisor':
            return jsonify({'error': 'Access denied. Site supervisor role required'}), 403

        user_id = current_user['user_id']

        dashboard_data = {
            'recent_purchase_requests': _get_recent_purchase_requests(user_id),
            'purchase_analytics': _get_purchase_analytics(user_id)
        }

        return jsonify({'success': True, 'dashboard_data': dashboard_data}), 200

    except Exception as e:
        log.error(f"Error fetching site supervisor dashboard: {str(e)}")
        return jsonify({'error': str(e)}), 500


def _get_recent_purchase_requests(user_id):
    """Get recent purchase requests (limit 5)"""
    try:
        recent_purchases = (
            Purchase.query.filter(Purchase.is_deleted == False)
            .order_by(desc(Purchase.created_at))
            .limit(5)
            .all()
        )

        material_cache = _get_materials_for_purchases(recent_purchases)

        recent_data = []
        for purchase in recent_purchases:
            materials_summary = _summarize_materials(material_cache.get(purchase.purchase_id, []))
            # Get latest status from purchase_status table (regardless of role)
            latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)

            recent_data.append({
                'purchase_id': purchase.purchase_id,
                'site_location': purchase.site_location,
                'purpose': purchase.purpose,
                'materials_summary': materials_summary,
                'latest_status': latest_status.status if latest_status else 'pending',
                'status_sender': latest_status.sender if latest_status else None,
                'status_receiver': latest_status.receiver if latest_status else None,
                'status_role': latest_status.role if latest_status else None,
                'status_date': latest_status.created_at.isoformat() if latest_status else None,
                'decision_date': latest_status.decision_date.isoformat() if latest_status and latest_status.decision_date else None,
                'status_comments': latest_status.comments if latest_status else None,
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'date': purchase.date
            })

        return recent_data

    except Exception as e:
        log.error(f"Error getting recent purchase requests: {str(e)}")
        return []


def _get_purchase_analytics(user_id):
    """Get purchase analytics"""
    try:
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).all()
        total_purchases = len(all_purchases)

        email_sent_true = sum(1 for p in all_purchases if p.email_sent)
        email_sent_false = total_purchases - email_sent_true

        material_details = _get_material_details(all_purchases)

        return {
            'total_purchases': total_purchases,
            'procurement_email_send': email_sent_true,
            'procurement_unemail_send': email_sent_false,
            'material_details': material_details
        }

    except Exception as e:
        log.error(f"Error getting purchase analytics: {str(e)}")
        return {}


def _get_material_details(purchases):
    """Get material stats for multiple purchases"""
    try:
        material_cache = _get_materials_for_purchases(purchases)
        all_materials = [m for mats in material_cache.values() for m in mats]

        if not all_materials:
            return {'total_materials': 0, 'total_quantity': 0, 'total_cost': 0, 'units': []}

        total_quantity = sum(m.quantity or 0 for m in all_materials)
        total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in all_materials)
        units = list({m.unit for m in all_materials if m.unit})

        # Get category breakdown
        category_breakdown = {}
        for material in all_materials:
            category = material.category or 'Uncategorized'
            if category not in category_breakdown:
                category_breakdown[category] = {
                    'count': 0,
                    'quantity': 0,
                    'cost': 0
                }
            category_breakdown[category]['count'] += 1
            category_breakdown[category]['quantity'] += material.quantity or 0
            category_breakdown[category]['cost'] += (material.cost or 0) * (material.quantity or 0)

        # Round costs in category breakdown
        for category in category_breakdown:
            category_breakdown[category]['cost'] = round(category_breakdown[category]['cost'], 2)

        return {
            'total_materials': len(all_materials),
            'total_quantity': total_quantity,
            'total_cost': round(total_cost, 2),
            'units': units,
            'category_breakdown': category_breakdown
        }

    except Exception as e:
        log.error(f"Error getting material details: {str(e)}")
        return {}


def _get_materials_for_purchases(purchases):
    """Fetch all materials for given purchases in one query"""
    purchase_map = {p.purchase_id: p.material_ids or [] for p in purchases}
    all_ids = [mid for ids in purchase_map.values() for mid in ids]

    if not all_ids:
        return {}

    materials = Material.query.filter(
        and_(Material.is_deleted == False, Material.material_id.in_(all_ids))
    ).all()

    material_cache = {pid: [] for pid in purchase_map}
    for mat in materials:
        for pid, mids in purchase_map.items():
            if mat.material_id in mids:
                material_cache[pid].append(mat)

    return material_cache


def _summarize_materials(materials):
    """Summarize a list of materials"""
    if not materials:
        return {'total_materials': 0, 'total_quantity': 0, 'total_cost': 0, 'categories': []}

    total_quantity = sum(m.quantity or 0 for m in materials)
    total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)
    
    # Get unique categories
    categories = list({m.category for m in materials if m.category})

    return {
        'total_materials': len(materials),
        'total_quantity': total_quantity,
        'total_cost': round(total_cost, 2),
        'categories': categories
    }