from flask import Blueprint
from utils.authentication import jwt_required
from controllers.mep_supervisor_controller import *

mep_supervisor_routes = Blueprint("mep_supervisor_routes", __name__, url_prefix='/api')

# Dashboard - MEP statistics and summary
@mep_supervisor_routes.route('/mep_supervisor_dashboard', methods=['GET'])
@jwt_required
def get_mep_supervisor_dashboard_route():
    """Get MEP supervisor dashboard with analytics"""
    return get_mep_supervisor_dashboard()

# MEP Purchases - comprehensive list with filters
@mep_supervisor_routes.route('/mep_purchases', methods=['GET'])
@jwt_required
def get_mep_purchases_route():
    """Get all MEP-related purchases with filtering and pagination"""
    return get_mep_purchases()

# MEP Purchase Detail - single purchase with full details
@mep_supervisor_routes.route('/mep_purchases/<int:purchase_id>', methods=['GET'])
@jwt_required
def get_mep_purchase_detail_route(purchase_id):
    """Get detailed information for a specific MEP purchase"""
    return get_mep_purchase_detail(purchase_id)

# Update MEP Purchase
@mep_supervisor_routes.route('/mep_purchases/<int:purchase_id>', methods=['PUT'])
@jwt_required
def update_mep_purchase_route(purchase_id):
    """Update MEP purchase (only if pending or rejected)"""
    return update_mep_purchase(purchase_id)

# Delete MEP Purchase
@mep_supervisor_routes.route('/mep_purchases/<int:purchase_id>', methods=['DELETE'])
@jwt_required
def delete_mep_purchase_route(purchase_id):
    """Delete MEP purchase (soft delete, only if pending)"""
    return delete_mep_purchase(purchase_id)

# History Operations
@mep_supervisor_routes.route('/mep_purchase_history/<int:purchase_id>', methods=['GET'])
@jwt_required
def get_mep_purchase_history_route(purchase_id):
    """Get detailed history of a specific MEP purchase"""
    return get_mep_purchase_history(purchase_id)

# Status Operations
@mep_supervisor_routes.route('/mep_purchase_status/<int:purchase_id>', methods=['POST'])
@jwt_required
def update_mep_purchase_status_route(purchase_id):
    """Update status of MEP purchase (approve, reject, etc.)"""
    return update_mep_purchase_status(purchase_id)

# Email Operations
@mep_supervisor_routes.route('/mep_send_email/<int:purchase_id>', methods=['POST'])
@jwt_required
def send_mep_email_notification_route(purchase_id):
    """Send email notification for MEP purchase"""
    return send_mep_email_notification(purchase_id)

@mep_supervisor_routes.route('/mep_send_to_procurement/<int:purchase_id>', methods=['POST'])
@jwt_required
def send_mep_to_procurement_route(purchase_id):
    """Send MEP purchase request to procurement"""
    return send_mep_to_procurement(purchase_id)

# Analysis and Reporting
@mep_supervisor_routes.route('/mep_analytics', methods=['GET'])
@jwt_required
def get_mep_analytics_route():
    """Get comprehensive MEP analytics and reporting"""
    return get_mep_analytics_dashboard()

@mep_supervisor_routes.route('/mep_category_breakdown', methods=['GET'])
@jwt_required
def get_mep_category_breakdown_route():
    """Get MEP category breakdown analysis"""
    return get_mep_category_breakdown_analysis()

@mep_supervisor_routes.route('/mep_export_purchases', methods=['GET'])
@jwt_required
def export_mep_purchases_route():
    """Export MEP purchases data to CSV/Excel"""
    return export_mep_purchases_data()

# Bulk Operations
@mep_supervisor_routes.route('/mep_bulk_update', methods=['POST'])
@jwt_required
def bulk_update_mep_purchases_route():
    """Bulk update multiple MEP purchases"""
    return bulk_update_mep_purchases()

@mep_supervisor_routes.route('/mep_bulk_email', methods=['POST'])
@jwt_required
def bulk_send_mep_emails_route():
    """Send bulk email notifications for multiple MEP purchases"""
    return bulk_send_mep_emails()