import logging
from routes.auth_route import auth_routes

# Import role management routes
try:
    from routes.role_routes import role_bp
except ImportError:
    role_bp = None

# Import role-specific route blueprints
try:
    from routes.business_owner_routes import business_routes
except ImportError:
    business_routes = None
    
try:
    from routes.project_manager_routes import project_routes
except ImportError:
    project_routes = None
    
try:
    from routes.procurement_routes import procurement_routes
except ImportError:
    procurement_routes = None
    
try:
    from routes.common_routes import common_routes
except ImportError:
    common_routes = None

def initialize_routes(app):
    """Register all route blueprints with the Flask app"""
    
    # Authentication routes (always required)
    app.register_blueprint(auth_routes)
    print("[OK] Registered auth routes")
    
    # Role management routes
    if role_bp:
        app.register_blueprint(role_bp)
        print("[OK] Registered role management routes")
    
    # Role-specific routes
    if business_routes:
        app.register_blueprint(business_routes)
        print("[OK] Registered business owner routes")
    
    if project_routes:
        app.register_blueprint(project_routes)
        print("[OK] Registered project manager routes")
    
    if procurement_routes:
        app.register_blueprint(procurement_routes)
        print("[OK] Registered procurement routes")
    
    # Common routes (shared across all roles)
    if common_routes:
        app.register_blueprint(common_routes)
        print("[OK] Registered common routes")
    
    print(f"[INFO] Total blueprints registered: {len(app.blueprints)}")
