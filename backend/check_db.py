"""
Quick script to check database tables
"""
from config.db import db
from app import create_app
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("\n=== DATABASE CHECK ===\n")
    
    # Check roles
    print("ROLES TABLE:")
    print("-" * 50)
    roles = db.session.execute(text("SELECT role_id, role, is_active, is_deleted FROM roles"))
    for r in roles:
        print(f"  ID: {r[0]}, Name: {r[1]}, Active: {r[2]}, Deleted: {r[3]}")
    
    print("\nUSERS TABLE:")
    print("-" * 50)
    users = db.session.execute(text("SELECT user_id, email, full_name, role_id FROM users WHERE is_deleted = false"))
    for u in users:
        print(f"  ID: {u[0]}, Email: {u[1]}, Name: {u[2]}, Role ID: {u[3]}")
    
    print("\n=== END CHECK ===\n")