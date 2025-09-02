from config.db import db, initialize_db
from models.role import Role
from flask import Flask
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "default-secret-key")

initialize_db(app)

with app.app_context():
    roles = Role.query.all()
    print("\n=== Roles in Database ===")
    for r in roles:
        print(f"Role: {r.role}, ID: {r.role_id}")
    print(f"\nTotal roles: {len(roles)}")