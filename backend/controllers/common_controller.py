"""
Common Controller
Handles shared functionality across all roles
"""

from flask import g, request, jsonify
from datetime import datetime
from config.db import db
from models.user import User
from models.role import Role
from config.logging import get_logger
from utils.rbac import get_user_permissions

log = get_logger()

def get_current_user_profile():
    """Get current user's profile information"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get full user data from database
        user_obj = User.query.filter_by(
            user_id=user.get("user_id"),
            is_deleted=False
        ).first()
        
        if not user_obj:
            return jsonify({"error": "User not found"}), 404
        
        # Get role information
        role = Role.query.filter_by(
            role_id=user_obj.role_id,
            is_deleted=False
        ).first()
        
        profile = {
            "user_id": user_obj.user_id,
            "email": user_obj.email,
            "full_name": user_obj.full_name,
            "phone": user_obj.phone,
            "role": role.role if role else "unknown",
            "role_description": role.description if role else "",
            "department": user_obj.department,
            "is_active": user_obj.is_active,
            "last_login": user_obj.last_login.isoformat() if user_obj.last_login else None,
            "created_at": user_obj.created_at.isoformat() if user_obj.created_at else None
        }
        
        return jsonify(profile), 200
        
    except Exception as e:
        log.error(f"Error fetching user profile: {str(e)}")
        return jsonify({"error": "Failed to fetch profile"}), 500

def update_profile_info():
    """Update user profile information"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        allowed_fields = ["full_name", "phone", "department"]
        
        # Get user from database
        user_obj = User.query.filter_by(
            user_id=user.get("user_id"),
            is_deleted=False
        ).first()
        
        if not user_obj:
            return jsonify({"error": "User not found"}), 404
        
        # Update allowed fields
        updated_fields = []
        for field in allowed_fields:
            if field in data:
                setattr(user_obj, field, data[field])
                updated_fields.append(field)
        
        if updated_fields:
            user_obj.last_modified_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                "message": "Profile updated successfully",
                "updated_fields": updated_fields
            }), 200
        else:
            return jsonify({"message": "No fields to update"}), 200
            
    except Exception as e:
        db.session.rollback()
        log.error(f"Error updating profile: {str(e)}")
        return jsonify({"error": "Failed to update profile"}), 500

def get_user_notifications():
    """Get user's notifications"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Mock notifications - replace with actual database query
        notifications = [
            {
                "id": 1,
                "title": "New Task Assigned",
                "message": "You have been assigned a new task",
                "type": "task",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": 2,
                "title": "Approval Required",
                "message": "A purchase request requires your approval",
                "type": "approval",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }
        ]
        
        return jsonify({
            "notifications": notifications,
            "unread_count": sum(1 for n in notifications if not n["is_read"])
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching notifications: {str(e)}")
        return jsonify({"error": "Failed to fetch notifications"}), 500

def mark_as_read(notification_id):
    """Mark notification as read"""
    try:
        # Mock implementation - replace with actual database update
        return jsonify({
            "message": "Notification marked as read",
            "notification_id": notification_id
        }), 200
        
    except Exception as e:
        log.error(f"Error marking notification as read: {str(e)}")
        return jsonify({"error": "Failed to mark notification"}), 500

def get_dashboard_by_role():
    """Get role-specific dashboard data"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get user's role
        role = Role.query.filter_by(
            role_id=user.get("role_id"),
            is_deleted=False
        ).first()
        
        if not role:
            return jsonify({"error": "Role not found"}), 404
        
        # Return different dashboard data based on role
        role_name = role.role.lower()
        
        dashboard_data = {
            "role": role_name,
            "widgets": [],
            "quick_actions": [],
            "recent_activity": []
        }
        
        # Customize dashboard based on role
        if role_name == "business_owner":
            dashboard_data["widgets"] = [
                {"type": "kpi", "title": "Revenue", "value": "₹1.5Cr"},
                {"type": "kpi", "title": "Projects", "value": "12"},
                {"type": "chart", "title": "Profit Trend"},
                {"type": "list", "title": "Pending Approvals"}
            ]
            dashboard_data["quick_actions"] = [
                {"label": "View Reports", "action": "reports"},
                {"label": "Approvals", "action": "approvals"}
            ]
        elif role_name == "project_manager":
            dashboard_data["widgets"] = [
                {"type": "kpi", "title": "Active Projects", "value": "5"},
                {"type": "kpi", "title": "Tasks", "value": "23"},
                {"type": "chart", "title": "Project Progress"},
                {"type": "list", "title": "Team Activity"}
            ]
            dashboard_data["quick_actions"] = [
                {"label": "Create Task", "action": "create_task"},
                {"label": "Team Overview", "action": "team"}
            ]
        elif role_name == "purchaser":
            dashboard_data["widgets"] = [
                {"type": "kpi", "title": "Open PRs", "value": "8"},
                {"type": "kpi", "title": "Vendors", "value": "45"},
                {"type": "chart", "title": "Spending Trend"},
                {"type": "list", "title": "Recent Orders"}
            ]
            dashboard_data["quick_actions"] = [
                {"label": "Create PR", "action": "create_pr"},
                {"label": "Vendor List", "action": "vendors"}
            ]
        # Add more role-specific dashboards as needed
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        log.error(f"Error fetching dashboard: {str(e)}")
        return jsonify({"error": "Failed to fetch dashboard"}), 500

def get_assigned_tasks():
    """Get tasks assigned to current user"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Mock tasks - replace with actual database query
        tasks = [
            {
                "id": 1,
                "title": "Review purchase request",
                "description": "Review and approve purchase request #123",
                "status": "pending",
                "priority": "high",
                "due_date": datetime.utcnow().isoformat(),
                "project": "Site A"
            },
            {
                "id": 2,
                "title": "Complete quality check",
                "description": "Perform quality check on delivered materials",
                "status": "in_progress",
                "priority": "medium",
                "due_date": datetime.utcnow().isoformat(),
                "project": "Site B"
            }
        ]
        
        return jsonify({
            "tasks": tasks,
            "total_count": len(tasks),
            "pending_count": sum(1 for t in tasks if t["status"] == "pending")
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching tasks: {str(e)}")
        return jsonify({"error": "Failed to fetch tasks"}), 500

def update_task(task_id):
    """Update task status or details"""
    try:
        data = request.get_json()
        status = data.get("status")
        
        if status not in ["pending", "in_progress", "completed", "cancelled"]:
            return jsonify({"error": "Invalid status"}), 400
        
        # Mock update - replace with actual database update
        return jsonify({
            "message": "Task updated successfully",
            "task_id": task_id,
            "new_status": status
        }), 200
        
    except Exception as e:
        log.error(f"Error updating task: {str(e)}")
        return jsonify({"error": "Failed to update task"}), 500

def get_user_activity():
    """Get user's activity logs"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Mock activity logs - replace with actual database query
        activities = [
            {
                "id": 1,
                "action": "login",
                "description": "User logged in",
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "id": 2,
                "action": "update",
                "description": "Updated profile information",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
        
        return jsonify({
            "activities": activities,
            "total_count": len(activities)
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching activity: {str(e)}")
        return jsonify({"error": "Failed to fetch activity"}), 500

def perform_search():
    """Search across the system based on user permissions"""
    try:
        data = request.get_json()
        query = data.get("query", "")
        search_type = data.get("type", "all")
        
        if not query:
            return jsonify({"error": "Search query required"}), 400
        
        # Mock search results - replace with actual implementation
        results = {
            "projects": [],
            "tasks": [],
            "users": [],
            "documents": []
        }
        
        return jsonify({
            "query": query,
            "results": results,
            "total_count": 0
        }), 200
        
    except Exception as e:
        log.error(f"Error performing search: {str(e)}")
        return jsonify({"error": "Search failed"}), 500

def handle_file_upload():
    """Handle file uploads"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Mock file upload - replace with actual implementation
        return jsonify({
            "message": "File uploaded successfully",
            "filename": file.filename,
            "size": 0,
            "url": f"/uploads/{file.filename}"
        }), 200
        
    except Exception as e:
        log.error(f"Error uploading file: {str(e)}")
        return jsonify({"error": "File upload failed"}), 500

def get_user_reports():
    """Get reports accessible to the user"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Mock reports - customize based on role
        reports = [
            {
                "id": 1,
                "title": "Monthly Summary",
                "type": "summary",
                "generated_at": datetime.utcnow().isoformat()
            },
            {
                "id": 2,
                "title": "Activity Report",
                "type": "activity",
                "generated_at": datetime.utcnow().isoformat()
            }
        ]
        
        return jsonify({
            "reports": reports,
            "total_count": len(reports)
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching reports: {str(e)}")
        return jsonify({"error": "Failed to fetch reports"}), 500

def get_role_help_topics():
    """Get help topics for user's role"""
    try:
        user = g.get("user")
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Mock help topics - customize based on role
        topics = [
            {
                "id": 1,
                "title": "Getting Started",
                "category": "basics",
                "url": "/help/getting-started"
            },
            {
                "id": 2,
                "title": "Using the Dashboard",
                "category": "features",
                "url": "/help/dashboard"
            }
        ]
        
        return jsonify({
            "topics": topics,
            "total_count": len(topics)
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching help topics: {str(e)}")
        return jsonify({"error": "Failed to fetch help"}), 500

def create_ticket():
    """Create a support ticket"""
    try:
        data = request.get_json()
        subject = data.get("subject")
        description = data.get("description")
        priority = data.get("priority", "medium")
        
        if not subject or not description:
            return jsonify({"error": "Subject and description required"}), 400
        
        # Mock ticket creation - replace with actual implementation
        ticket = {
            "ticket_id": "TKT-001",
            "subject": subject,
            "description": description,
            "priority": priority,
            "status": "open",
            "created_by": g.user.get("email"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        return jsonify({
            "message": "Support ticket created successfully",
            "ticket": ticket
        }), 201
        
    except Exception as e:
        log.error(f"Error creating ticket: {str(e)}")
        return jsonify({"error": "Failed to create ticket"}), 500