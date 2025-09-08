import logging
from routes.auth_route import auth_routes
from routes.purchase_workflow_routes import purchase_workflow_routes
from routes.estimation_routes import estimation_routes
from routes.project_manager_routes import project_manager_routes
from routes.site_supervisor_routes import site_supervisor_routes
from routes.procurement_routes import procurement_routes
from routes.technical_director_routes import technical_director_routes
from routes.account_routes import account_routes

# Import and register the routes from the route blueprints

def initialize_routes(app):
    app.register_blueprint(auth_routes)
    app.register_blueprint(purchase_workflow_routes)
    app.register_blueprint(estimation_routes)
    app.register_blueprint(project_manager_routes)
    app.register_blueprint(site_supervisor_routes)
    app.register_blueprint(procurement_routes)
    app.register_blueprint(technical_director_routes)
    app.register_blueprint(account_routes)