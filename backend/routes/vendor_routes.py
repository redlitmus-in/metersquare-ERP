from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.vendor_controller import *

vendor_routes = Blueprint("vendor_routes", __name__, url_prefix='/api')

# Create new vendor workflow (Project Manager initiates)
@vendor_routes.route('/create_vendor', methods=['POST'])
@jwt_required
def create_vendor_route():
    return create_vendor()

# Design team submits inputs
@vendor_routes.route('/all_vendor', methods=['GET'])
@jwt_required
def get_all_vendors_route():
    return get_all_vendors()

# Procurement submits vendor quotations
@vendor_routes.route('/vendor/<int:workflow_id>', methods=['GET'])
@jwt_required
def get_by_vendor_route(workflow_id):
    return get_by_vendor(workflow_id)

# Estimation vendor check
@vendor_routes.route('/update_vendor/<int:workflow_id>', methods=['PUT'])
@jwt_required
def update_vendor_route(workflow_id):
    return update_vendor(workflow_id)

# Project Manager approval (PM FLAG)
@vendor_routes.route('/delete_vendor/<int:workflow_id>', methods=['DELETE'])
@jwt_required
def delete_vendor_route(workflow_id):
    return delete_vendor(workflow_id)