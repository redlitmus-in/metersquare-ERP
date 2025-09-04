import logging
from routes.auth_route import auth_routes
from routes.purchase_workflow_routes import purchase_workflow_routes
from routes.estimation_routes import estimation_routes
from routes.project_manager_routes import project_manager_routes

# Import and register the routes from the route blueprints

def initialize_routes(app):
    app.register_blueprint(auth_routes)
    app.register_blueprint(purchase_workflow_routes)
    app.register_blueprint(estimation_routes)
    app.register_blueprint(project_manager_routes)