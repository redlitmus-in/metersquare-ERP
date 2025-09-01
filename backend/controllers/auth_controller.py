# controllers/auth_controller.py
"""
Authentication controller - handles authentication and authorization logic
"""

from flask import g, request, jsonify, current_app, make_response
from functools import wraps
from datetime import datetime, timedelta
import jwt
from werkzeug.security import generate_password_hash, check_password_hash

from config.db import db
from models.user import User
from models.role import Role
from config.logging import get_logger
from utils.authentication import send_otp
import os

ENVIRONMENT = os.environ.get("ENVIRONMENT")

log = get_logger()

def jwt_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.headers.get('Authorization')

        # Extract token from Bearer header or cookie
        if token and token.startswith("Bearer "):
            token = token.split(" ")[1]
        else:
            token = request.cookies.get('access_token')

        if not token:
            return jsonify({"error": "Authorization token is missing"}), 401

        try:
            secret_key = current_app.config.get('SECRET_KEY')
            if not secret_key:
                raise Exception("SECRET_KEY not set in app configuration")

            decoded = jwt.decode(token, secret_key, algorithms=["HS256"])
            email = decoded.get("username") or decoded.get("email")
            user = User.query.filter_by(email=email, is_deleted=False, is_active=True).first()
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Manually create user dict since no to_dict method
            g.user = {
                "user_id": user.user_id,
                "email": user.email,
                "full_name": user.full_name,
                "phone": user.phone,
                "role_id": user.role_id,
                "avatar_url": user.avatar_url,
                "org_uuid": user.org_uuid,
                "is_active": user.is_active
            }
            g.user_id = user.user_id

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        except Exception as e:
            log.error(f"Auth error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 401

        return func(*args, **kwargs)

    return wrapper

def user_register():
    try:
        data = request.get_json()

        email = data.get("email")
        password = data.get("password")
        full_name = data.get("full_name")
        phone = data.get("phone")
        role_name = data.get("role", "user").lower()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Check if user exists
        if User.query.filter_by(email=email, is_deleted=False).first():
            return jsonify({"error": "User with this email already exists"}), 409

        # Get or create role
        role = Role.query.filter(db.func.lower(Role.role) == role_name, Role.is_deleted == False).first()
        if not role:
            role = Role(
                role=role_name,
                description=f"{role_name} role",
                is_active=True,
                is_deleted=False,
                created_at=datetime.utcnow()
            )
            db.session.add(role)
            db.session.commit()  # Commit to get role_id

        # Hash password
        hashed_password = generate_password_hash(password)

        # Create user
        user = User(
            email=email,
            password=hashed_password,
            full_name=full_name,
            phone=phone,
            role_id=role.role_id,
            is_active=True,
            is_deleted=False,
            created_at=datetime.utcnow()
        )
        db.session.add(user)
        db.session.commit()

        return jsonify({
            "message": "User registered successfully",
            "user_id": user.user_id
        }), 201

    except Exception as e:
        log.error(f"Registration error: {str(e)}")
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

def user_login():
    try:
        data = request.get_json()
        username = data.get("username") or data.get("email")
        password = data.get("password")
        role_name = data.get("role")
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        # query = User.query.join(Role).filter(
        #     User.email == username,
        #     User.is_deleted == False,
        #     User.is_active == True
        # )
        query = db.session.query(User).join(Role, User.role_id == Role.role_id).filter(
            User.full_name == username,
            User.is_deleted == False,
            User.is_active == True
        )

        if role_name:
            query = query.filter(db.func.lower(Role.role) == role_name.lower())

        user = query.first()

        if not user or not check_password_hash(user.password, password):
            return jsonify({"error": "Invalid username, password, or role"}), 401

        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()

        secret_key = current_app.config.get('SECRET_KEY', 'your-secret-key')
        payload = {
            'user_id': user.user_id,
            'email': user.email,
            'role': user.role.role if user.role else "user",
            'creation_time': datetime.utcnow().isoformat(),
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(payload, secret_key, algorithm="HS256")

        response_data = {
            "message": "Login successful",
            "token": token,
            "user": {
                "user_id": user.user_id,
                "email": user.email,
                "full_name": user.full_name,
                "phone": user.phone,
                "role": user.role.role if user.role else "user",
                "department": getattr(user, "department", None),
                "avatar_url": getattr(user, "avatar_url", None)
            }
        }

        response = make_response(jsonify(response_data), 200)
        response.set_cookie(
            'access_token',
            token,
            httponly=True,
            secure=True,  # Set False if testing locally
            samesite='Lax',
            # expires=datetime.utcnow() + timedelta(hours=24)
           expires= datetime.utcnow() + timedelta(days=1)
        )

        return response

    except Exception as e:
        log.error(f"Login error: {str(e)}")
        return jsonify({
            "error": f"Login failed: {str(e)}"}), 500

def handle_get_logged_in_user():
    try:
        # Use getattr to avoid attribute errors when g.user doesn't exist
        current_user = getattr(g, "user", None)
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        # Proceed to fetch role info from database
        role = Role.query.filter_by(role_id=current_user["role_id"], is_deleted=False).first()
        role_name = role.role if role else "user"

        # Prepare response
        user_data = {
            "user": {
                "user_id": current_user.get("user_id"),
                "email": current_user.get("email"),
                "full_name": current_user.get("full_name"),
                "phone": current_user.get("phone"),
                "role": role_name,
                "avatar_url": current_user.get("avatar_url"),
                "org_uuid": current_user.get("org_uuid"),
                "is_active": current_user.get("is_active")
            },
            "api_info": {
                "endpoint": "/self",
                "method": "GET",
                "authentication": "Required (Bearer token)"
            }
        }
        return jsonify(user_data), 200

    except Exception as e:
        log.error(f"Error in self_route: {str(e)}")
        return jsonify({"error": str(e)}), 500

def update_user_profile():
    """
    Update user profile information using query.filter_by
    """
    try:
        current_user = g.get("user")
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401

        data = request.get_json()
        allowed_fields = ["full_name", "phone", "avatar_url"]
        update_data = {field: data[field] for field in allowed_fields if field in data}

        if not update_data:
            return jsonify({
                "error": "No data to update"}), 400

        # Find user from DB using SQLAlchemy
        user = User.query.filter_by(user_id=current_user["user_id"], is_deleted=False).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Apply updates
        for field, value in update_data.items():
            setattr(user, field, value)

        db.session.commit()

        return jsonify({
            "message": "Profile updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        log.error(f"Profile update error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def change_password():
    try:
        current_user = g.get("user")
        if not current_user:
            return jsonify({
                "error": "Not logged in"}), 401

        data = request.get_json()
        old_password = data.get("old_password")
        new_password = data.get("new_password")

        if not old_password or not new_password:
            return jsonify({
                "error": "Old and new passwords are required",
                "required_fields": {"old_password": "string", "new_password": "string"}
            }), 400

        # Fetch user from DB
        user = User.query.filter_by(user_id=current_user["user_id"], is_deleted=False).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        if not check_password_hash(user.password, old_password):
            return jsonify({"error": "Invalid old password"}), 401

        user.password = generate_password_hash(new_password)
        db.session.commit()

        return jsonify({
            "message": "Password changed successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

def send_email():
    try:
        # Try to get JSON data first, fallback to form data if JSON is not present
        data = request.get_json(silent=True)
        if not data:
            data = request.form.to_dict()
 
        email = data.get("email")
        role = data.get("role")
        if not email or not role:
            return jsonify({"error": "Email is required"}), 400
        role = Role.query.filter_by(role=role, is_deleted=False).first()
        if not role:
            return jsonify({"error": "Role not found"}), 404
 
        user = User.query.filter_by(email=email, is_deleted=False,role_id = role.role_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
 
        otp = send_otp(email)
 
        if otp:
            response_data = {
                "message": "OTP sent successfully"
            }
            # Only include OTP in non-production environments (for testing/debugging)
            if ENVIRONMENT != 'prod':
                response_data["otp"] = otp
 
            return jsonify(response_data), 200
        else:
            return jsonify({"error": "Failed to send OTP"}), 500
 
    except Exception as e:
        log.error(f"Error in send_email: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

def reset_password():
    try:
        data = request.get_json()
        email = data.get("email")
        otp = data.get("otp")  # Optional: verify OTP properly
        new_password = data.get("new_password")

        if not email or not otp or not new_password:
            return jsonify({"error": "Email, OTP, and new password are required"}), 400

        # TODO: Add OTP verification logic here

        user = User.query.filter_by(email=email, is_deleted=False).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        user.password = generate_password_hash(new_password)
        db.session.commit()

        return jsonify({
            "message": "Password reset successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

def logout():
    response_data = {"message": "Successfully logged out"}
    response = make_response(jsonify(response_data), 200)
    response.delete_cookie('access_token')
    return response