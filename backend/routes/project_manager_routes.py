"""
Procurement/Purchaser specific routes
Procurement and vendor management operations
"""

from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.project_manager_controller import *

project_manager_routes = Blueprint('project_manager_routes', __name__)

# Project Manager Approval Workflow
@project_manager_routes.route('/pm_approval', methods=['POST'])
@jwt_required
def pm_approval_workflow_route():
    return pm_approval_workflow()

# Get Procurement Approved Purchases
@project_manager_routes.route('/projectmanger_purchases', methods=['GET'])
@jwt_required
def get_procurement_approved_purchases_route():
    return get_procurement_approved_purchases()
# Get Specific Purchase Status Details
@project_manager_routes.route('/purchase_status/<int:purchase_id>', methods=['GET'])
@jwt_required
def get_purchase_status_details_route(purchase_id):
    return get_purchase_status_details(purchase_id)

