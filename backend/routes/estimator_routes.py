from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.estimator_controller import *

# Create blueprint for estimator routes
estimator_routes = Blueprint('estimator_routes', __name__, url_prefix='/api')

# Estimator Dashboard
@estimator_routes.route('/estimator/dashboard', methods=['GET'])
@jwt_required
def estimator_dashboard_route():
    return get_estimator_dashboard()

# PDF Upload and Extraction
@estimator_routes.route('/estimator/upload-pdf', methods=['POST'])
@jwt_required
def upload_and_extract_pdf_route():
    return upload_and_extract_boq_pdf()

# Confirm Extracted BOQ
@estimator_routes.route('/estimator/confirm-boq', methods=['POST'])
@jwt_required
def confirm_extracted_boq_route():
    return confirm_extracted_boq()

# Get dropdown data for estimator
@estimator_routes.route('/estimator/dropdown-data', methods=['GET'])
@jwt_required
def get_estimator_dropdown_data_route():
    return get_estimator_dropdown_data()