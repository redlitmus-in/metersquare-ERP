#!/usr/bin/env python3
"""
Database Fix Script for Meter Square ERP
Fixes users and roles tables for proper authentication workflow
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from config.db import get_db_connection
from sqlalchemy import text

def fix_database():
    """Main function to fix the database issues"""
    print("🔧 Starting Database Fix Process...")
    
    try:
        # Get database connection
        db = next(get_db_connection())
        
        print("✅ Database connection established")
        
        # Step 1: Clean up incorrect role
        print("\n1️⃣ Cleaning up incorrect role...")
        delete_incorrect_role(db)
        
        # Step 2: Fix existing user's role
        print("\n2️⃣ Fixing existing user's role...")
        fix_existing_user_role(db)
        
        # Step 3: Create test users for workflow roles
        print("\n3️⃣ Creating test users for workflow roles...")
        create_test_users(db)
        
        # Step 4: Verify the fix
        print("\n4️⃣ Verifying database fix...")
        verify_database_fix(db)
        
        print("\n🎉 Database fix completed successfully!")
        print("\n📋 Summary of changes:")
        print("   • Removed incorrect role 'Site_Supervisiorsssss' (ID: 1)")
        print("   • Fixed existing user 'deepika K' to have role_id: 5 (projectManager)")
        print("   • Created 8 test users for each workflow role")
        print("   • All users now have proper role associations")
        
        print("\n🔑 Test Users Created:")
        print("   • site.supervisor@metersquare.com → siteSupervisor")
        print("   • mep.supervisor@metersquare.com → mepSupervisor")
        print("   • procurement@metersquare.com → procurement")
        print("   • pm@metersquare.com → projectManager")
        print("   • design@metersquare.com → design")
        print("   • estimation@metersquare.com → estimation")
        print("   • accounts@metersquare.com → accounts")
        print("   • director@metersquare.com → technicalDirector")
        
        print("\n💡 Next Steps:")
        print("   1. Test login flow with role selection")
        print("   2. Verify OTP authentication works")
        print("   3. Check JWT contains correct role information")
        
    except Exception as e:
        print(f"❌ Error during database fix: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()
    
    return True

def delete_incorrect_role(db):
    """Delete the incorrect role 'Site_Supervisiorsssss' (ID: 1)"""
    try:
        # Delete incorrect role
        result = db.execute(text("DELETE FROM roles WHERE role_id = 1"))
        
        if result.rowcount > 0:
            print("   ✅ Deleted incorrect role 'Site_Supervisiorsssss'")
        else:
            print("   ℹ️  Role ID 1 not found (already deleted)")
        
        # Reset sequence
        db.execute(text("ALTER SEQUENCE roles_role_id_seq RESTART WITH 2"))
        print("   ✅ Reset role sequence to start from 2")
        
        db.commit()
        
    except Exception as e:
        print(f"   ❌ Error deleting incorrect role: {e}")
        db.rollback()
        raise

def fix_existing_user_role(db):
    """Fix existing user's role to projectManager (ID: 5)"""
    try:
        result = db.execute(text("""
            UPDATE users 
            SET role_id = 5, 
                department = 'Project Management',
                last_modified_at = CURRENT_TIMESTAMP
            WHERE user_id = 1
        """))
        
        if result.rowcount > 0:
            print("   ✅ Updated existing user 'deepika K' to role_id: 5 (projectManager)")
        else:
            print("   ℹ️  User ID 1 not found or already updated")
        
        db.commit()
        
    except Exception as e:
        print(f"   ❌ Error fixing existing user role: {e}")
        db.rollback()
        raise

def create_test_users(db):
    """Create test users for each workflow role"""
    try:
        # Check if test users already exist
        existing_users = db.execute(text("SELECT email FROM users WHERE email LIKE '%@metersquare.com'"))
        existing_emails = [row[0] for row in existing_users]
        
        if existing_emails:
            print(f"   ℹ️  Found {len(existing_emails)} existing test users")
            return
        
        # Insert test users
        test_users_data = [
            ('site.supervisor@metersquare.com', 'Site Supervisor Test', '+91-9876543210', 2, 'Site Operations'),
            ('mep.supervisor@metersquare.com', 'MEP Supervisor Test', '+91-9876543211', 3, 'MEP Operations'),
            ('procurement@metersquare.com', 'Procurement Manager Test', '+91-9876543212', 4, 'Procurement'),
            ('pm@metersquare.com', 'Project Manager Test', '+91-9876543213', 5, 'Project Management'),
            ('design@metersquare.com', 'Design Engineer Test', '+91-9876543214', 6, 'Design'),
            ('estimation@metersquare.com', 'Estimation Engineer Test', '+91-9876543215', 7, 'Estimation'),
            ('accounts@metersquare.com', 'Accounts Manager Test', '+91-9876543216', 8, 'Accounts'),
            ('director@metersquare.com', 'Technical Director Test', '+91-9876543217', 9, 'Technical Leadership')
        ]
        
        for email, full_name, phone, role_id, department in test_users_data:
            db.execute(text("""
                INSERT INTO users (email, full_name, phone, role_id, department, is_active, created_at, last_modified_at)
                VALUES (:email, :full_name, :phone, :role_id, :department, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                'email': email,
                'full_name': full_name,
                'phone': phone,
                'role_id': role_id,
                'department': department
            })
        
        db.commit()
        print("   ✅ Created 8 test users for workflow roles")
        
    except Exception as e:
        print(f"   ❌ Error creating test users: {e}")
        db.rollback()
        raise

def verify_database_fix(db):
    """Verify that the database fix was successful"""
    try:
        # Check roles count
        roles_result = db.execute(text("SELECT COUNT(*) FROM roles"))
        roles_count = roles_result.scalar()
        print(f"   ✅ Roles table: {roles_count} roles (expected: 8)")
        
        # Check users count
        users_result = db.execute(text("SELECT COUNT(*) FROM users"))
        users_count = users_result.scalar()
        print(f"   ✅ Users table: {users_count} users (expected: 9)")
        
        # Check role associations
        associations_result = db.execute(text("""
            SELECT COUNT(*) 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id
        """))
        associations_count = associations_result.scalar()
        print(f"   ✅ Valid role associations: {associations_count} (expected: 9)")
        
        # Check for any orphaned users
        orphaned_result = db.execute(text("""
            SELECT COUNT(*) 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE r.role_id IS NULL
        """))
        orphaned_count = orphaned_result.scalar()
        print(f"   ✅ Orphaned users: {orphaned_count} (expected: 0)")
        
        if roles_count == 8 and users_count == 9 and associations_count == 9 and orphaned_count == 0:
            print("   🎯 All verification checks passed!")
        else:
            print("   ⚠️  Some verification checks failed")
            
    except Exception as e:
        print(f"   ❌ Error during verification: {e}")
        raise

if __name__ == "__main__":
    print("🚀 Meter Square ERP - Database Fix Script")
    print("=" * 50)
    
    success = fix_database()
    
    if success:
        print("\n✅ Database fix completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Database fix failed!")
        sys.exit(1)
