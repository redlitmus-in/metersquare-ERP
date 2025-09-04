"""
Procurement/Purchaser specific routes
Procurement and vendor management operations
"""

from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.project_manager_controller import *

project_manager_routes = Blueprint('project_manager_routes', __name__)

# Purchase Requests
@project_manager_routes.route('/requests', methods=['POST'])
@jwt_required
def purchase_approval_route():
    return purchase_approval()

# Project Manager Approval Workflow
@project_manager_routes.route('/pm_approval', methods=['POST'])
@jwt_required
def pm_approval_workflow_route():
    return pm_approval_workflow()

# Get Purchase with Status Information
@project_manager_routes.route('/purchase_status/<int:purchase_id>', methods=['GET'])
@jwt_required
def get_purchase_with_status_route(purchase_id):
    return get_purchase_with_status(purchase_id)

@project_manager_routes.route('/check_pm_approval/<int:purchase_id>', methods=['GET'])
@jwt_required
def check_pm_approval_status_route(purchase_id):
    return check_project_manager_approval_status(purchase_id)