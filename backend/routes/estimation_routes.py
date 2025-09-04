from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.estimation_controller import *

# Create blueprint for estimation routes
estimation_routes = Blueprint('estimation_routes', __name__)

# Estimation Team Approval Workflow
@estimation_routes.route('/estimation_approval', methods=['POST'])
@jwt_required
def estimation_approval_workflow_route():
    return estimation_approval_workflow()

# Get Purchase with Status Information
@estimation_routes.route('/purchase_with_status/<int:purchase_id>', methods=['GET'])
@jwt_required
def get_purchase_with_status_route(purchase_id):
    return get_purchase_with_status(purchase_id)

# Check Estimation Approval Status
@estimation_routes.route('/check_estimation_approval/<int:purchase_id>', methods=['GET'])
@jwt_required
def check_estimation_approval_status_route(purchase_id):
    return check_estimation_approval_status(purchase_id)
