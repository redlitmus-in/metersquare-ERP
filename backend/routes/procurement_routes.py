from flask import Blueprint
from controllers.procurement_controller import *
from utils.authentication import jwt_required

procurement_routes = Blueprint('procurement_routes', __name__)

@procurement_routes.route('/all_procurement', methods=['GET'])
@jwt_required
def get_all_procurement_route():
    """Get all procurement requests that have been sent via email"""
    return get_all_procurement()

@procurement_routes.route('/procurement/dashboard', methods=['GET'])
@jwt_required
def get_procurement_dashboard_route():
    """Get procurement dashboard data"""
    return get_procurement_dashboard()