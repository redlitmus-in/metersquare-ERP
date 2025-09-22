from flask import jsonify, g, request
from sqlalchemy import and_, desc, func, or_
import logging
from datetime import datetime

from models.purchase import Purchase
from models.material import Material
from models.role import Role
from models.purchase_status import PurchaseStatus
from models.purchase_history import PurchaseHistory
from models.user import User
from models.project import Project
from config.db import db

log = logging.getLogger(__name__)

def get_mep_supervisor_dashboard():
    """Get MEP-specific dashboard data only (no purchases list)"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get all MEP purchases for analytics
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).all()
        mep_purchases = []
        total_value = 0

        # Categories count
        electrical_count = 0
        mechanical_count = 0
        plumbing_count = 0
        general_mep_count = 0

        # Status counts
        pending_count = 0
        approved_count = 0
        rejected_count = 0
        in_progress_count = 0

        for purchase in all_purchases:
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids or [])
                )
            ).all()

            # Check if this is MEP-related
            if _has_mep_materials(materials) or _is_mep_purchase(purchase.purpose):
                mep_purchases.append(purchase)

                # Calculate value
                for material in materials:
                    total_value += (material.cost or 0) * (material.quantity or 0)

                # Count by category
                category = _detect_mep_category(purchase.purpose, materials)
                if category == 'electrical':
                    electrical_count += 1
                elif category == 'mechanical':
                    mechanical_count += 1
                elif category == 'plumbing':
                    plumbing_count += 1
                else:
                    general_mep_count += 1

                # Count by status
                latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)
                if latest_status:
                    if latest_status.status == 'pending':
                        pending_count += 1
                    elif latest_status.status == 'approved':
                        approved_count += 1
                    elif latest_status.status == 'rejected':
                        rejected_count += 1
                    elif latest_status.status == 'in_progress':
                        in_progress_count += 1
                else:
                    pending_count += 1

        # Calculate percentages and trends
        total_mep = len(mep_purchases)

        dashboard_data = {
            'summary': {
                'total_mep_purchases': total_mep,
                'total_value': round(total_value, 2),
                'pending': pending_count,
                'approved': approved_count,
                'rejected': rejected_count,
                'in_progress': in_progress_count
            },
            'categories': {
                'electrical': {
                    'count': electrical_count,
                    'percentage': round((electrical_count / total_mep * 100) if total_mep > 0 else 0, 1)
                },
                'mechanical': {
                    'count': mechanical_count,
                    'percentage': round((mechanical_count / total_mep * 100) if total_mep > 0 else 0, 1)
                },
                'plumbing': {
                    'count': plumbing_count,
                    'percentage': round((plumbing_count / total_mep * 100) if total_mep > 0 else 0, 1)
                },
                'general': {
                    'count': general_mep_count,
                    'percentage': round((general_mep_count / total_mep * 100) if total_mep > 0 else 0, 1)
                }
            },
            'recent_activity': {
                'last_24h': sum(1 for p in mep_purchases if p.created_at and
                               (datetime.utcnow() - p.created_at).days < 1),
                'last_7d': sum(1 for p in mep_purchases if p.created_at and
                              (datetime.utcnow() - p.created_at).days < 7),
                'last_30d': sum(1 for p in mep_purchases if p.created_at and
                               (datetime.utcnow() - p.created_at).days < 30)
            }
        }

        return jsonify({'success': True, 'data': dashboard_data}), 200

    except Exception as e:
        log.error(f"Error fetching MEP supervisor dashboard: {str(e)}")
        return jsonify({'error': str(e)}), 500


# This function is replaced by the one at line 685
# Removed to avoid duplicate function definition

        # Get all purchases
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).order_by(desc(Purchase.created_at)).all()

        # Filter for MEP-related purchases with full details
        mep_purchases_full = []
        for purchase in all_purchases:
            # Get materials for this purchase
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids or [])
                )
            ).all()

            # Check if this is an MEP purchase
            # First check if it was created by MEP Supervisor
            is_created_by_mep = False
            if purchase.requested_by:
                requester_lower = purchase.requested_by.lower()
                is_created_by_mep = 'mep' in requester_lower or 'mepsupervisor' in requester_lower

            if purchase.created_by:
                creator_lower = purchase.created_by.lower()
                is_created_by_mep = is_created_by_mep or 'mep' in creator_lower or 'mepsupervisor' in creator_lower

            # Check if this is an MEP purchase: created by MEP supervisor OR has MEP materials/purpose
            is_mep = is_created_by_mep or (_has_mep_materials(materials) or _is_mep_purchase(purchase.purpose)) and not _is_site_supervisor_purchase(purchase)

            if is_mep:
                # Get latest status with full history
                latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)

                # Get requester details
                requester = User.query.filter_by(user_id=purchase.user_id).first()

                # Calculate totals from materials
                total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)
                total_quantity = sum(m.quantity or 0 for m in materials)

                # Detect MEP category
                mep_category = _detect_mep_category(purchase.purpose, materials)

                # Apply filters
                if category_filter and mep_category != category_filter:
                    continue
                if status_filter and (latest_status.status if latest_status else 'pending') != status_filter:
                    continue
                if search:
                    search_lower = search.lower()
                    if not (search_lower in purchase.purpose.lower() or
                           search_lower in purchase.site_location.lower() or
                           search_lower in (purchase.requested_by or '').lower()):
                        continue

                # Format materials data
                materials_data = []
                for material in materials:
                    materials_data.append({
                        'material_id': material.material_id,
                        'description': material.description,
                        'specification': material.specification,
                        'unit': material.unit,
                        'quantity': material.quantity,
                        'cost': material.cost,
                        'total_cost': (material.cost or 0) * (material.quantity or 0),
                        'category': material.category,
                        'is_mep': _is_mep_material(material),
                        'mep_type': _get_material_mep_category(material)
                    })

                purchase_data = {
                    'purchase_id': purchase.purchase_id,
                    'user_id': purchase.user_id,
                    'requested_by': purchase.requested_by,
                    'requester_details': {
                        'name': requester.full_name if requester else purchase.requested_by,
                        'email': requester.email if requester else None,
                        'department': requester.department if requester else None
                    },
                    'site_location': purchase.site_location,
                    'date': purchase.date,
                    'project_id': purchase.project_id,
                    'purpose': purchase.purpose,
                    'materials': materials_data,
                    'email_sent': purchase.email_sent,
                    'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                    'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
                    'created_by': purchase.created_by,
                    'current_status': {
                        'status': latest_status.status if latest_status else 'pending',
                        'updated_at': latest_status.created_at.isoformat() if latest_status else None,
                        'updated_by': latest_status.sender if latest_status else None
                    },
                    'mep_category': mep_category,
                    'total_cost': round(total_cost, 2),
                    'total_quantity': total_quantity,
                    'materials_count': len(materials),
                    'can_edit': latest_status.status in ['pending', 'rejected'] if latest_status else True,
                    'can_delete': latest_status.status == 'pending' if latest_status else True
                }

                mep_purchases_full.append(purchase_data)

        # Apply pagination
        total = len(mep_purchases_full)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_purchases = mep_purchases_full[start:end]

        return jsonify({
            'success': True,
            'data': paginated_purchases,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            },
            'filters': {
                'categories': ['electrical', 'mechanical', 'plumbing', 'general'],
                'statuses': ['pending', 'approved', 'rejected', 'in_progress']
            }
        }), 200

    except Exception as e:
        log.error(f"Error fetching MEP purchases: {str(e)}")
        return jsonify({'error': str(e)}), 500


def _get_recent_mep_requests(user_id):
    """Get recent MEP purchase requests (limit 5)"""
    try:
        # Filter purchases for MEP-related items
        recent_purchases = (
            Purchase.query.filter(Purchase.is_deleted == False)
            .order_by(desc(Purchase.created_at))
            .limit(5)
            .all()
        )

        material_cache = _get_materials_for_purchases(recent_purchases)

        recent_data = []
        for purchase in recent_purchases:
            materials = material_cache.get(purchase.purchase_id, [])
            # Filter for MEP materials
            mep_materials = _filter_mep_materials(materials)

            if mep_materials:  # Only include if it has MEP materials
                materials_summary = _summarize_mep_materials(mep_materials)
                # Get latest status from purchase_status table
                latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)

                recent_data.append({
                    'purchase_id': purchase.purchase_id,
                    'site_location': purchase.site_location,
                    'purpose': purchase.purpose,
                    'materials_summary': materials_summary,
                    'mep_category': _detect_mep_category(purchase.purpose, materials),
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

        return recent_data[:5]  # Limit to 5 MEP-related purchases

    except Exception as e:
        log.error(f"Error getting recent MEP requests: {str(e)}")
        return []


def _get_mep_analytics(user_id):
    """Get MEP-specific purchase analytics"""
    try:
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).all()

        # Filter for MEP-related purchases
        mep_purchases = []
        for purchase in all_purchases:
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids or [])
                )
            ).all()

            if _has_mep_materials(materials) or _is_mep_purchase(purchase.purpose):
                mep_purchases.append(purchase)

        total_mep_purchases = len(mep_purchases)

        email_sent_true = sum(1 for p in mep_purchases if p.email_sent)
        email_sent_false = total_mep_purchases - email_sent_true

        material_details = _get_mep_material_details(mep_purchases)

        # Count by MEP category
        electrical_count = sum(1 for p in mep_purchases if _is_electrical(p.purpose))
        mechanical_count = sum(1 for p in mep_purchases if _is_mechanical(p.purpose))
        plumbing_count = sum(1 for p in mep_purchases if _is_plumbing(p.purpose))

        return {
            'total_purchases': total_mep_purchases,
            'procurement_email_send': email_sent_true,
            'procurement_unemail_send': email_sent_false,
            'material_details': material_details,
            'electrical_purchases': electrical_count,
            'mechanical_purchases': mechanical_count,
            'plumbing_purchases': plumbing_count
        }

    except Exception as e:
        log.error(f"Error getting MEP analytics: {str(e)}")
        return {}


def _get_mep_category_breakdown(user_id):
    """Get detailed MEP category breakdown"""
    try:
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).all()
        material_cache = _get_materials_for_purchases(all_purchases)

        breakdown = {
            'electrical': {'count': 0, 'cost': 0, 'items': []},
            'mechanical': {'count': 0, 'cost': 0, 'items': []},
            'plumbing': {'count': 0, 'cost': 0, 'items': []},
            'general_mep': {'count': 0, 'cost': 0, 'items': []}
        }

        for purchase in all_purchases:
            materials = material_cache.get(purchase.purchase_id, [])
            category = _detect_mep_category(purchase.purpose, materials)

            if category:
                total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)

                if category not in breakdown:
                    category = 'general_mep'

                breakdown[category]['count'] += 1
                breakdown[category]['cost'] += total_cost

                # Track common items
                for material in materials[:3]:  # Top 3 materials
                    item_desc = material.description[:50] if material.description else 'Unknown'
                    if item_desc not in breakdown[category]['items']:
                        breakdown[category]['items'].append(item_desc)

        # Round costs
        for category in breakdown:
            breakdown[category]['cost'] = round(breakdown[category]['cost'], 2)
            breakdown[category]['items'] = breakdown[category]['items'][:5]  # Limit to 5 items

        return breakdown

    except Exception as e:
        log.error(f"Error getting MEP category breakdown: {str(e)}")
        return {}


def _get_mep_material_details(purchases):
    """Get MEP material stats for multiple purchases"""
    try:
        material_cache = _get_materials_for_purchases(purchases)
        all_materials = [m for mats in material_cache.values() for m in mats]

        # Filter for MEP materials
        mep_materials = _filter_mep_materials(all_materials)

        if not mep_materials:
            return {'total_materials': 0, 'total_quantity': 0, 'total_cost': 0, 'units': []}

        total_quantity = sum(m.quantity or 0 for m in mep_materials)
        total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in mep_materials)
        units = list({m.unit for m in mep_materials if m.unit})

        # Get MEP-specific category breakdown
        category_breakdown = {
            'Electrical': {'count': 0, 'quantity': 0, 'cost': 0},
            'Mechanical': {'count': 0, 'quantity': 0, 'cost': 0},
            'Plumbing': {'count': 0, 'quantity': 0, 'cost': 0},
            'General MEP': {'count': 0, 'quantity': 0, 'cost': 0}
        }

        for material in mep_materials:
            mep_cat = _get_material_mep_category(material)
            if mep_cat not in category_breakdown:
                mep_cat = 'General MEP'

            category_breakdown[mep_cat]['count'] += 1
            category_breakdown[mep_cat]['quantity'] += material.quantity or 0
            category_breakdown[mep_cat]['cost'] += (material.cost or 0) * (material.quantity or 0)

        # Round costs
        for category in category_breakdown:
            category_breakdown[category]['cost'] = round(category_breakdown[category]['cost'], 2)

        return {
            'total_materials': len(mep_materials),
            'total_quantity': total_quantity,
            'total_cost': round(total_cost, 2),
            'units': units,
            'category_breakdown': category_breakdown
        }

    except Exception as e:
        log.error(f"Error getting MEP material details: {str(e)}")
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


def _summarize_mep_materials(materials):
    """Summarize a list of MEP materials"""
    if not materials:
        return {'total_materials': 0, 'total_quantity': 0, 'total_cost': 0, 'categories': []}

    total_quantity = sum(m.quantity or 0 for m in materials)
    total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)

    # Get MEP categories
    mep_categories = []
    for material in materials:
        cat = _get_material_mep_category(material)
        if cat and cat not in mep_categories:
            mep_categories.append(cat)

    return {
        'total_materials': len(materials),
        'total_quantity': total_quantity,
        'total_cost': round(total_cost, 2),
        'categories': mep_categories
    }


def _filter_mep_materials(materials):
    """Filter materials for MEP-related items"""
    mep_materials = []
    for material in materials:
        if _is_mep_material(material):
            mep_materials.append(material)
    return mep_materials


def _is_mep_material(material):
    """Check if a material is MEP-related"""
    if not material.description:
        return False

    desc_lower = material.description.lower()
    category_lower = (material.category or '').lower()

    mep_keywords = [
        # Electrical
        'electrical', 'wire', 'wiring', 'cable', 'circuit', 'breaker', 'panel',
        'transformer', 'generator', 'ups', 'switch', 'socket', 'outlet',
        'conduit', 'lighting', 'led', 'voltage', 'ampere', 'power',
        # Mechanical
        'hvac', 'mechanical', 'ventilation', 'duct', 'chiller', 'ahu',
        'fan', 'air conditioning', 'ac unit', 'cooling', 'heating',
        'compressor', 'motor', 'belt', 'bearing', 'filter',
        # Plumbing
        'plumbing', 'pipe', 'water', 'pump', 'valve', 'tank', 'drainage',
        'sewage', 'faucet', 'fixture', 'fitting', 'pvc', 'copper', 'pex',
        'toilet', 'sink', 'shower', 'heater', 'boiler'
    ]

    return any(keyword in desc_lower or keyword in category_lower for keyword in mep_keywords)


def _has_mep_materials(materials):
    """Check if materials list contains MEP items"""
    return any(_is_mep_material(material) for material in materials)


def _is_site_supervisor_purchase(purchase):
    """Check if a purchase is specifically for site supervisor (construction/civil work)"""
    purpose = (purchase.purpose or '').lower()
    requested_by = (purchase.requested_by or '').lower()

    # Site supervisor keywords
    site_keywords = [
        'construction', 'civil', 'concrete', 'cement', 'steel', 'rebar', 'brick',
        'sand', 'gravel', 'aggregate', 'foundation', 'structure', 'building',
        'scaffold', 'formwork', 'excavation', 'site work', 'earthwork',
        'masonry', 'tiles', 'flooring', 'roofing', 'cladding', 'paint',
        'safety equipment', 'hard hat', 'safety vest', 'barrier', 'fence'
    ]

    # Check if requested by site supervisor
    if 'site supervisor' in requested_by or 'site' in requested_by:
        return True

    # Check purpose for site-specific keywords
    for keyword in site_keywords:
        if keyword in purpose:
            return True

    return False


def _is_mep_purchase(purpose):
    """Check if purchase purpose is MEP-related"""
    if not purpose:
        return False

    purpose_lower = purpose.lower()
    return _is_electrical(purpose) or _is_mechanical(purpose) or _is_plumbing(purpose)


def _detect_mep_category(purpose, materials):
    """Detect MEP category from purpose and materials"""
    purpose_lower = (purpose or '').lower()

    # Check purpose first
    if _is_electrical(purpose):
        return 'electrical'
    if _is_mechanical(purpose):
        return 'mechanical'
    if _is_plumbing(purpose):
        return 'plumbing'

    # Check materials if purpose doesn't indicate
    electrical_count = 0
    mechanical_count = 0
    plumbing_count = 0

    for material in materials:
        mat_cat = _get_material_mep_category(material)
        if mat_cat == 'Electrical':
            electrical_count += 1
        elif mat_cat == 'Mechanical':
            mechanical_count += 1
        elif mat_cat == 'Plumbing':
            plumbing_count += 1

    # Return category with most materials
    if electrical_count > mechanical_count and electrical_count > plumbing_count:
        return 'electrical'
    elif mechanical_count > plumbing_count:
        return 'mechanical'
    elif plumbing_count > 0:
        return 'plumbing'

    return None


def _get_material_mep_category(material):
    """Get MEP category for a specific material"""
    if not material.description:
        return None

    desc_lower = material.description.lower()

    electrical_keywords = ['electrical', 'wire', 'cable', 'circuit', 'breaker',
                          'panel', 'transformer', 'generator', 'ups', 'switch',
                          'socket', 'outlet', 'conduit', 'lighting', 'led']

    mechanical_keywords = ['hvac', 'mechanical', 'ventilation', 'duct', 'chiller',
                          'ahu', 'fan', 'air conditioning', 'ac unit', 'cooling',
                          'heating', 'compressor', 'motor']

    plumbing_keywords = ['plumbing', 'pipe', 'water', 'pump', 'valve', 'tank',
                        'drainage', 'sewage', 'faucet', 'fixture', 'fitting',
                        'pvc', 'copper', 'toilet', 'sink', 'shower']

    if any(keyword in desc_lower for keyword in electrical_keywords):
        return 'Electrical'
    elif any(keyword in desc_lower for keyword in mechanical_keywords):
        return 'Mechanical'
    elif any(keyword in desc_lower for keyword in plumbing_keywords):
        return 'Plumbing'

    return 'General MEP'


def _is_electrical(text):
    """Check if text indicates electrical category"""
    if not text:
        return False
    text_lower = text.lower()
    electrical_terms = ['electrical', 'wiring', 'circuit', 'transformer',
                       'panel', 'generator', 'ups', 'cable', 'breaker']
    return any(term in text_lower for term in electrical_terms)


def _is_mechanical(text):
    """Check if text indicates mechanical category"""
    if not text:
        return False
    text_lower = text.lower()
    mechanical_terms = ['hvac', 'mechanical', 'ventilation', 'chiller',
                       'ahu', 'fan', 'duct', 'air conditioning']
    return any(term in text_lower for term in mechanical_terms)


def _is_plumbing(text):
    """Check if text indicates plumbing category"""
    if not text:
        return False
    text_lower = text.lower()
    plumbing_terms = ['plumbing', 'pipe', 'water', 'pump', 'tank',
                     'valve', 'drainage', 'sewage']
    return any(term in text_lower for term in plumbing_terms)


# MEP-specific purchase endpoints with full CRUD
def get_mep_purchases():
    """Get comprehensive MEP purchases data with materials and status"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '')
        category_filter = request.args.get('category', '')
        status_filter = request.args.get('status', '')

        # Get all purchases
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).order_by(desc(Purchase.created_at)).all()

        # Filter for MEP-related purchases with full details
        mep_purchases_full = []
        for purchase in all_purchases:
            # Get materials for this purchase
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids or [])
                )
            ).all()

            # Check if this is an MEP purchase
            # First check if it was created by MEP Supervisor
            is_created_by_mep = False
            if purchase.requested_by:
                requester_lower = purchase.requested_by.lower()
                is_created_by_mep = 'mep' in requester_lower or 'mepsupervisor' in requester_lower

            if purchase.created_by:
                creator_lower = purchase.created_by.lower()
                is_created_by_mep = is_created_by_mep or 'mep' in creator_lower or 'mepsupervisor' in creator_lower

            # Check if this is an MEP purchase: created by MEP supervisor OR has MEP materials/purpose
            is_mep = is_created_by_mep or (_has_mep_materials(materials) or _is_mep_purchase(purchase.purpose)) and not _is_site_supervisor_purchase(purchase)

            if is_mep:
                # Get latest status with full history
                latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)
                status_history = PurchaseStatus.query.filter_by(
                    purchase_id=purchase.purchase_id
                ).order_by(desc(PurchaseStatus.created_at)).all()

                # Get requester details
                requester = User.query.filter_by(user_id=purchase.user_id).first()

                # Calculate totals from materials
                total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)
                total_quantity = sum(m.quantity or 0 for m in materials)

                # Detect MEP category
                mep_category = _detect_mep_category(purchase.purpose, materials)

                # Apply filters
                if category_filter and mep_category != category_filter:
                    continue
                if status_filter and (latest_status.status if latest_status else 'pending') != status_filter:
                    continue
                if search:
                    search_lower = search.lower()
                    if not (search_lower in purchase.purpose.lower() or
                           search_lower in purchase.site_location.lower() or
                           search_lower in (purchase.requested_by or '').lower()):
                        continue

                # Format materials data
                materials_data = []
                for material in materials:
                    materials_data.append({
                        'material_id': material.material_id,
                        'description': material.description,
                        'specification': material.specification,
                        'unit': material.unit,
                        'quantity': material.quantity,
                        'cost': material.cost,
                        'total_cost': (material.cost or 0) * (material.quantity or 0),
                        'category': material.category,
                        'is_mep': _is_mep_material(material),
                        'mep_type': _get_material_mep_category(material)
                    })

                # Format status history
                history_data = []
                for status in status_history:
                    history_data.append({
                        'status_id': status.status_id,
                        'status': status.status,
                        'sender': status.sender,
                        'receiver': status.receiver,
                        'role': status.role,
                        'comments': status.comments,
                        'decision_date': status.decision_date.isoformat() if status.decision_date else None,
                        'created_at': status.created_at.isoformat() if status.created_at else None
                    })

                purchase_data = {
                    'purchase_id': purchase.purchase_id,
                    'user_id': purchase.user_id,
                    'requested_by': purchase.requested_by,
                    'requester_details': {
                        'name': requester.full_name if requester else purchase.requested_by,
                        'email': requester.email if requester else None,
                        'department': requester.department if requester else None
                    },
                    'site_location': purchase.site_location,
                    'date': purchase.date,
                    'project_id': purchase.project_id,
                    'purpose': purchase.purpose,
                    'materials': materials_data,
                    'email_sent': purchase.email_sent,
                    'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                    'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
                    'created_by': purchase.created_by,
                    'current_status': {
                        'status': latest_status.status if latest_status else 'pending',
                        'updated_at': latest_status.created_at.isoformat() if latest_status else None,
                        'updated_by': latest_status.sender if latest_status else None
                    },
                    'status_history': history_data,
                    'mep_category': mep_category,
                    'total_cost': round(total_cost, 2),
                    'total_quantity': total_quantity,
                    'materials_count': len(materials),
                    'can_edit': latest_status.status in ['pending', 'rejected'] if latest_status else True,
                    'can_delete': latest_status.status == 'pending' if latest_status else True
                }

                mep_purchases_full.append(purchase_data)

        # Apply pagination
        total = len(mep_purchases_full)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_purchases = mep_purchases_full[start:end]

        return jsonify({
            'success': True,
            'data': paginated_purchases,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            },
            'filters': {
                'categories': ['electrical', 'mechanical', 'plumbing', 'general'],
                'statuses': ['pending', 'approved', 'rejected', 'in_progress']
            }
        }), 200

    except Exception as e:
        log.error(f"Error fetching MEP purchases: {str(e)}")
        return jsonify({'error': str(e)}), 500


def get_mep_purchase_detail(purchase_id):
    """Get detailed information for a specific MEP purchase"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get the purchase
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).first()

        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        # Get materials
        materials = Material.query.filter(
            and_(
                Material.is_deleted == False,
                Material.material_id.in_(purchase.material_ids or [])
            )
        ).all()

        # Check if this is an MEP purchase
        if not (_has_mep_materials(materials) or _is_mep_purchase(purchase.purpose)):
            return jsonify({'error': 'This is not an MEP-related purchase'}), 403

        # Get full status history
        status_history = PurchaseStatus.query.filter_by(
            purchase_id=purchase_id
        ).order_by(desc(PurchaseStatus.created_at)).all()

        # Get requester details
        requester = User.query.filter_by(user_id=purchase.user_id).first()

        # Format materials with full details
        materials_data = []
        total_cost = 0
        for material in materials:
            mat_cost = (material.cost or 0) * (material.quantity or 0)
            total_cost += mat_cost
            materials_data.append({
                'material_id': material.material_id,
                'description': material.description,
                'specification': material.specification,
                'unit': material.unit,
                'quantity': material.quantity,
                'cost': material.cost,
                'total_cost': mat_cost,
                'category': material.category,
                'vendor': material.vendor,
                'is_mep': _is_mep_material(material),
                'mep_type': _get_material_mep_category(material)
            })

        # Format status history with user details
        history_data = []
        for status in status_history:
            # Try to find user by ID if sender is numeric, otherwise use sender as name
            sender_user = None
            try:
                if status.sender.isdigit():
                    sender_user = User.query.filter_by(user_id=int(status.sender)).first()
                else:
                    # If sender is not numeric, it might be a username or role
                    sender_user = User.query.filter_by(full_name=status.sender).first()
            except (ValueError, AttributeError):
                sender_user = None
            history_data.append({
                'status_id': status.status_id,
                'status': status.status,
                'sender': status.sender,
                'sender_name': sender_user.full_name if sender_user else status.sender,
                'receiver': status.receiver,
                'role': status.role,
                'comments': status.comments,
                'decision_date': status.decision_date.isoformat() if status.decision_date else None,
                'created_at': status.created_at.isoformat() if status.created_at else None
            })

        # Get latest status
        latest_status = status_history[0] if status_history else None

        response_data = {
            'purchase_id': purchase.purchase_id,
            'requested_by': purchase.requested_by,
            'requester_details': {
                'user_id': purchase.user_id,
                'name': requester.full_name if requester else purchase.requested_by,
                'email': requester.email if requester else None,
                'phone': requester.phone if requester else None,
                'department': requester.department if requester else None
            },
            'site_location': purchase.site_location,
            'date': purchase.date,
            'project_id': purchase.project_id,
            'purpose': purchase.purpose,
            'mep_category': _detect_mep_category(purchase.purpose, materials),
            'materials': materials_data,
            'total_cost': round(total_cost, 2),
            'total_quantity': sum(m.quantity or 0 for m in materials),
            'email_sent': purchase.email_sent,
            'current_status': {
                'status': latest_status.status if latest_status else 'pending',
                'updated_at': latest_status.created_at.isoformat() if latest_status else None,
                'updated_by': latest_status.sender if latest_status else None
            },
            'status_history': history_data,
            'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
            'last_modified_at': purchase.last_modified_at.isoformat() if purchase.last_modified_at else None,
            'created_by': purchase.created_by
        }

        return jsonify({'success': True, 'data': response_data}), 200

    except Exception as e:
        log.error(f"Error fetching MEP purchase detail: {str(e)}")
        return jsonify({'error': str(e)}), 500


def update_mep_purchase(purchase_id):
    """Update MEP purchase (only if pending or rejected)"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get the purchase
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).first()

        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        # Check status - can only edit pending or rejected
        latest_status = PurchaseStatus.get_latest_status(purchase_id)
        if latest_status and latest_status.status not in ['pending', 'rejected']:
            return jsonify({'error': f'Cannot edit purchase with status: {latest_status.status}'}), 403

        # Get update data
        data = request.get_json()

        # Update allowed fields
        if 'site_location' in data:
            purchase.site_location = data['site_location']
        if 'purpose' in data:
            purchase.purpose = data['purpose']

        # Update materials if provided
        if 'materials' in data:
            # Update existing materials
            for mat_data in data['materials']:
                if 'material_id' in mat_data:
                    material = Material.query.filter_by(
                        material_id=mat_data['material_id']
                    ).first()
                    if material:
                        if 'quantity' in mat_data:
                            material.quantity = mat_data['quantity']
                        if 'cost' in mat_data:
                            material.cost = mat_data['cost']
                        if 'specification' in mat_data:
                            material.specification = mat_data['specification']

        purchase.last_modified_at = datetime.utcnow()
        purchase.last_modified_by = current_user['username']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Purchase updated successfully',
            'purchase_id': purchase_id
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error updating MEP purchase: {str(e)}")
        return jsonify({'error': str(e)}), 500


def delete_mep_purchase(purchase_id):
    """Delete MEP purchase (soft delete, only if pending)"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get the purchase
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).first()

        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        # Check status - can only delete pending
        latest_status = PurchaseStatus.get_latest_status(purchase_id)
        if latest_status and latest_status.status != 'pending':
            return jsonify({'error': f'Cannot delete purchase with status: {latest_status.status}'}), 403

        # Soft delete
        purchase.is_deleted = True
        purchase.last_modified_at = datetime.utcnow()
        purchase.last_modified_by = current_user['username']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Purchase deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error deleting MEP purchase: {str(e)}")
        return jsonify({'error': str(e)}), 500


def send_mep_to_procurement(purchase_id):
    """Send MEP purchase request to procurement"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get the purchase
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).first()

        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        # Check if already sent
        if purchase.email_sent:
            return jsonify({'error': 'Already sent to procurement'}), 400

        # Get materials
        materials = Material.query.filter(
            and_(
                Material.is_deleted == False,
                Material.material_id.in_(purchase.material_ids or [])
            )
        ).all()

        # Verify it's MEP-related
        if not (_has_mep_materials(materials) or _is_mep_purchase(purchase.purpose)):
            return jsonify({'error': 'This is not an MEP-related purchase'}), 403

        # Update purchase status
        new_status = PurchaseStatus(
            purchase_id=purchase_id,
            status='in_progress',
            sender=current_user['user_id'],
            receiver='procurement',
            role='mepSupervisor',
            comments='Sent to procurement for processing',
            decision_date=datetime.utcnow()
        )
        db.session.add(new_status)

        # Mark as email sent
        purchase.email_sent = True
        purchase.updated_at = datetime.utcnow()

        # TODO: Send actual email notification to procurement team
        # For now, just update the database

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Purchase request sent to procurement successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error sending MEP purchase to procurement: {str(e)}")
        return jsonify({'error': str(e)}), 500


def get_mep_purchase_history(purchase_id):
    """Get detailed history of a specific MEP purchase"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get the purchase
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).first()

        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        # Get status history
        status_history = PurchaseStatus.query.filter_by(
            purchase_id=purchase_id
        ).order_by(desc(PurchaseStatus.created_at)).all()

        # Get action history from purchase_history table
        action_history = PurchaseHistory.query.filter_by(
            purchase_id=purchase_id
        ).order_by(desc(PurchaseHistory.created_at)).all()

        # Combine all history
        all_history = []

        # Add status changes
        for status in status_history:
            # Try to find user by ID if sender is numeric, otherwise use sender as name
            sender_user = None
            try:
                if status.sender.isdigit():
                    sender_user = User.query.filter_by(user_id=int(status.sender)).first()
                else:
                    # If sender is not numeric, it might be a username or role
                    sender_user = User.query.filter_by(full_name=status.sender).first()
            except (ValueError, AttributeError):
                sender_user = None
            all_history.append({
                'type': 'status_change',
                'timestamp': status.created_at.isoformat(),
                'user_id': status.sender,
                'user_name': sender_user.full_name if sender_user else status.sender,
                'role': status.role,
                'action': f"Status changed to {status.status}",
                'details': {
                    'status_id': status.status_id,
                    'status': status.status,
                    'receiver': status.receiver,
                    'comments': status.comments,
                    'decision_date': status.decision_date.isoformat() if status.decision_date else None
                }
            })

        # Add action history
        for action in action_history:
            all_history.append({
                'type': 'action',
                'timestamp': action.created_at.isoformat(),
                'user_name': action.created_by,
                'action': action.action.get('type', 'Unknown action') if action.action else 'Unknown action',
                'details': action.action
            })

        # Sort by timestamp (most recent first)
        all_history.sort(key=lambda x: x['timestamp'], reverse=True)

        return jsonify({
            'success': True,
            'purchase_id': purchase_id,
            'history': all_history
        }), 200

    except Exception as e:
        log.error(f"Error fetching MEP purchase history: {str(e)}")
        return jsonify({'error': str(e)}), 500


def update_mep_purchase_status(purchase_id):
    """Update status of MEP purchase (approve, reject, etc.)"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get the purchase
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).first()

        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        status = data.get('status')
        comments = data.get('comments', '')
        receiver = data.get('receiver', 'procurement')

        if not status:
            return jsonify({'error': 'Status is required'}), 400

        # Create new status entry
        new_status = PurchaseStatus(
            purchase_id=purchase_id,
            status=status,
            sender=current_user['user_id'],
            receiver=receiver,
            role='mepSupervisor',
            comments=comments,
            decision_date=datetime.utcnow()
        )
        db.session.add(new_status)

        # Log action in history
        action_entry = PurchaseHistory(
            purchase_id=purchase_id,
            action={
                'type': 'status_update',
                'data': {
                    'status': status,
                    'comments': comments,
                    'receiver': receiver,
                    'updated_by': current_user['username'],
                    'role': 'mepSupervisor'
                },
                'timestamp': datetime.utcnow().isoformat()
            },
            created_by=current_user['username']
        )
        db.session.add(action_entry)

        # Update purchase timestamp
        purchase.last_modified_at = datetime.utcnow()
        purchase.last_modified_by = current_user['username']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Purchase status updated to {status}',
            'new_status': status
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error updating MEP purchase status: {str(e)}")
        return jsonify({'error': str(e)}), 500


def send_mep_email_notification(purchase_id):
    """Send email notification for MEP purchase"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get the purchase
        purchase = Purchase.query.filter_by(
            purchase_id=purchase_id,
            is_deleted=False
        ).first()

        if not purchase:
            return jsonify({'error': 'Purchase not found'}), 404

        data = request.get_json()
        recipients = data.get('recipients', [])
        message = data.get('message', '')
        subject = data.get('subject', f'MEP Purchase Request #{purchase_id} - Review Required')

        if not recipients:
            return jsonify({'error': 'No recipients specified'}), 400

        # Get materials for email
        materials = Material.query.filter(
            and_(
                Material.is_deleted == False,
                Material.material_id.in_(purchase.material_ids or [])
            )
        ).all()

        # Get project details
        project = Project.query.filter_by(project_id=purchase.project_id, is_deleted=False).first()

        # Prepare email data
        email_data = {
            'purchase_id': purchase.purchase_id,
            'project_name': project.project_name if project else 'N/A',
            'requested_by': purchase.requested_by,
            'site_location': purchase.site_location,
            'purpose': purchase.purpose,
            'date': purchase.date,
            'mep_category': _detect_mep_category(purchase.purpose, materials),
            'materials': [material.to_dict() for material in materials],
            'sender_name': current_user['username'],
            'sender_role': 'MEP Supervisor',
            'custom_message': message,
            'total_cost': sum((m.cost or 0) * (m.quantity or 0) for m in materials)
        }

        # Initialize email service
        from utils.email_service import EmailService
        email_service = EmailService()

        # Send email
        success = email_service.send_purchase_notification_email(
            recipient_emails=recipients,
            subject=subject,
            email_data=email_data
        )

        if success:
            # Log action in history
            action_entry = PurchaseHistory(
                purchase_id=purchase_id,
                action={
                    'type': 'email_sent',
                    'data': {
                        'recipients': recipients,
                        'subject': subject,
                        'sent_by': current_user['username'],
                        'role': 'mepSupervisor'
                    },
                    'timestamp': datetime.utcnow().isoformat()
                },
                created_by=current_user['username']
            )
            db.session.add(action_entry)

            # Update email sent status
            purchase.email_sent = True
            purchase.last_modified_at = datetime.utcnow()
            purchase.last_modified_by = current_user['username']

            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Email notification sent successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to send email notification'}), 500

    except Exception as e:
        db.session.rollback()
        log.error(f"Error sending MEP email notification: {str(e)}")
        return jsonify({'error': str(e)}), 500


def get_mep_analytics_dashboard():
    """Get comprehensive MEP analytics and reporting"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get all purchases
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).all()

        # Filter for MEP purchases
        mep_purchases = []
        for purchase in all_purchases:
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids or [])
                )
            ).all()

            if _has_mep_materials(materials) or _is_mep_purchase(purchase.purpose):
                mep_purchases.append({
                    'purchase': purchase,
                    'materials': materials,
                    'mep_category': _detect_mep_category(purchase.purpose, materials)
                })

        # Calculate analytics
        total_purchases = len(mep_purchases)
        total_value = sum(
            sum((m.cost or 0) * (m.quantity or 0) for m in item['materials'])
            for item in mep_purchases
        )

        # Status breakdown
        status_breakdown = {}
        for item in mep_purchases:
            latest_status = PurchaseStatus.get_latest_status(item['purchase'].purchase_id)
            status = latest_status.status if latest_status else 'pending'
            status_breakdown[status] = status_breakdown.get(status, 0) + 1

        # Category breakdown
        category_breakdown = {}
        for item in mep_purchases:
            category = item['mep_category'] or 'general'
            if category not in category_breakdown:
                category_breakdown[category] = {'count': 0, 'value': 0}
            category_breakdown[category]['count'] += 1
            category_breakdown[category]['value'] += sum(
                (m.cost or 0) * (m.quantity or 0) for m in item['materials']
            )

        # Monthly trends (last 12 months)
        from datetime import datetime, timedelta
        monthly_data = {}
        for i in range(12):
            month_start = datetime.now().replace(day=1) - timedelta(days=30*i)
            month_key = month_start.strftime('%Y-%m')
            monthly_data[month_key] = {'count': 0, 'value': 0}

        for item in mep_purchases:
            if item['purchase'].created_at:
                month_key = item['purchase'].created_at.strftime('%Y-%m')
                if month_key in monthly_data:
                    monthly_data[month_key]['count'] += 1
                    monthly_data[month_key]['value'] += sum(
                        (m.cost or 0) * (m.quantity or 0) for m in item['materials']
                    )

        # Top materials
        material_usage = {}
        for item in mep_purchases:
            for material in item['materials']:
                key = material.description or 'Unknown'
                if key not in material_usage:
                    material_usage[key] = {'count': 0, 'quantity': 0, 'value': 0}
                material_usage[key]['count'] += 1
                material_usage[key]['quantity'] += material.quantity or 0
                material_usage[key]['value'] += (material.cost or 0) * (material.quantity or 0)

        top_materials = sorted(
            material_usage.items(),
            key=lambda x: x[1]['value'],
            reverse=True
        )[:10]

        analytics_data = {
            'summary': {
                'total_purchases': total_purchases,
                'total_value': round(total_value, 2),
                'average_value': round(total_value / total_purchases if total_purchases > 0 else 0, 2)
            },
            'status_breakdown': status_breakdown,
            'category_breakdown': category_breakdown,
            'monthly_trends': monthly_data,
            'top_materials': [{'name': k, **v} for k, v in top_materials]
        }

        return jsonify({'success': True, 'analytics': analytics_data}), 200

    except Exception as e:
        log.error(f"Error fetching MEP analytics: {str(e)}")
        return jsonify({'error': str(e)}), 500


def get_mep_category_breakdown_analysis():
    """Get detailed MEP category breakdown analysis"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Use existing function and enhance it
        breakdown = _get_mep_category_breakdown(current_user['user_id'])

        # Add percentage calculations
        total_count = sum(cat['count'] for cat in breakdown.values())
        total_cost = sum(cat['cost'] for cat in breakdown.values())

        for category in breakdown:
            breakdown[category]['count_percentage'] = round(
                (breakdown[category]['count'] / total_count * 100) if total_count > 0 else 0, 2
            )
            breakdown[category]['cost_percentage'] = round(
                (breakdown[category]['cost'] / total_cost * 100) if total_cost > 0 else 0, 2
            )

        return jsonify({
            'success': True,
            'breakdown': breakdown,
            'totals': {
                'total_count': total_count,
                'total_cost': round(total_cost, 2)
            }
        }), 200

    except Exception as e:
        log.error(f"Error fetching MEP category breakdown: {str(e)}")
        return jsonify({'error': str(e)}), 500


def export_mep_purchases_data():
    """Export MEP purchases data to CSV format"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        # Get export format from query params
        export_format = request.args.get('format', 'csv').lower()

        # Get all MEP purchases
        all_purchases = Purchase.query.filter(Purchase.is_deleted == False).all()

        # Filter for MEP purchases and prepare data
        export_data = []
        for purchase in all_purchases:
            materials = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids or [])
                )
            ).all()

            if _has_mep_materials(materials) or _is_mep_purchase(purchase.purpose):
                latest_status = PurchaseStatus.get_latest_status(purchase.purchase_id)
                total_cost = sum((m.cost or 0) * (m.quantity or 0) for m in materials)

                export_data.append({
                    'Purchase ID': purchase.purchase_id,
                    'Date': purchase.date,
                    'Requested By': purchase.requested_by,
                    'Site Location': purchase.site_location,
                    'Purpose': purchase.purpose,
                    'MEP Category': _detect_mep_category(purchase.purpose, materials),
                    'Status': latest_status.status if latest_status else 'pending',
                    'Total Cost (AED)': round(total_cost, 2),
                    'Materials Count': len(materials),
                    'Email Sent': 'Yes' if purchase.email_sent else 'No',
                    'Created At': purchase.created_at.isoformat() if purchase.created_at else ''
                })

        if export_format == 'json':
            return jsonify({
                'success': True,
                'data': export_data,
                'total_records': len(export_data)
            }), 200
        else:
            # For CSV format, return data that can be converted to CSV on frontend
            return jsonify({
                'success': True,
                'data': export_data,
                'headers': list(export_data[0].keys()) if export_data else [],
                'total_records': len(export_data),
                'export_format': 'csv'
            }), 200

    except Exception as e:
        log.error(f"Error exporting MEP purchases: {str(e)}")
        return jsonify({'error': str(e)}), 500


def bulk_update_mep_purchases():
    """Bulk update multiple MEP purchases"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        purchase_ids = data.get('purchase_ids', [])
        update_data = data.get('update_data', {})

        if not purchase_ids:
            return jsonify({'error': 'No purchase IDs provided'}), 400

        # Validate purchases exist and are MEP-related
        valid_purchases = []
        for purchase_id in purchase_ids:
            purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
            if purchase:
                # Check if it's MEP-related
                materials = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids or [])
                    )
                ).all()

                if _has_mep_materials(materials) or _is_mep_purchase(purchase.purpose):
                    # Check if editable
                    latest_status = PurchaseStatus.get_latest_status(purchase_id)
                    if not latest_status or latest_status.status in ['pending', 'rejected']:
                        valid_purchases.append(purchase)

        if not valid_purchases:
            return jsonify({'error': 'No valid MEP purchases found for update'}), 400

        # Perform bulk update
        updated_count = 0
        for purchase in valid_purchases:
            updated = False

            # Update allowed fields
            if 'status' in update_data:
                # Create status update
                new_status = PurchaseStatus(
                    purchase_id=purchase.purchase_id,
                    status=update_data['status'],
                    sender=current_user['user_id'],
                    receiver=update_data.get('receiver', 'procurement'),
                    role='mepSupervisor',
                    comments=update_data.get('comments', 'Bulk update'),
                    decision_date=datetime.utcnow()
                )
                db.session.add(new_status)
                updated = True

            # Update purchase fields
            for field in ['site_location', 'purpose']:
                if field in update_data:
                    setattr(purchase, field, update_data[field])
                    updated = True

            if updated:
                purchase.last_modified_at = datetime.utcnow()
                purchase.last_modified_by = current_user['username']
                updated_count += 1

                # Log action
                action_entry = PurchaseHistory(
                    purchase_id=purchase.purchase_id,
                    action={
                        'type': 'bulk_update',
                        'data': {
                            'updates': update_data,
                            'updated_by': current_user['username'],
                            'role': 'mepSupervisor'
                        },
                        'timestamp': datetime.utcnow().isoformat()
                    },
                    created_by=current_user['username']
                )
                db.session.add(action_entry)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Successfully updated {updated_count} MEP purchases',
            'updated_count': updated_count
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error in bulk update: {str(e)}")
        return jsonify({'error': str(e)}), 500


def bulk_send_mep_emails():
    """Send bulk email notifications for multiple MEP purchases"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({'error': 'Not logged in'}), 401

        # Verify user is MEP supervisor
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'mepSupervisor':
            return jsonify({'error': 'Access denied. MEP supervisor role required'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        purchase_ids = data.get('purchase_ids', [])
        recipients = data.get('recipients', [])
        subject_template = data.get('subject', 'MEP Purchase Requests - Bulk Notification')
        message = data.get('message', '')

        if not purchase_ids or not recipients:
            return jsonify({'error': 'Purchase IDs and recipients are required'}), 400

        # Initialize email service
        from utils.email_service import EmailService
        email_service = EmailService()

        sent_count = 0
        failed_count = 0

        for purchase_id in purchase_ids:
            try:
                purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
                if not purchase:
                    failed_count += 1
                    continue

                # Get materials
                materials = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids or [])
                    )
                ).all()

                # Check if MEP-related
                if not (_has_mep_materials(materials) or _is_mep_purchase(purchase.purpose)):
                    failed_count += 1
                    continue

                # Get project details
                project = Project.query.filter_by(project_id=purchase.project_id, is_deleted=False).first()

                # Prepare email data
                email_data = {
                    'purchase_id': purchase.purchase_id,
                    'project_name': project.project_name if project else 'N/A',
                    'requested_by': purchase.requested_by,
                    'site_location': purchase.site_location,
                    'purpose': purchase.purpose,
                    'date': purchase.date,
                    'mep_category': _detect_mep_category(purchase.purpose, materials),
                    'materials': [material.to_dict() for material in materials],
                    'sender_name': current_user['username'],
                    'sender_role': 'MEP Supervisor',
                    'custom_message': message,
                    'total_cost': sum((m.cost or 0) * (m.quantity or 0) for m in materials)
                }

                # Send email
                success = email_service.send_purchase_notification_email(
                    recipient_emails=recipients,
                    subject=f"{subject_template} - Purchase #{purchase_id}",
                    email_data=email_data
                )

                if success:
                    # Update email sent status
                    purchase.email_sent = True
                    purchase.last_modified_at = datetime.utcnow()
                    purchase.last_modified_by = current_user['username']

                    # Log action
                    action_entry = PurchaseHistory(
                        purchase_id=purchase_id,
                        action={
                            'type': 'bulk_email_sent',
                            'data': {
                                'recipients': recipients,
                                'subject': subject_template,
                                'sent_by': current_user['username'],
                                'role': 'mepSupervisor'
                            },
                            'timestamp': datetime.utcnow().isoformat()
                        },
                        created_by=current_user['username']
                    )
                    db.session.add(action_entry)
                    sent_count += 1
                else:
                    failed_count += 1

            except Exception as e:
                log.error(f"Error sending email for purchase {purchase_id}: {str(e)}")
                failed_count += 1

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Bulk email operation completed. Sent: {sent_count}, Failed: {failed_count}',
            'sent_count': sent_count,
            'failed_count': failed_count
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error in bulk email: {str(e)}")
        return jsonify({'error': str(e)}), 500