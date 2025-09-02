"""
Role-Based Access Control (RBAC) middleware for MeterSquare ERP
Provides decorators for role and permission-based access control
"""

from functools import wraps
from flask import g, jsonify, current_app
import jwt
from models.user import User
from models.role import Role
from config.db import db
from config.logging import get_logger

log = get_logger()

def get_current_user():
    """Get the current authenticated user from g object"""
    return g.get("user")

def get_user_role(role_id):
    """Get role name by role_id"""
    try:
        role = Role.query.filter_by(role_id=role_id, is_deleted=False).first()
        return role.role if role else None
    except Exception as e:
        log.error(f"Error fetching role: {str(e)}")
        return None

def role_required(allowed_roles):
    """
    Decorator to check if user has one of the allowed roles
    Usage: @role_required(['business_owner', 'project_manager'])
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            # Get user's role
            user_role = get_user_role(user.get("role_id"))
            
            if not user_role:
                return jsonify({"error": "User role not found"}), 403
            
            # Check if user's role is in allowed roles (case insensitive)
            allowed_roles_lower = [r.lower() for r in allowed_roles]
            if user_role.lower() not in allowed_roles_lower:
                return jsonify({
                    "error": "Insufficient permissions",
                    "required_roles": allowed_roles,
                    "user_role": user_role
                }), 403
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def permission_required(required_permission):
    """
    Decorator to check if user has a specific permission
    Usage: @permission_required('approve_purchase')
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            # Get user's role and permissions
            role = Role.query.filter_by(role_id=user.get("role_id"), is_deleted=False).first()
            
            if not role:
                return jsonify({"error": "User role not found"}), 403
            
            # Check permissions from role's JSONB field
            permissions = role.permissions if role.permissions else []
            if isinstance(permissions, dict):
                permissions = permissions.get('permissions', [])
            
            if required_permission not in permissions:
                return jsonify({
                    "error": "Permission denied",
                    "required_permission": required_permission
                }), 403
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def approval_limit_check(amount):
    """
    Decorator to check if user's role can approve the specified amount
    Usage: @approval_limit_check(50000)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            # Get user's role
            role = Role.query.filter_by(role_id=user.get("role_id"), is_deleted=False).first()
            
            if not role:
                return jsonify({"error": "User role not found"}), 403
            
            # Check approval limit from role configuration
            from config.roles_config import ROLE_HIERARCHY
            
            user_role = role.role.lower()
            role_config = ROLE_HIERARCHY.get(user_role, {})
            approval_limit = role_config.get('approval_limit')
            
            # If approval_limit is None, user can approve any amount
            if approval_limit is not None and amount > approval_limit:
                return jsonify({
                    "error": "Amount exceeds approval limit",
                    "requested_amount": amount,
                    "approval_limit": approval_limit
                }), 403
            
            # Add amount to kwargs for use in the function
            kwargs['approval_amount'] = amount
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def department_required(required_department):
    """
    Decorator to check if user belongs to a specific department
    Usage: @department_required('procurement')
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            # Get full user data with department
            user_obj = User.query.filter_by(
                user_id=user.get("user_id"), 
                is_deleted=False
            ).first()
            
            if not user_obj:
                return jsonify({"error": "User not found"}), 404
            
            # Map workflow roles to departments
            role_to_department = {
                'siteSupervisor': 'operations',
                'mepSupervisor': 'operations',
                'procurement': 'procurement',
                'projectManager': 'management',
                'design': 'technical',
                'estimation': 'technical',
                'accounts': 'finance',
                'technicalDirector': 'executive'
            }
            
            user_role = get_user_role(user.get("role_id"))
            user_department = role_to_department.get(user_role.lower(), 'general')
            
            if user_department != required_department.lower():
                return jsonify({
                    "error": "Department access denied",
                    "required_department": required_department,
                    "user_department": user_department
                }), 403
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def multi_role_required(role_groups):
    """
    Decorator to check if user has any role from multiple groups
    Usage: @multi_role_required({
        'management': ['business_owner', 'project_manager'],
        'operations': ['factory_supervisor', 'site_engineer']
    })
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            
            user_role = get_user_role(user.get("role_id"))
            
            if not user_role:
                return jsonify({"error": "User role not found"}), 403
            
            # Check if user's role is in any of the role groups
            user_role_lower = user_role.lower()
            for group_name, roles in role_groups.items():
                roles_lower = [r.lower() for r in roles]
                if user_role_lower in roles_lower:
                    kwargs['role_group'] = group_name
                    return func(*args, **kwargs)
            
            return jsonify({
                "error": "Insufficient permissions",
                "required_role_groups": role_groups,
                "user_role": user_role
            }), 403
        return wrapper
    return decorator

def get_user_permissions(user_id):
    """
    Get all permissions for a user based on their role
    """
    try:
        user = User.query.filter_by(user_id=user_id, is_deleted=False).first()
        if not user:
            return []
        
        role = Role.query.filter_by(role_id=user.role_id, is_deleted=False).first()
        if not role:
            return []
        
        permissions = role.permissions if role.permissions else []
        if isinstance(permissions, dict):
            permissions = permissions.get('permissions', [])
        
        return permissions
    except Exception as e:
        log.error(f"Error fetching user permissions: {str(e)}")
        return []

def has_permission(user_id, permission):
    """
    Check if a user has a specific permission
    """
    permissions = get_user_permissions(user_id)
    return permission in permissions

def get_role_hierarchy_level(role_name):
    """
    Get the hierarchy level of a role for approval chains
    """
    from config.roles_config import ROLE_HIERARCHY
    
    role_config = ROLE_HIERARCHY.get(role_name.lower(), {})
    return role_config.get('level', 999)  # Return high number if not found

def can_approve_for_role(approver_role, requester_role):
    """
    Check if approver_role can approve requests from requester_role
    """
    approver_level = get_role_hierarchy_level(approver_role)
    requester_level = get_role_hierarchy_level(requester_role)
    
    # Lower level number means higher authority
    return approver_level < requester_level