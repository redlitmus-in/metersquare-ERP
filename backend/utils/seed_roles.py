"""
Seed script to populate ERP-specific roles in the database
Run this script to initialize roles for MeterSquare ERP
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from config.db import db
from models.role import Role
from models.user import User
from config.roles_config import ROLE_HIERARCHY, get_role_department
# Password generation not needed - using OTP-only authentication
from app import create_app

def seed_roles():
    """Insert ERP-specific roles into the database"""
    
    app = create_app()
    with app.app_context():
        print("Starting role seeding process...")
        
        roles_created = 0
        roles_updated = 0
        
        for role_key, role_config in ROLE_HIERARCHY.items():
            # Check if role exists
            existing_role = Role.query.filter(
                db.func.lower(Role.role) == role_key.lower(),
                Role.is_deleted == False
            ).first()
            
            if existing_role:
                # Update existing role
                existing_role.description = role_config.get('description', '')
                existing_role.permissions = {
                    'permissions': role_config.get('permissions', []),
                    'approval_limit': role_config.get('approval_limit'),
                    'tier': role_config.get('tier'),
                    'level': role_config.get('level')
                }
                existing_role.is_active = True
                existing_role.last_modified_at = datetime.utcnow()
                roles_updated += 1
                print(f"Updated role: {role_key}")
            else:
                # Create new role
                new_role = Role(
                    role=role_key,
                    description=role_config.get('description', ''),
                    permissions={
                        'permissions': role_config.get('permissions', []),
                        'approval_limit': role_config.get('approval_limit'),
                        'tier': role_config.get('tier'),
                        'level': role_config.get('level')
                    },
                    is_active=True,
                    is_deleted=False,
                    created_at=datetime.utcnow()
                )
                db.session.add(new_role)
                roles_created += 1
                print(f"Created role: {role_key}")
        
        try:
            db.session.commit()
            print(f"\n[SUCCESS] Role seeding completed successfully!")
            print(f"   - Roles created: {roles_created}")
            print(f"   - Roles updated: {roles_updated}")
        except Exception as e:
            db.session.rollback()
            print(f"\n[ERROR] Error during role seeding: {str(e)}")
            return False
        
        return True

def seed_test_users():
    """Create test users for each workflow role (for development/testing)"""
    
    app = create_app()
    with app.app_context():
        print("\nStarting test user creation...")
        
        test_users = [
            {
                'email': 'site.supervisor@metersquare.com',
                'full_name': 'Site Supervisor',
                'role': 'siteSupervisor',
                'phone': '9876543210'
            },
            {
                'email': 'mep.supervisor@metersquare.com',
                'full_name': 'MEP Supervisor',
                'role': 'mepSupervisor',
                'phone': '9876543211'
            },
            {
                'email': 'procurement@metersquare.com',
                'full_name': 'Procurement Team',
                'role': 'procurement',
                'phone': '9876543212'
            },
            {
                'email': 'pm@metersquare.com',
                'full_name': 'Project Manager',
                'role': 'projectManager',
                'phone': '9876543213'
            },
            {
                'email': 'design@metersquare.com',
                'full_name': 'Design Team',
                'role': 'design',
                'phone': '9876543214'
            },
            {
                'email': 'estimation@metersquare.com',
                'full_name': 'Estimation Team',
                'role': 'estimation',
                'phone': '9876543215'
            },
            {
                'email': 'accounts@metersquare.com',
                'full_name': 'Accounts Team',
                'role': 'accounts',
                'phone': '9876543216'
            },
            {
                'email': 'director@metersquare.com',
                'full_name': 'Technical Director',
                'role': 'technicalDirector',
                'phone': '9876543217'
            }
        ]
        
        users_created = 0
        users_skipped = 0
        
        for user_data in test_users:
            # Check if user exists
            existing_user = User.query.filter_by(
                email=user_data['email'],
                is_deleted=False
            ).first()
            
            if existing_user:
                print(f"User already exists: {user_data['email']}")
                users_skipped += 1
                continue
            
            # Get role
            role = Role.query.filter(
                db.func.lower(Role.role) == user_data['role'].lower(),
                Role.is_deleted == False
            ).first()
            
            if not role:
                print(f"Role not found for user {user_data['email']}: {user_data['role']}")
                continue
            
            # Create user without password (OTP-only authentication)
            new_user = User(
                email=user_data['email'],
                full_name=user_data['full_name'],
                phone=user_data['phone'],
                role_id=role.role_id,
                department=get_role_department(user_data['role']),
                is_active=True,
                is_deleted=False,
                created_at=datetime.utcnow()
            )
            
            db.session.add(new_user)
            users_created += 1
            print(f"Created user: {user_data['email']} with role: {user_data['role']}")
        
        try:
            db.session.commit()
            print(f"\n[SUCCESS] Test user creation completed!")
            print(f"   - Users created: {users_created}")
            print(f"   - Users skipped: {users_skipped}")
            if users_created > 0:
                print(f"\n[INFO] All users will login using OTP sent to their email address")
                print(f"   No passwords are stored in the system")
        except Exception as e:
            db.session.rollback()
            print(f"\n[ERROR] Error during user creation: {str(e)}")
            return False
        
        return True

def list_roles():
    """List all roles in the database"""
    
    app = create_app()
    with app.app_context():
        print("\n[INFO] Current roles in database:")
        print("-" * 60)
        
        roles = Role.query.filter_by(is_deleted=False).order_by(Role.role_id).all()
        
        if not roles:
            print("No roles found in database")
            return
        
        for role in roles:
            print(f"\nRole ID: {role.role_id}")
            print(f"Role Name: {role.role}")
            print(f"Description: {role.description}")
            print(f"Active: {role.is_active}")
            if role.permissions:
                print(f"Permissions: {len(role.permissions.get('permissions', []))} permissions")
                print(f"Approval Limit: {role.permissions.get('approval_limit', 'N/A')}")
                print(f"Tier: {role.permissions.get('tier', 'N/A')}")

def list_users():
    """List all users in the database"""
    
    app = create_app()
    with app.app_context():
        print("\n[INFO] Current users in database:")
        print("-" * 60)
        
        users = db.session.query(User, Role).join(
            Role, User.role_id == Role.role_id
        ).filter(
            User.is_deleted == False
        ).order_by(User.user_id).all()
        
        if not users:
            print("No users found in database")
            return
        
        for user, role in users:
            print(f"\nUser ID: {user.user_id}")
            print(f"Email: {user.email}")
            print(f"Name: {user.full_name}")
            print(f"Role: {role.role}")
            print(f"Phone: {user.phone}")
            print(f"Active: {user.is_active}")
            print(f"Last Login: {user.last_login}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='MeterSquare ERP Role Seeding Script')
    parser.add_argument('--seed-roles', action='store_true', help='Seed ERP roles')
    parser.add_argument('--seed-users', action='store_true', help='Seed test users')
    parser.add_argument('--list-roles', action='store_true', help='List all roles')
    parser.add_argument('--list-users', action='store_true', help='List all users')
    parser.add_argument('--all', action='store_true', help='Seed roles and users')
    
    args = parser.parse_args()
    
    if args.seed_roles or args.all:
        seed_roles()
    
    if args.seed_users or args.all:
        seed_test_users()
    
    if args.list_roles:
        list_roles()
    
    if args.list_users:
        list_users()
    
    if not any(vars(args).values()):
        print("Usage: python seed_roles.py [--seed-roles] [--seed-users] [--list-roles] [--list-users] [--all]")
        print("\nExamples:")
        print("  python seed_roles.py --seed-roles    # Seed only roles")
        print("  python seed_roles.py --seed-users    # Seed test users")
        print("  python seed_roles.py --all           # Seed both roles and users")
        print("  python seed_roles.py --list-roles    # List all roles")
        print("  python seed_roles.py --list-users    # List all users")