from flask import Blueprint
from controllers.auth_controller import jwt_required
from controllers.account_controller import *

# Create blueprint for account routes
account_routes = Blueprint('account', __name__)

# Payment Transaction Routes
@account_routes.route('/payments/process', methods=['POST'])
@jwt_required
def process_payment_route():
    return process_payment_transaction()

@account_routes.route('/payments/approve', methods=['POST'])
@jwt_required
def approve_payment_route():
    return approve_payment_transaction()

@account_routes.route('/payments', methods=['GET'])
# url this type also used : payments?page=1&per_page=10&status=pending&purchase_id=123&project_id=45&start_date=2024-01-01&end_date=2024-01-31
@jwt_required
def get_payments_route():
    return get_payment_transactions()

# Acknowledgement Routes
@account_routes.route('/acknowledgements', methods=['POST'])
@jwt_required
def create_acknowledgement_route():
    return create_acknowledgement()

@account_routes.route('/acknowledgements', methods=['GET'])
@jwt_required
def get_acknowledgements_route():
    return get_acknowledgements()

# Financial Management Routes
@account_routes.route('/financial_summary', methods=['GET'])
@jwt_required
def financial_summary_route():
    return get_financial_summary()

@account_routes.route('/pending_approvals', methods=['GET'])
@jwt_required
def pending_approvals_route():
    return get_pending_approvals()

@account_routes.route('/account_dashboard', methods=['GET'])
@jwt_required
def account_dashboard_route():
    return account_dashboard()

# Account Purchase Status Routes
@account_routes.route('/account_purchase', methods=['GET'])
@jwt_required
def account_purchase_route():
    return account_purchase()
