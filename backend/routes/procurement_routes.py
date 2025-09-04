from flask import Blueprint
from controllers.procurement_controller import *
from utils.authentication import jwt_required

procurement_routes = Blueprint('procurement_routes', __name__)

@procurement_routes.route('/all_procurement', methods=['GET'])
@jwt_required
def get_all_procurement_route():
    """Get all procurement requests that have been sent via email"""
    return get_all_procurement()

@procurement_routes.route('/dashboard', methods=['GET'])
@jwt_required
def get_procurement_dashboard_route():
    """Get procurement dashboard data"""
    return get_procurement_dashboard()

@procurement_routes.route('/procurement/<int:purchase_id>', methods=['GET'])
@jwt_required
def get_procurement_by_id_route(purchase_id):
    """Get specific procurement request by ID"""
    return get_procurement_by_id(purchase_id)