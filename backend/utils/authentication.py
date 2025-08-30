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
            <!-- (Your HTML/CSS email template here, same as you provided) -->
            <style>
            /* ... your CSS styles ... */
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="email-container">
                    <div class="header">
                        <h1 class="logo">ERP</h1>
                    </div>
                    <div class="content">
                        <h2 class="title">Welcome to ERP</h2>
                        <p class="message">
                            We're excited to have you join us! To ensure the security of your account,
                            please use the verification code below to complete your registration.
                        </p>
                        <div class="otp-container">
                            <div class="otp-code">{otp}</div>
                            <div class="timer">
                                This code will expire in <strong>5 minutes</strong>
                            </div>
                        </div>
                        <div class="warning">
                            If you didn't request this verification code, please ignore this email.
                            Your account security is important to us.
                        </div>
                    </div>
                    <div class="footer">
                        <p class="footer-text">Thank you for choosing</p>
                        <p class="company">ERP</p>
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
    
    # Fetch user by email
    user = User.query.filter_by(email=email_id, is_deleted=False).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get OTP data from storage
    otp_data = otp_storage.get(email_id)
    if not otp_data:
        return jsonify({"error": "OTP not found or expired"}), 400
    
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
    
    # OTP verified, remove from storage
    del otp_storage[email_id]
    
    # Create JWT token with 1-day expiry
    expiration_time = current_time + timedelta(days=1)
    payload = {
        'user_id': user.user_id,  # ✅ required
        'email': user.email,   # ✅ required
        'creation_time': current_time.isoformat(),
        'exp': expiration_time
    }
    session_token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    # jwt.encode returns bytes in PyJWT < 2.0, decode to str if needed
    if isinstance(session_token, bytes):
        session_token = session_token.decode('utf-8')
    
    response_data = {
        "access_token": session_token,
        "expires_at": expiration_time.isoformat(),
        "existing_user": True,
        "onboarding_status": True,
        "email_id": email_id,
        "message": "OTP Verified Successfully!"
    }
    
    response = make_response(jsonify(response_data), 200)
    response.set_cookie(
        'access_token',
        session_token,
        expires=expiration_time,
        httponly=True,
        secure=True,
        samesite='Lax'  # or 'Strict' depending on your requirements
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