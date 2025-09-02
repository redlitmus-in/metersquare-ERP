"""
Business Owner specific routes
High-level strategic operations and approvals
"""

from flask import Blueprint
from utils.authentication import jwt_required
from utils.rbac import role_required, approval_limit_check
from controllers.business_controller import *

business_routes = Blueprint("business_routes", __name__, url_prefix="/api/business")

# Dashboard and Overview
@business_routes.route('/dashboard', methods=['GET'])
@jwt_required
@role_required(['businessOwner'])
def get_executive_dashboard():
    """Get executive dashboard with KPIs and metrics"""
    return executive_dashboard()

@business_routes.route('/kpis', methods=['GET'])
@jwt_required
@role_required(['businessOwner'])
def get_kpis():
    """Get key performance indicators"""
    return get_business_kpis()

# High-Value Approvals
@business_routes.route('/approvals/high-value', methods=['GET'])
@jwt_required
@role_required(['businessOwner'])
def get_high_value_approvals():
    """Get all pending high-value approvals (>₹50,000)"""
    return get_pending_high_value_approvals()

@business_routes.route('/approvals/high-value/<int:request_id>', methods=['POST'])
@jwt_required
@role_required(['businessOwner'])
def approve_high_value_request(request_id):
    """Approve or reject a high-value request"""
    return process_high_value_approval(request_id)

# Budget Management
@business_routes.route('/budgets', methods=['GET'])
@jwt_required
@role_required(['businessOwner'])
def get_budgets():
    """Get all project budgets"""
    return get_all_budgets()

@business_routes.route('/budgets/<int:project_id>', methods=['PUT'])
@jwt_required
@role_required(['businessOwner'])
def update_budget(project_id):
    """Update project budget allocation"""
    return update_project_budget(project_id)

# Strategic Planning
@business_routes.route('/projects/strategic', methods=['GET'])
@jwt_required
@role_required(['businessOwner'])
def get_strategic_projects():
    """Get strategic projects overview"""
    return get_strategic_projects_overview()

@business_routes.route('/reports/financial', methods=['GET'])
@jwt_required
@role_required(['businessOwner'])
def get_financial_reports():
    """Get comprehensive financial reports"""
    return generate_financial_reports()

# Organization Management
@business_routes.route('/organization/overview', methods=['GET'])
@jwt_required
@role_required(['businessOwner'])
def get_organization_overview():
    """Get organization structure and performance"""
    return organization_overview()

@business_routes.route('/decisions/override', methods=['POST'])
@jwt_required
@role_required(['businessOwner'])
def override_decision():
    """Override any decision in the system"""
    return override_system_decision()