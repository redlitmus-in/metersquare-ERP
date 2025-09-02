# routes/__init__.py

from flask import Flask
from .auth_route import auth_routes
from .business_owner_routes import business_routes
from .common_routes import common_routes
from .procurement_routes import procurement_routes
from .project_manager_routes import project_routes
from .purchase_workflow_routes import purchase_workflow_routes
from .role_routes import role_bp

def initialize_routes(app: Flask):
    """Initialize all application routes"""
    
    # Register all blueprints
    app.register_blueprint(auth_routes)
    app.register_blueprint(business_routes)
    app.register_blueprint(common_routes)
    app.register_blueprint(procurement_routes)
    app.register_blueprint(project_routes)
    app.register_blueprint(purchase_workflow_routes)
    app.register_blueprint(role_bp)
    
    return app