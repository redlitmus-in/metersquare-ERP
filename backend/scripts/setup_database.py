#!/usr/bin/env python3
"""
Database setup script for MeterSquare ERP
This script handles database migration and initial data setup
"""

import os
import sys
import psycopg2
from psycopg2 import sql
import subprocess

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.logging import get_logger
from utils.seed_roles import seed_roles, seed_test_users

log = get_logger()

def get_db_connection():
    """Get database connection from environment variables"""
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'metersquare_erp'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', '')
    }
    
    try:
        conn = psycopg2.connect(**db_config)
        return conn
    except Exception as e:
        log.error(f"Failed to connect to database: {e}")
        print(f"❌ Database connection failed: {e}")
        print("\nPlease ensure:")
        print("1. PostgreSQL is running")
        print("2. Database credentials are correct")
        print("3. Set environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD")
        return None

def run_migration(conn, migration_file):
    """Run a SQL migration file"""
    try:
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        conn.rollback()
        log.error(f"Migration failed: {e}")
        print(f"❌ Migration failed: {e}")
        return False

def setup_database():
    """Main database setup function"""
    print("\n" + "="*60)
    print("MeterSquare ERP - Database Setup")
    print("="*60)
    
    # Check for migration file
    migration_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        'database', 'migrations', 'reset_workflow_roles.sql'
    )
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    # Connect to database
    print("\n1. Connecting to database...")
    conn = get_db_connection()
    if not conn:
        return False
    print("✅ Database connected")
    
    # Run migration
    print("\n2. Running workflow roles migration...")
    if run_migration(conn, migration_file):
        print("✅ Migration completed successfully")
    else:
        conn.close()
        return False
    
    conn.close()
    
    # Seed roles using existing script
    print("\n3. Seeding roles...")
    if seed_roles():
        print("✅ Roles seeded successfully")
    else:
        print("⚠️  Role seeding had issues")
    
    # Ask if user wants to create test users
    response = input("\n4. Create test users? (y/n): ").lower()
    if response == 'y':
        if seed_test_users():
            print("✅ Test users created successfully")
        else:
            print("⚠️  Test user creation had issues")
    
    print("\n" + "="*60)
    print("Database setup completed!")
    print("="*60)
    print("\nTest Users (if created):")
    print("- site.supervisor@metersquare.com")
    print("- mep.supervisor@metersquare.com")
    print("- procurement@metersquare.com")
    print("- pm@metersquare.com")
    print("- design@metersquare.com")
    print("- estimation@metersquare.com")
    print("- accounts@metersquare.com")
    print("- director@metersquare.com")
    print("\nAll users login with OTP sent to email")
    
    return True

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)