from flask import g
import os
from flask import g, jsonify, make_response, request, session, url_for
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from datetime import datetime, timedelta
from sqlalchemy import func
import jwt
from models.user import User


from config.logging import get_logger

log =  get_logger()

ENVIRONMENT = os.environ.get("ENVIRONMENT")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_EMAIL_PASSWORD = os.getenv("SENDER_EMAIL_PASSWORD")
SECRET_KEY = os.getenv('SECRET_KEY')

otp_storage = {}

def send_otp(email_id):
    try:
        otp = random.randint(100000, 999999)
        otp_storage[email_id] = {
            "otp": otp,
            "expires_at": (datetime.utcnow() + timedelta(seconds=300)).timestamp()
        }

        sender_email = SENDER_EMAIL
        password = SENDER_EMAIL_PASSWORD
        smtp_server = "smtp.gmail.com"
        smtp_port = 465
        subject = "Your OTP Code"

        body = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{
                        margin: 0;
                        padding: 0;
                        font-family: Arial, Helvetica, sans-serif;
                        background-color: #f4f6fb;
                        color: #333;
                    }}
                    .wrapper {{
                        width: 100%;
                        padding: 30px 0;
                        background-color: #f4f6fb;
                    }}
                    .email-container {{
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
                        border: 1px solid #e0e6f5;
                    }}
                    .header {{
                        background-color: #243d8a; /* Brand Blue */
                        color: white;
                        text-align: center;
                        padding: 25px;
                    }}
                    .header .logo {{
                        margin: 0;
                        font-size: 26px;
                        font-weight: bold;
                        letter-spacing: 0.5px;
                    }}
                    .content {{
                        padding: 35px 25px;
                        text-align: center;
                    }}
                    .content .title {{
                        font-size: 22px;
                        font-weight: bold;
                        color: #243d8a;
                        margin-bottom: 18px;
                    }}
                    .content .message {{
                        font-size: 15px;
                        line-height: 1.6;
                        color: #444;
                        margin-bottom: 28px;
                    }}
                    .otp-container {{
                        margin: 25px auto;
                        display: inline-block;
                        padding: 18px 28px;
                        border: 2px solid #243d8a;
                        border-radius: 8px;
                        background-color: #f0f4ff;
                    }}
                    .otp-code {{
                        font-size: 30px;
                        font-weight: bold;
                        letter-spacing: 6px;
                        color: #243d8a;
                        margin-bottom: 12px;
                    }}
                    .timer {{
                        font-size: 13px;
                        color: #555;
                    }}
                    .warning {{
                        font-size: 13px;
                        color: #777;
                        margin-top: 25px;
                        line-height: 1.5;
                    }}
                    .signature {{
                        text-align: left;
                        margin-top: 35px;
                        font-size: 14px;
                        color: #444;
                    }}
                    .signature strong {{
                        color: #243d8a;
                    }}
                    .footer {{
                        background-color: #f4f6fb;
                        text-align: center;
                        padding: 18px;
                        border-top: 1px solid #e0e6f5;
                    }}
                    .footer-text {{
                        font-size: 12px;
                        color: #888;
                        margin: 0;
                    }}
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="email-container">
                        <div class="header">
                            <h1 class="logo">Meter Square</h1>
                        </div>
                        <div class="content">
                            <h2 class="title">Welcome to Meter Square</h2>
                            <p class="message">
                                We're excited to have you on board! To secure your account,
                                please use the verification code below to complete your registration.
                            </p>
                            <div class="otp-container">
                                <div class="otp-code">{otp}</div>
                                <div class="timer">
                                    This code will expire in <strong>5 minutes</strong>
                                </div>
                            </div>
                            <div class="warning">
                                If you did not request this verification code, you can safely ignore this email.
                                Your account security is our top priority.
                            </div>

                            <div class="signature">
                                Best regards,<br>
                                <strong>Redlitmus Team</strong>
                            </div>
                        </div>
                        <div class="footer">
                            <p class="footer-text">© 2025 Meter Square. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

        message = MIMEMultipart()
        message["From"] = sender_email
        message["To"] = email_id
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))

        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, email_id, message.as_string())

        return otp

    except smtplib.SMTPException as e:
        log.info(f"SMTP error occurred: {e}")
        return None
    except Exception as e:
        log.info(f"An error occurred: {e}")
        return None

def verification_otp():
    """
    OTP-based login - Step 2: Verify OTP and complete login
    Validates role if it was specified during OTP request
    """
    from models.role import Role
    
    data = request.get_json()
    otp_input = data.get('otp')
    email_id = data.get('email') or data.get('email_id')  # support both keys
    
    if not otp_input:
        return jsonify({"error": "OTP is required"}), 400
    if not email_id:
        return jsonify({"error": "Email is required"}), 400
    
    # Assuming OTP is stored as int, convert input accordingly
    try:
        otp_input = int(otp_input)
    except ValueError:
        return jsonify({"error": "OTP must be a number"}), 400
    
    # Get OTP data from storage first to check if role was specified
    otp_data = otp_storage.get(email_id)
    if not otp_data:
        return jsonify({"error": "OTP not found or expired"}), 400
    
    # Check if a specific role was required during login
    required_role = otp_data.get('role')
    
    # Fetch user by email with role information
    from config.db import db
    query = db.session.query(User).join(Role, User.role_id == Role.role_id).filter(
        User.email == email_id,
        User.is_deleted == False,
        User.is_active == True
    )
    
    # If role was specified during login, validate it
    if required_role:
        query = query.filter(
            db.func.lower(Role.role) == required_role.lower()
        )
    
    user = query.first()
    
    if not user:
        if required_role:
            return jsonify({"error": f"User not found with role '{required_role}' or account inactive"}), 404
        else:
            return jsonify({"error": "User not found or inactive"}), 404
    
    # OTP data already retrieved above
    stored_otp = otp_data.get("otp")
    expires_at = datetime.fromtimestamp(otp_data.get("expires_at"))
    
    log.info(f"Stored OTP for {email_id}: {stored_otp}, Input OTP: {otp_input}")

    # Check if OTP matches
    if otp_input != stored_otp:
        return jsonify({"error": "Invalid OTP"}), 400

    # Check expiry
    current_time = datetime.utcnow()
    if current_time > expires_at:
        del otp_storage[email_id]
        return jsonify({"error": "OTP expired"}), 400
    
    # Update last login
    user.last_login = current_time
    db.session.commit()
    
    # OTP verified, remove from storage
    del otp_storage[email_id]
    
    # Get role permissions
    role_permissions = []
    if user.role and user.role.permissions:
        role_permissions = user.role.permissions if isinstance(user.role.permissions, list) else []
    
    # Create JWT token with role information
    expiration_time = current_time + timedelta(days=1)
    payload = {
        'user_id': user.user_id,
        'email': user.email,
        'role': user.role.role if user.role else "user",
        'role_id': user.role_id,
        'permissions': role_permissions,
        'full_name': user.full_name,
        'creation_time': current_time.isoformat(),
        'exp': expiration_time
    }
    session_token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    # jwt.encode returns bytes in PyJWT < 2.0, decode to str if needed
    if isinstance(session_token, bytes):
        session_token = session_token.decode('utf-8')
    
    response_data = {
        "message": "Login successful",
        "access_token": session_token,
        "expires_at": expiration_time.isoformat(),
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role.role if user.role else "user",
            "role_id": user.role_id,
            "department": user.department,
            "permissions": role_permissions
        }
    }
    
    response = make_response(jsonify(response_data), 200)
    response.set_cookie(
        'access_token',
        session_token,
        expires=expiration_time,
        httponly=True,
        secure=True,
        samesite='Lax'
    )
    return response
   
# def conformation_email(admin_id,full_name):
#     from app import create_app  
#     app = create_app()
#     mail = Mail(app)
#     email=Admin.query.filter_by(admin_id=admin_id).first()
#     if email:
#         email=email.email_id
#         get_email_text = Email.query.filter_by(email_id=email).first().email_text
#         msg = Message('Conformation Email', sender=SENDER_EMAIL, recipients=[get_email_text])
#         msg.html = f"""
#         <html>
#         <body>
#             <p>Hello,</p>
#             <p>{full_name}</p>
#             <p>Team has accepted your work. Congratulations!</p>
#             <p>Best regards,<br>ERP Team</p>
#         </body>
#         </html>
#         """
#     try:
#         mail.send(msg)
#         return "Verification email sent!"
#     except Exception as e:
#         return f"Failed to send email: {str(e)}"


# JWT Required Decorator
from functools import wraps

def jwt_required(f):
    """Decorator to require valid JWT token for protected routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        # Check for token in cookies if not in header
        if not token:
            token = request.cookies.get('access_token')
        
        # Check for token in request args (for backward compatibility)
        if not token:
            token = request.args.get('token')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            # Decode the token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            
            # Get the user from the database
            current_user = User.query.filter_by(user_id=data['user_id']).first()
            
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
            
            # Store user in g object for access in route
            g.current_user = current_user
            g.user_id = current_user.user_id
            g.user = {
                'user_id': current_user.user_id,
                'email': current_user.email,
                'full_name': current_user.full_name,
                'role_id': current_user.role_id,
                'role': current_user.role.role if current_user.role else "user"
            }
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        except Exception as e:
            log.error(f"JWT verification error: {str(e)}")
            return jsonify({'message': 'Token verification failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function