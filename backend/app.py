from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from config.routes import initialize_routes
from config.db import initialize_db as initialize_sqlalchemy, db
from config.logging import get_logger
import os

# Load environment variables from .env file
load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "default-secret-key")
    
    CORS(app)  # Enable CORS

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
