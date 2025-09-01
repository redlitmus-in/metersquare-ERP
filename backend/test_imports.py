#!/usr/bin/env python
"""Test script to verify all backend dependencies are installed correctly."""

import sys
print(f"Python version: {sys.version}")
print("-" * 50)

packages_to_test = [
    "flask",
    "flask_cors",
    "flask_sqlalchemy",
    "supabase",
    "psycopg2",
    "sqlalchemy",
    "alembic",
    "jwt",
    "werkzeug",
    "passlib",
    "jose",
    "dotenv",
    "email_validator",
    "requests",
    "httpx",
    "websockets",
    "redis",
    "celery",
    "dateutil",
    "pytest",
    "gunicorn"
]

print("Testing package imports...")
print("-" * 50)

failed_imports = []

for package in packages_to_test:
    try:
        __import__(package)
        print(f"[OK] {package:<20} - Imported successfully")
    except ImportError as e:
        print(f"[FAIL] {package:<20} - FAILED: {e}")
        failed_imports.append(package)

print("-" * 50)

if failed_imports:
    print(f"\n[ERROR] Failed to import {len(failed_imports)} package(s):")
    for pkg in failed_imports:
        print(f"  - {pkg}")
    print("\nPlease install missing packages with:")
    print(f"  pip install {' '.join(failed_imports)}")
else:
    print("\n[SUCCESS] All packages imported successfully!")
    print("Your backend environment is ready to run!")

print("\nTo start the backend server, run:")
print("  python app.py")
print("\nOr use the provided scripts:")
print("  - run_backend.bat (for Command Prompt)")
print("  - run_backend.ps1 (for PowerShell)")