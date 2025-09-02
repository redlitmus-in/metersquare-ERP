"""
Procurement/Purchaser specific routes
Procurement and vendor management operations
"""

from flask import Blueprint
from utils.authentication import jwt_required
from utils.rbac import role_required, approval_limit_check, department_required
from controllers.procurement_controller import *

procurement_routes = Blueprint("procurement_routes", __name__, url_prefix="/api/procurement")

# Purchase Requests
@procurement_routes.route('/requests', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'projectManager', 'businessOwner'])
def get_purchase_requests():
    """Get all purchase requests"""
    return get_all_purchase_requests()

@procurement_routes.route('/requests/create', methods=['POST'])
@jwt_required
@role_required(['purchaseTeam', 'siteEngineer', 'factorySupervisor'])
def create_purchase_request():
    """Create a new purchase request"""
    return create_new_purchase_request()

@procurement_routes.route('/requests/<int:request_id>', methods=['GET'])
@jwt_required
@department_required('procurement')
def get_purchase_request_details(request_id):
    """Get detailed purchase request information"""
    return get_purchase_request(request_id)

# Small Purchase Approvals (Under ₹10,000)
@procurement_routes.route('/approvals/small', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam'])
def get_small_purchase_approvals():
    """Get pending small purchase approvals"""
    return get_pending_small_purchases()

@procurement_routes.route('/approvals/small/<int:request_id>', methods=['POST'])
@jwt_required
@role_required(['purchaseTeam'])
@approval_limit_check(10000)
def approve_small_purchase(request_id, **kwargs):
    """Approve small purchases under ₹10,000"""
    return process_small_purchase_approval(request_id)

# Vendor Management
@procurement_routes.route('/vendors', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'vendorManagement'])
def get_vendors_list():
    """Get all vendors"""
    return get_all_vendors()

@procurement_routes.route('/vendors/create', methods=['POST'])
@jwt_required
@role_required(['purchaseTeam', 'vendorManagement'])
def create_new_vendor():
    """Register a new vendor"""
    return create_vendor()

@procurement_routes.route('/vendors/<int:vendor_id>', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'vendorManagement'])
def get_vendor_details(vendor_id):
    """Get vendor details"""
    return get_vendor(vendor_id)

@procurement_routes.route('/vendors/<int:vendor_id>/evaluate', methods=['POST'])
@jwt_required
@role_required(['purchaseTeam', 'vendorManagement'])
def evaluate_vendor_performance(vendor_id):
    """Evaluate vendor performance"""
    return evaluate_vendor(vendor_id)

# Quotations and RFQ
@procurement_routes.route('/quotations', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'projectManager'])
def get_quotations():
    """Get all vendor quotations"""
    return get_all_quotations()

@procurement_routes.route('/quotations/create', methods=['POST'])
@jwt_required
@role_required(['purchaseTeam'])
def create_quotation_request():
    """Create RFQ (Request for Quotation)"""
    return create_rfq()

@procurement_routes.route('/quotations/<int:quotation_id>/compare', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'projectManager'])
def compare_quotations(quotation_id):
    """Compare vendor quotations"""
    return compare_vendor_quotations(quotation_id)

# Purchase Orders
@procurement_routes.route('/orders', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'accounts'])
def get_purchase_orders():
    """Get all purchase orders"""
    return get_all_purchase_orders()

@procurement_routes.route('/orders/create', methods=['POST'])
@jwt_required
@role_required(['purchaseTeam'])
def create_purchase_order():
    """Create a purchase order"""
    return create_new_purchase_order()

@procurement_routes.route('/orders/<int:order_id>/track', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'projectManager'])
def track_purchase_order(order_id):
    """Track purchase order delivery status"""
    return track_order_delivery(order_id)

# Deliveries
@procurement_routes.route('/deliveries', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'siteEngineer', 'factorySupervisor'])
def get_deliveries():
    """Get all delivery records"""
    return get_all_deliveries()

@procurement_routes.route('/deliveries/<int:delivery_id>/confirm', methods=['POST'])
@jwt_required
@role_required(['purchaseTeam', 'siteEngineer', 'factorySupervisor'])
def confirm_delivery(delivery_id):
    """Confirm delivery receipt"""
    return confirm_delivery_receipt(delivery_id)

# Reports
@procurement_routes.route('/reports/spending', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'projectManager', 'businessOwner'])
def get_spending_report():
    """Get procurement spending report"""
    return generate_spending_report()

@procurement_routes.route('/reports/vendor-performance', methods=['GET'])
@jwt_required
@role_required(['purchaseTeam', 'vendorManagement'])
def get_vendor_performance_report():
    """Get vendor performance report"""
    return generate_vendor_performance_report()