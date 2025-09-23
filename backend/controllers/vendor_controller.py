from flask import g, jsonify, request
from datetime import datetime
from models.vendor import Vendor
from config.db import db
from config.logging import get_logger

log = get_logger()

# CREATE - Create new vendor
def create_vendor():
    """Create a new vendor in the system"""
    current_user = g.user
    try:
        data = request.get_json()
        # Validate required fields
        required_fields = ['vendor_name', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} is required'
                }), 400
        # Check if vendor with same email already exists
        existing_vendor = Vendor.query.filter_by(email=data.get('email')).first()
        if existing_vendor:
            return jsonify({
                'status': 'error',
                'message': 'Vendor with this email already exists'
            }), 400

        # Create new vendor
        new_vendor = Vendor(
            vendor_name=data.get('vendor_name'),
            category=data.get('category'),
            contact_person_name=data.get('contact_person_name'),
            email=data.get('email'),
            phone_code=data.get('phone_code'),
            phone=data.get('phone'),
            street_address=data.get('street_address'),
            state=data.get('state'),
            city=data.get('city'),
            country=data.get('country'),
            pin_code=data.get('pin_code'),
            gst_number=data.get('gst_number'),
            created_by=current_user.get('full_name', current_user.get('email'))
        )

        db.session.add(new_vendor)
        db.session.commit()
        return jsonify({
            'status': 'success',
            'message': 'Vendor created successfully',
            'data': new_vendor.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        log.error(f"Error creating vendor: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# READ - Get all vendors
def get_all_vendors():
    """Get all vendors with optional filtering"""
    try:
        # Get query parameters for filtering
        category = request.args.get('category')
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Build query
        query = Vendor.query

        # Apply filters
        if is_active:
            query = query.filter_by(is_deleted=False)

        if category:
            query = query.filter_by(category=category)

        # Pagination
        vendors_paginated = query.order_by(Vendor.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'page': page,
            'per_page': per_page,
            'total': vendors_paginated.total,
            'pages': vendors_paginated.pages,
            'data': [vendor.to_dict() for vendor in vendors_paginated.items]
        }), 200

    except Exception as e:
        log.error(f"Error getting vendors: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# READ - Get single vendor by ID
def get_by_vendor(vendor_id):
    """Get vendor by ID"""
    try:
        vendor = Vendor.query.filter_by(vendor_id=vendor_id,is_deleted=False).first()
        if not vendor:
            return jsonify({
                'status': 'error',
                'data': []
            }), 404

        return jsonify({
            'status': 'success',
            'data': vendor.to_dict()
        }), 200

    except Exception as e:
        log.error(f"Error getting vendor {vendor_id}: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# UPDATE - Update vendor details
def update_vendor(vendor_id):
    """Update vendor information"""
    current_user = g.user

    try:
        data = request.get_json()

        # Find vendor
        vendor = Vendor.query.get(vendor_id)

        if not vendor:
            return jsonify({
                'status': 'error',
                'message': 'Vendor not found'
            }), 404

        if vendor.is_deleted:
            return jsonify({
                'status': 'error',
                'message': 'Cannot update deleted vendor'
            }), 404

        # Check email uniqueness if email is being updated
        if 'email' in data and data['email'] != vendor.email:
            existing_vendor = Vendor.query.filter_by(email=data['email']).first()
            if existing_vendor:
                return jsonify({
                    'status': 'error',
                    'message': 'Email already exists for another vendor'
                }), 400

        # Update vendor fields
        vendor.vendor_name = data.get('vendor_name', vendor.vendor_name)
        vendor.category = data.get('category', vendor.category)
        vendor.contact_person_name = data.get('contact_person_name', vendor.contact_person_name)
        vendor.email = data.get('email', vendor.email)
        vendor.phone_code = data.get('phone_code', vendor.phone_code)
        vendor.phone = data.get('phone', vendor.phone)
        vendor.street_address = data.get('street_address', vendor.street_address)
        vendor.state = data.get('state', vendor.state)
        vendor.city = data.get('city', vendor.city)
        vendor.country = data.get('country', vendor.country)
        vendor.pin_code = data.get('pin_code', vendor.pin_code)
        vendor.gst_number = data.get('gst_number', vendor.gst_number)
        vendor.last_modified_by = current_user.get('full_name', current_user.get('email'))

        db.session.commit()

        log.info(f"Vendor {vendor_id} updated successfully")

        return jsonify({
            'status': 'success',
            'message': 'Vendor updated successfully',
            'data': vendor.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error updating vendor {vendor_id}: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# DELETE - Soft delete vendor
def delete_vendor(vendor_id):
    """Soft delete a vendor"""
    current_user = g.user

    try:
        vendor = Vendor.query.get(vendor_id)

        if not vendor:
            return jsonify({
                'status': 'error',
                'message': 'Vendor not found'
            }), 404

        if vendor.is_deleted:
            return jsonify({
                'status': 'error',
                'message': 'Vendor already deleted'
            }), 400

        # Soft delete
        vendor.is_deleted = True
        vendor.last_modified_by = current_user.get('full_name', current_user.get('email'))

        db.session.commit()

        log.info(f"Vendor {vendor_id} deleted successfully")

        return jsonify({
            'status': 'success',
            'message': 'Vendor deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error deleting vendor {vendor_id}: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# SEARCH - Search vendors
def search_vendors():
    """Search vendors by various criteria"""
    try:
        search_term = request.args.get('q', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        if not search_term:
            return jsonify({
                'status': 'error',
                'message': 'Search term is required'
            }), 400

        # Search in multiple fields
        vendors_query = Vendor.query.filter(
            db.and_(
                Vendor.is_deleted == False,
                db.or_(
                    Vendor.vendor_name.ilike(f'%{search_term}%'),
                    Vendor.email.ilike(f'%{search_term}%'),
                    Vendor.contact_person_name.ilike(f'%{search_term}%'),
                    Vendor.gst_number.ilike(f'%{search_term}%'),
                    Vendor.city.ilike(f'%{search_term}%')
                )
            )
        )

        # Pagination
        vendors_paginated = vendors_query.paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'status': 'success',
            'search_term': search_term,
            'page': page,
            'per_page': per_page,
            'total': vendors_paginated.total,
            'pages': vendors_paginated.pages,
            'data': [vendor.to_dict() for vendor in vendors_paginated.items]
        }), 200

    except Exception as e:
        log.error(f"Error searching vendors: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Get vendors by category
def get_vendors_by_category(category):
    """Get all vendors in a specific category"""
    try:
        vendors = Vendor.query.filter_by(
            category=category,
            is_deleted=False
        ).order_by(Vendor.vendor_name).all()

        return jsonify({
            'status': 'success',
            'category': category,
            'count': len(vendors),
            'data': [vendor.to_dict() for vendor in vendors]
        }), 200

    except Exception as e:
        log.error(f"Error getting vendors by category: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Restore deleted vendor
def restore_vendor(vendor_id):
    """Restore a soft-deleted vendor"""
    current_user = g.user

    try:
        vendor = Vendor.query.get(vendor_id)

        if not vendor:
            return jsonify({
                'status': 'error',
                'message': 'Vendor not found'
            }), 404

        if not vendor.is_deleted:
            return jsonify({
                'status': 'error',
                'message': 'Vendor is not deleted'
            }), 400

        # Restore vendor
        vendor.is_deleted = False
        vendor.last_modified_by = current_user.get('full_name', current_user.get('email'))

        db.session.commit()

        log.info(f"Vendor {vendor_id} restored successfully")

        return jsonify({
            'status': 'success',
            'message': 'Vendor restored successfully',
            'data': vendor.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Error restoring vendor {vendor_id}: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Get vendor statistics
def get_vendor_stats():
    """Get vendor statistics"""
    try:
        total_vendors = Vendor.query.filter_by(is_deleted=False).count()
        deleted_vendors = Vendor.query.filter_by(is_deleted=True).count()

        # Get vendors by category
        categories = db.session.query(
            Vendor.category,
            db.func.count(Vendor.vendor_id)
        ).filter_by(
            is_deleted=False
        ).group_by(
            Vendor.category
        ).all()

        category_stats = [
            {'category': cat or 'Uncategorized', 'count': count}
            for cat, count in categories
        ]

        return jsonify({
            'status': 'success',
            'data': {
                'total_active': total_vendors,
                'total_deleted': deleted_vendors,
                'by_category': category_stats
            }
        }), 200

    except Exception as e:
        log.error(f"Error getting vendor statistics: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500