from flask import Blueprint
from utils.authentication import jwt_required
from controllers.site_supervisor_controller import *

site_supervisor_routes = Blueprint("site_supervisor_routes", __name__)
# Dashboard
@site_supervisor_routes.route('/site_supervisor_dashboard', methods=['GET'])
@jwt_required
def get_site_supervisor_dashboard_route():
    return get_site_supervisor_dashboard()
