"""
Common routes accessible by multiple roles
Shared functionality across the ERP system
"""

from flask import Blueprint, g
from utils.authentication import jwt_required
from utils.rbac import get_user_permissions
from controllers.common_controller import *

common_routes = Blueprint("common_routes", __name__, url_prefix="/api/common")

# User Profile
@common_routes.route('/profile', methods=['GET'])
@jwt_required
def get_user_profile():
    """Get current user's profile"""
    return get_current_user_profile()

@common_routes.route('/profile/update', methods=['PUT'])
@jwt_required
def update_user_profile():
    """Update user profile information"""
    return update_profile_info()

# Permissions
@common_routes.route('/permissions', methods=['GET'])
@jwt_required
def get_my_permissions():
    """Get current user's permissions"""
    user = g.get("user")
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    permissions = get_user_permissions(user.get("user_id"))
    return jsonify({
        "permissions": permissions,
        "role": user.get("role", "user")
    }), 200

# Notifications
@common_routes.route('/notifications', methods=['GET'])
@jwt_required
def get_notifications():
    """Get user's notifications"""
    return get_user_notifications()

@common_routes.route('/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required
def mark_notification_read(notification_id):
    """Mark notification as read"""
    return mark_as_read(notification_id)

# Dashboard
@common_routes.route('/dashboard', methods=['GET'])
@jwt_required
def get_role_dashboard():
    """Get role-specific dashboard"""
    return get_dashboard_by_role()

# Tasks
@common_routes.route('/tasks/my', methods=['GET'])
@jwt_required
def get_my_tasks():
    """Get tasks assigned to current user"""
    return get_assigned_tasks()

@common_routes.route('/tasks/<int:task_id>/update', methods=['PUT'])
@jwt_required
def update_task_status(task_id):
    """Update task status"""
    return update_task(task_id)

# Activity Logs
@common_routes.route('/activity/my', methods=['GET'])
@jwt_required
def get_my_activity():
    """Get user's activity logs"""
    return get_user_activity()

# Search
@common_routes.route('/search', methods=['POST'])
@jwt_required
def search_system():
    """Search across the system based on user permissions"""
    return perform_search()

# File Uploads
@common_routes.route('/upload', methods=['POST'])
@jwt_required
def upload_file():
    """Upload files (documents, images, etc.)"""
    return handle_file_upload()

# Reports (Generic)
@common_routes.route('/reports/my', methods=['GET'])
@jwt_required
def get_my_reports():
    """Get reports accessible to the user"""
    return get_user_reports()

# Help and Support
@common_routes.route('/help/topics', methods=['GET'])
@jwt_required
def get_help_topics():
    """Get help topics for user's role"""
    return get_role_help_topics()

@common_routes.route('/support/ticket', methods=['POST'])
@jwt_required
def create_support_ticket():
    """Create a support ticket"""
    return create_ticket()