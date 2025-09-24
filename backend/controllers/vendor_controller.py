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