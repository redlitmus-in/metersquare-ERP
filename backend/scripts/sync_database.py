#!/usr/bin/env python3
"""
Database Synchronization Script for MeterSquare ERP
Syncs workflow roles and creates test users
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.db import db
from models.user import User
from models.role import Role
from config.workflow_roles_config import WORKFLOW_ROLES
from flask import Flask
from config.logging import get_logger
import json

log = get_logger()

def create_app_for_sync():
    """Create Flask app for database operations"""
    app = Flask(__name__)
    
    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:password@localhost:5432/metersquare_erp'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "sync-secret-key")
    
    db.init_app(app)
    
    return app

def reset_database(force=False):
    """Reset users and roles tables"""
    if not force:
        response = input("\n[WARNING] This will DELETE all existing users and roles!\nAre you sure? (yes/no): ")
        if response.lower() != 'yes':
            print("[X] Operation cancelled")
            return False
    
    try:
        # Delete all users
        User.query.delete()
        db.session.commit()
        print("[OK] Deleted all users")
        
        # Delete all roles
        Role.query.delete()
        db.session.commit()
        print("[OK] Deleted all roles")
        
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Error resetting database: {str(e)}")
        return False

def sync_roles():
    """Sync roles from workflow configuration to database"""
    print("\n[INFO] Syncing workflow roles...")
    
    synced_count = 0
    updated_count = 0
    
    for role_name, role_config in WORKFLOW_ROLES.items():
        try:
            # Check if role exists
            existing_role = Role.query.filter_by(role=role_name).first()
            
            # Prepare permissions JSON
            permissions = {
                'can_initiate': role_config.get('can_initiate', []),
                'can_approve': role_config.get('can_approve', []),
                'permissions': role_config.get('permissions', []),
                'approval_limit': role_config.get('approval_limit', 0)
            }
            
            if not existing_role:
                # Create new role
                new_role = Role(
                    role=role_name,
                    description=role_config['description'],
                    permissions=permissions,
                    is_active=True,
                    is_deleted=False,
                    created_at=datetime.utcnow(),
                    last_modified_at=datetime.utcnow()
                )
                db.session.add(new_role)
                synced_count += 1
                print(f"  [OK] Created role: {role_name}")
            else:
                # Update existing role
                existing_role.description = role_config['description']
                existing_role.permissions = permissions
                existing_role.is_active = True
                existing_role.is_deleted = False
                existing_role.last_modified_at = datetime.utcnow()
                updated_count += 1
                print(f"  [OK] Updated role: {role_name}")
        
        except Exception as e:
            print(f"  [ERROR] Error with role {role_name}: {str(e)}")
            continue
    
    try:
        db.session.commit()
        print(f"\n[OK] Sync complete: {synced_count} created, {updated_count} updated")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Error committing roles: {str(e)}")
        return False

def create_test_users():
    """Create test users for each role"""
    print("\n[INFO] Creating test users...")
    
    test_users = [
        {
            'email': 'site.supervisor@metersquare.com',
            'full_name': 'John Smith',
            'phone': '+1234567890',
            'role': 'siteSupervisor',
            'department': 'Operations'
        },
        {
            'email': 'mep.supervisor@metersquare.com',
            'full_name': 'Sarah Johnson',
            'phone': '+1234567891',
            'role': 'mepSupervisor',
            'department': 'Operations'
        },
        {
            'email': 'procurement@metersquare.com',
            'full_name': 'Michael Chen',
            'phone': '+1234567892',
            'role': 'procurement',
            'department': 'Support'
        },
        {
            'email': 'project.manager@metersquare.com',
            'full_name': 'Emily Davis',
            'phone': '+1234567893',
            'role': 'projectManager',
            'department': 'Management'
        },
        {
            'email': 'design@metersquare.com',
            'full_name': 'David Wilson',
            'phone': '+1234567894',
            'role': 'design',
            'department': 'Technical'
        },
        {
            'email': 'estimation@metersquare.com',
            'full_name': 'Lisa Anderson',
            'phone': '+1234567895',
            'role': 'estimation',
            'department': 'Technical'
        },
        {
            'email': 'accounts@metersquare.com',
            'full_name': 'Robert Taylor',
            'phone': '+1234567896',
            'role': 'accounts',
            'department': 'Support'
        },
        {
            'email': 'technical.director@metersquare.com',
            'full_name': 'James Williams',
            'phone': '+1234567897',
            'role': 'technicalDirector',
            'department': 'Management'
        },
        {
            'email': 'admin@metersquare.com',
            'full_name': 'Admin User',
            'phone': '+1234567898',
            'role': 'technicalDirector',
            'department': 'Management'
        }
    ]
    
    created_count = 0
    
    for user_data in test_users:
        try:
            # Check if user exists
            existing_user = User.query.filter_by(email=user_data['email']).first()
            
            if existing_user:
                print(f"  [WARNING] User already exists: {user_data['email']}")
                continue
            
            # Get role
            role = Role.query.filter_by(role=user_data['role']).first()
            
            if not role:
                print(f"  [ERROR] Role not found for user {user_data['email']}: {user_data['role']}")
                continue
            
            # Create user
            new_user = User(
                email=user_data['email'],
                full_name=user_data['full_name'],
                phone=user_data['phone'],
                role_id=role.role_id,
                department=user_data['department'],
                is_active=True,
                is_deleted=False,
                created_at=datetime.utcnow(),
                last_modified_at=datetime.utcnow()
            )
            
            db.session.add(new_user)
            created_count += 1
            print(f"  [OK] Created user: {user_data['email']} ({user_data['role']})")
            
        except Exception as e:
            print(f"  [ERROR] Error creating user {user_data['email']}: {str(e)}")
            continue
    
    try:
        db.session.commit()
        print(f"\n[OK] Created {created_count} test users")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Error committing users: {str(e)}")
        return False

def verify_database():
    """Verify database state after sync"""
    print("\n[INFO] Verifying database state...")
    
    # Count roles
    role_count = Role.query.filter_by(is_deleted=False).count()
    print(f"  [STAT] Active roles: {role_count}")
    
    # List roles
    roles = Role.query.filter_by(is_deleted=False).all()
    for role in roles:
        user_count = User.query.filter_by(role_id=role.role_id, is_deleted=False).count()
        print(f"    - {role.role}: {user_count} users")
    
    # Count users
    user_count = User.query.filter_by(is_deleted=False).count()
    print(f"  [STAT] Active users: {user_count}")
    
    # List users
    users = User.query.filter_by(is_deleted=False).all()
    for user in users:
        role = Role.query.filter_by(role_id=user.role_id).first()
        role_name = role.role if role else "Unknown"
        print(f"    - {user.email} ({role_name})")

def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("MeterSquare ERP - Database Synchronization Tool")
    print("="*60)
    
    # Create Flask app
    app = create_app_for_sync()
    
    with app.app_context():
        print("\n[INFO] Database Connection Established")
        
        # Menu
        print("\nOptions:")
        print("1. Sync roles only (safe)")
        print("2. Create test users only")
        print("3. Full reset and sync (WARNING: Deletes all data)")
        print("4. Verify database state")
        print("5. Exit")
        
        choice = input("\nSelect option (1-5): ")
        
        if choice == '1':
            sync_roles()
            verify_database()
        
        elif choice == '2':
            create_test_users()
            verify_database()
        
        elif choice == '3':
            if reset_database():
                sync_roles()
                create_test_users()
                verify_database()
        
        elif choice == '4':
            verify_database()
        
        elif choice == '5':
            print("\n[INFO] Goodbye!")
            sys.exit(0)
        
        else:
            print("[ERROR] Invalid option")
    
    print("\n[OK] Sync complete!")

if __name__ == "__main__":
    main()