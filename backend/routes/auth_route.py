# routes/auth_route.py

from flask import Blueprint
from controllers.auth_controller import *
from utils.authentication import *

auth_routes = Blueprint("auth_routes", __name__, url_prefix="/")

# Public routes (no authentication required)
@auth_routes.route('/register', methods=['POST'])
def register_route():
    """Register a new user"""
    return user_register()

@auth_routes.route('/login', methods=['POST'])
def login_route():
    """User login"""
    return user_login()

@auth_routes.route('/send_otp', methods=['POST'])
def send_otp_route():
    """Send OTP for password reset"""
    return send_email()

@auth_routes.route('/verification_otp', methods=['POST'])
def verification_otp_route():
    """Verify OTP"""
    return verification_otp()

@auth_routes.route('/reset-password', methods=['POST'])
def reset_password_route():
    """Reset password with OTP"""
    return reset_password()

@auth_routes.route('/logout', methods=['POST'])
def logout_route():
    """Logout user"""
    return logout()

# Protected routes (authentication required)
@auth_routes.route('/self', methods=['GET'])
@jwt_required
def self_route():
    """Get current logged-in user"""
    return handle_get_logged_in_user()

@auth_routes.route('/profile', methods=['PUT'])
@jwt_required
def update_profile_route():
    """Update user profile"""
    return update_user_profile()

@auth_routes.route('/change-password', methods=['POST'])
@jwt_required
def change_password_route():
    """Change user password"""
    return change_password()