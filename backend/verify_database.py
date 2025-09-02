#!/usr/bin/env python3
"""
Database Verification Script for Meter Square ERP
Verifies that the database fix was successful
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from config.db import get_db_connection
from sqlalchemy import text

def verify_database():
    """Verify the database is properly set up"""
    print("🔍 Verifying Database State...")
    print("=" * 50)
    
    try:
        # Get database connection
        db = next(get_db_connection())
        
        print("✅ Database connection established")
        
        # Check roles
        print("\n📋 ROLES TABLE:")
        print("-" * 30)
        roles_result = db.execute(text("SELECT role_id, role, description FROM roles ORDER BY role_id"))
        roles = roles_result.fetchall()
        
        if len(roles) == 8:
            print(f"✅ Found {len(roles)} roles (expected: 8)")
            for role in roles:
                print(f"   • ID {role[0]}: {role[1]} - {role[2]}")
        else:
            print(f"❌ Found {len(roles)} roles (expected: 8)")
        
        # Check users
        print("\n👥 USERS TABLE:")
        print("-" * 30)
        users_result = db.execute(text("""
            SELECT u.user_id, u.email, u.full_name, u.department, r.role, r.role_id
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id 
            ORDER BY u.user_id
        """))
        users = users_result.fetchall()
        
        if len(users) == 9:
            print(f"✅ Found {len(users)} users (expected: 9)")
            for user in users:
                print(f"   • {user[2]} ({user[1]}) → {user[4]} (ID: {user[5]})")
        else:
            print(f"❌ Found {len(users)} users (expected: 9)")
        
        # Check for orphaned users
        print("\n🔗 ROLE ASSOCIATIONS:")
        print("-" * 30)
        orphaned_result = db.execute(text("""
            SELECT COUNT(*) 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.role_id
            WHERE r.role_id IS NULL
        """))
        orphaned_count = orphaned_result.scalar()
        
        if orphaned_count == 0:
            print("✅ No orphaned users found")
        else:
            print(f"❌ Found {orphaned_count} orphaned users")
        
        # Summary
        print("\n📊 SUMMARY:")
        print("-" * 30)
        print(f"Roles: {len(roles)}/8")
        print(f"Users: {len(users)}/9")
        print(f"Orphaned Users: {orphaned_count}/0")
        
        if len(roles) == 8 and len(users) == 9 and orphaned_count == 0:
            print("\n🎉 Database verification PASSED!")
            print("✅ All tables are properly configured")
            print("✅ Role-based authentication is ready")
        else:
            print("\n❌ Database verification FAILED!")
            print("⚠️  Some issues need to be resolved")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()
    
    return True

if __name__ == "__main__":
    print("🚀 Meter Square ERP - Database Verification")
    print("=" * 50)
    
    success = verify_database()
    
    if success:
        print("\n✅ Verification completed!")
        sys.exit(0)
    else:
        print("\n❌ Verification failed!")
        sys.exit(1)
