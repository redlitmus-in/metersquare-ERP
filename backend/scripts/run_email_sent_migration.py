#!/usr/bin/env python3
"""
Script to add email_sent column to purchase table
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection from environment variables"""
    try:
        # Use DATABASE_URL if available, otherwise construct from individual vars
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            conn = psycopg2.connect(database_url)
        else:
            db_config = {
                'host': os.getenv('DB_HOST', 'localhost'),
                'port': os.getenv('DB_PORT', '5432'),
                'database': os.getenv('DB_NAME', 'metersquare_erp'),
                'user': os.getenv('DB_USER', 'postgres'),
                'password': os.getenv('DB_PASSWORD', '')
            }
            conn = psycopg2.connect(**db_config)
        
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        return None

def run_migration():
    """Run the email_sent column migration"""
    print("\n" + "="*50)
    print("Running Email Sent Column Migration")
    print("="*50)
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        # Read the migration file
        migration_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'migrations', 'add_email_sent_to_purchase.sql'
        )
        
        if not os.path.exists(migration_file):
            print(f"Migration file not found: {migration_file}")
            return False
        
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        print(f"Running migration from: {migration_file}")
        
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        cursor.close()
        
        print("Migration completed successfully!")
        print("   - Added email_sent column to purchase table")
        print("   - Set default value to FALSE for existing records")
        
        return True
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)