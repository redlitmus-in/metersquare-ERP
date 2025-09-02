"""
Project Manager specific routes
Project coordination and mid-range approvals
"""

from flask import Blueprint
from utils.authentication import jwt_required
from utils.rbac import role_required, approval_limit_check
from controllers.project_controller import *

project_routes = Blueprint("project_routes", __name__, url_prefix="/api/projects")

# Project Management
@project_routes.route('/list', methods=['GET'])
@jwt_required
@role_required(['projectManager', 'businessOwner'])
def list_projects():
    """Get all projects managed by the user"""
    return get_managed_projects()

@project_routes.route('/create', methods=['POST'])
@jwt_required
@role_required(['projectManager', 'businessOwner'])
def create_new_project():
    """Create a new project"""
    return create_project()

@project_routes.route('/<int:project_id>', methods=['GET'])
@jwt_required
@role_required(['projectManager', 'businessOwner'])
def get_project_details(project_id):
    """Get detailed project information"""
    return get_project(project_id)

@project_routes.route('/<int:project_id>/update', methods=['PUT'])
@jwt_required
@role_required(['projectManager', 'businessOwner'])
def update_project_info(project_id):
    """Update project information"""
    return update_project(project_id)

# Task Management
@project_routes.route('/<int:project_id>/tasks', methods=['GET'])
@jwt_required
@role_required(['projectManager', 'businessOwner'])
def get_project_tasks(project_id):
    """Get all tasks for a project"""
    return get_tasks(project_id)

@project_routes.route('/<int:project_id>/tasks/assign', methods=['POST'])
@jwt_required
@role_required(['projectManager'])
def assign_task():
    """Assign tasks to team members"""
    return assign_project_task()

# Team Coordination
@project_routes.route('/team/overview', methods=['GET'])
@jwt_required
@role_required(['projectManager'])
def get_team_overview():
    """Get team performance and workload"""
    return team_overview()

@project_routes.route('/team/coordinate', methods=['POST'])
@jwt_required
@role_required(['projectManager'])
def coordinate_teams():
    """Coordinate between different teams"""
    return coordinate_team_activities()

# Mid-Range Approvals (₹10,000 - ₹50,000)
@project_routes.route('/approvals/mid-range', methods=['GET'])
@jwt_required
@role_required(['projectManager'])
def get_mid_range_approvals():
    """Get pending mid-range approval requests"""
    return get_pending_mid_range_approvals()

@project_routes.route('/approvals/mid-range/<int:request_id>', methods=['POST'])
@jwt_required
@role_required(['projectManager'])
@approval_limit_check(50000)
def approve_mid_range_request(request_id, **kwargs):
    """Approve or reject mid-range requests"""
    return process_mid_range_approval(request_id)

# Material Requisitions
@project_routes.route('/materials/requests', methods=['GET'])
@jwt_required
@role_required(['projectManager'])
def get_material_requests():
    """Get all material requisition requests"""
    return get_material_requisitions()

@project_routes.route('/materials/approve/<int:request_id>', methods=['POST'])
@jwt_required
@role_required(['projectManager'])
def approve_material_request(request_id):
    """Approve material requisition"""
    return approve_material_requisition(request_id)

# Reports and Analytics
@project_routes.route('/reports/status', methods=['GET'])
@jwt_required
@role_required(['projectManager', 'businessOwner'])
def get_project_status_report():
    """Get project status reports"""
    return generate_status_report()

@project_routes.route('/analytics/performance', methods=['GET'])
@jwt_required
@role_required(['projectManager', 'businessOwner'])
def get_performance_analytics():
    """Get project performance analytics"""
    return project_performance_analytics()

# Timesheet Approvals
@project_routes.route('/timesheets/pending', methods=['GET'])
@jwt_required
@role_required(['projectManager'])
def get_pending_timesheets():
    """Get pending timesheet approvals"""
    return get_timesheets_for_approval()

@project_routes.route('/timesheets/approve/<int:timesheet_id>', methods=['POST'])
@jwt_required
@role_required(['projectManager'])
def approve_timesheet(timesheet_id):
    """Approve team member timesheets"""
    return process_timesheet_approval(timesheet_id)