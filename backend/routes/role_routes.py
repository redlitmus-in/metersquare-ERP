"""
Role management routes
"""

from flask import Blueprint, jsonify
from config.db import db
from models.role import Role
from config.roles_config import ROLE_HIERARCHY as WORKFLOW_ROLES
from config.logging import get_logger

log = get_logger()

role_bp = Blueprint('role', __name__)

@role_bp.route('/api/roles', methods=['GET'])
def get_workflow_roles():
    """
    Get all workflow roles for frontend dropdown
    Returns roles in a format compatible with frontend
    """
    try:
        # Return workflow roles from configuration
        roles = []
        for role_id, role_config in WORKFLOW_ROLES.items():
            # Format role title from camelCase to Title Case
            title = role_id
            if role_id == 'siteSupervisor':
                title = 'Site Supervisor'
            elif role_id == 'mepSupervisor':
                title = 'MEP Supervisor'
            elif role_id == 'projectManager':
                title = 'Project Manager'
            elif role_id == 'technicalDirector':
                title = 'Technical Director'
            else:
                # Capitalize first letter for single words
                title = role_id.capitalize()
            
            roles.append({
                'id': role_id,
                'title': title,
                'description': role_config['description'],
                'tier': role_config['tier'],
                'color': role_config['color'],
                'icon': role_config['icon']
            })
        
        return jsonify({
            'success': True,
            'roles': roles,
            'count': len(roles)
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching roles: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch roles'
        }), 500

@role_bp.route('/api/roles/database', methods=['GET'])
def get_database_roles():
    """
    Get roles from database (for admin purposes)
    """
    try:
        db_roles = Role.query.filter_by(is_deleted=False).all()
        roles = []
        
        for role in db_roles:
            roles.append({
                'role_id': role.role_id,
                'role': role.role,
                'description': role.description,
                'is_active': role.is_active
            })
        
        return jsonify({
            'success': True,
            'roles': roles,
            'count': len(roles)
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching database roles: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch database roles'
        }), 500

@role_bp.route('/api/roles/sync', methods=['POST'])
def sync_workflow_roles():
    """
    Sync workflow roles to database
    This ensures database has all workflow roles defined in configuration
    """
    try:
        synced_count = 0
        updated_count = 0
        
        for role_name, role_config in WORKFLOW_ROLES.items():
            # Check if role exists in database
            existing_role = Role.query.filter_by(role=role_name, is_deleted=False).first()
            
            if not existing_role:
                # Create new role
                new_role = Role(
                    role=role_name,
                    description=role_config['description'],
                    is_active=True,
                    is_deleted=False
                )
                db.session.add(new_role)
                synced_count += 1
                log.info(f"Created new role: {role_name}")
            else:
                # Update existing role description if different
                if existing_role.description != role_config['description']:
                    existing_role.description = role_config['description']
                    updated_count += 1
                    log.info(f"Updated role description: {role_name}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Roles synced successfully. Created: {synced_count}, Updated: {updated_count}',
            'created': synced_count,
            'updated': updated_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        log.error(f"Error syncing roles: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to sync roles: {str(e)}'
        }), 500