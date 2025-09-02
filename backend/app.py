from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from routes import initialize_routes
from config.db import initialize_db as initialize_sqlalchemy, db
from config.logging import get_logger
import os
# Load environment variables from .env file
load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "default-secret-key")
<<<<<<< Updated upstream
    
    CORS(app)  # Enable CORS
=======
    # db.create_all()

    # Configure CORS for development - more permissive settings
    CORS(app, 
         origins="*",  # Allow all origins in development
         allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         supports_credentials=True)
    
    # Add after_request handler to ensure CORS headers are always sent
    @app.after_request
    def after_request(response):
        # Allow requests from any origin in development
        origin = response.headers.get('Origin')
        if origin:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Request-ID'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
>>>>>>> Stashed changes

    logger = get_logger()  # Setup logging (make sure this returns something usable)

    initialize_sqlalchemy(app)  # Init SQLAlchemy ORM
    
    # Create all tables
    with app.app_context():
        db.create_all()

    initialize_routes(app)  # Register routes

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000, threaded=True)
