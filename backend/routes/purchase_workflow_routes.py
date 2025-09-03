from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.purchase_controller import *
# Create blueprint for purchase workflow routes
purchase_workflow_routes = Blueprint('purchase_workflow', __name__, url_prefix='/')

# Step 1: Site/MEP Supervisor creates requisition
@purchase_workflow_routes.route('/purchase', methods=['POST'])
@jwt_required
def create_purchase_route():
    return create_purchase_request()

@purchase_workflow_routes.route('/all_purchase', methods=['GET'])
@jwt_required
def get_all_purchase_route():
    return get_all_purchase_request()

@purchase_workflow_routes.route('/purchase/<int:purchase_id>', methods=['GET'])
@jwt_required
def view_purchase_route(purchase_id):
    return get_purchase_request_by_id(purchase_id)


@purchase_workflow_routes.route('/purchase/<int:purchase_id>', methods=['PUT'])
@jwt_required
def update_purchase_request_route(purchase_id):
    return update_purchase_request(purchase_id)

@purchase_workflow_routes.route('/purchase/<int:purchase_id>', methods=['DELETE'])
@jwt_required
def delete_purchase_route(purchase_id):
    return delete_purchase(purchase_id)

@purchase_workflow_routes.route('/upload_file/<int:purchase_id>', methods=['POST'])
@jwt_required
def file_upload_route(purchase_id):
    return file_upload(purchase_id)

@purchase_workflow_routes.route('/purchase_email/<int:purchase_id>', methods=['GET'])
@jwt_required
def send_purchase_request_email_route(purchase_id):
    return send_purchase_request_email(purchase_id)
