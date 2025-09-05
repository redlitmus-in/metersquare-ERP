from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.technical_director_controller import *

technical_director_routes = Blueprint('technical_director', __name__)

# Technical Director approval workflow routes
@technical_director_routes.route('/tech_approval', methods=['POST'])
@jwt_required
def approval_workflow():
    return technical_director_approval_workflow()

@technical_director_routes.route('/tech_dashboard', methods=['GET'])
@jwt_required
def dashboard():
    return get_technical_director_dashboard()

@technical_director_routes.route('/technical_purchase', methods=['GET'])
@jwt_required
def purchase_requests():
    return get_all_technical_director_purchase_request()
