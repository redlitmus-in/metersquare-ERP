from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.boq_controller import *

# Create blueprint for boq routes
boq_routes = Blueprint('boq_routes', __name__, url_prefix='/api')

# boq Team Approval Workflow
@boq_routes.route('/boq_create', methods=['POST'])
@jwt_required
def create_boq_route():
    return create_boq()

# boq Dashboard
@boq_routes.route('/all_boq', methods=['GET'])
@jwt_required
def get_all_boqs_route():
    return get_all_boqs()

# Get single BOQ by ID
@boq_routes.route('/boq/<int:boq_id>', methods=['GET'])
@jwt_required
def get_boq_id_route(boq_id):
    return get_boq(boq_id)

@boq_routes.route('/update_boq/<int:boq_id>', methods=['PUT'])
@jwt_required
def update_boq_route(boq_id):
    return update_boq(boq_id)

@boq_routes.route('/delete_boq/<int:boq_id>', methods=['GET'])
@jwt_required
def delete_boq_route(boq_id):
    return delete_boq(boq_id)

# Send BOQ Email Notification (Separate API)
@boq_routes.route('/send_boq_email/<int:boq_id>', methods=['GET'])
@jwt_required
def send_boq_email_route(boq_id):
    return send_boq_email(boq_id)


