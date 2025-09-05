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

# Estimation Dashboard
@estimation_routes.route('/estimation_dashboard', methods=['GET'])
@jwt_required
def estimation_dashboard_route():
    return get_estimation_dashboard()

# Get All Estimation Purchase Requests
@estimation_routes.route('/estimation_purchase', methods=['GET'])
@jwt_required
def get_all_estimation_purchase_request_route():
    return get_all_estimation_purchase_request()


