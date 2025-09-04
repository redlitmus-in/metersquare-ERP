from flask import g, request, jsonify
from datetime import datetime
from sqlalchemy import and_, desc
from config.logging import get_logger
from config.db import db
from models.role import Role
from models.purchase import Purchase
from models.material import Material
from models.purchase_status import PurchaseStatus
from models.approval import Approval

log = get_logger()

def get_all_procurement():
    """Get all procurement requests that have been sent via email"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401
        
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'procurement':
            return jsonify({"error": "Invalid role"}), 403
        
        procurement_purchases = Purchase.query.filter_by(email_sent=True, is_deleted=False).order_by(desc(Purchase.created_at)).all()
        
        # Convert Purchase objects to dictionaries with related data
        procurement_data = []
        for purchase in procurement_purchases:
            # Get materials for this purchase
            materials = []
            if purchase.material_ids:
                material_objects = Material.query.filter(
                    and_(
                        Material.is_deleted == False,
                        Material.material_id.in_(purchase.material_ids)
                    )
                ).all()
                
                for mat in material_objects:
                    materials.append({
                        'material_id': mat.material_id,
                        'description': mat.description,
                        'specification': mat.specification,
                        'unit': mat.unit,
                        'quantity': mat.quantity,
                        'category': mat.category,
                        'cost': mat.cost,
                        'priority': mat.priority,
                        'design_reference': mat.design_reference
                    })
            
            # Get approvals for this purchase
            approvals = Approval.query.filter_by(purchase_id=purchase.purchase_id).all()
            approval_data = []
            for app in approvals:
                approval_data.append({
                    'approval_id': app.approval_id,
                    'reviewer_role': app.reviewer_role,
                    'status': app.status,
                    'comments': app.comments,
                    'reviewed_at': app.reviewed_at.isoformat() if app.reviewed_at else None,
                    'reviewed_by': app.reviewed_by,
                    'created_at': app.created_at.isoformat() if app.created_at else None
                })
            
            # Get latest status
            latest_status = PurchaseStatus.get_latest_status_by_role(purchase.purchase_id, 'procurement')
            
            purchase_dict = purchase.to_dict()
            purchase_dict['materials'] = materials
            purchase_dict['approvals'] = approval_data
            purchase_dict['latest_status'] = latest_status.status if latest_status else 'pending'
            purchase_dict['status_date'] = latest_status.decision_date.isoformat() if latest_status and latest_status.decision_date else None
            
            procurement_data.append(purchase_dict)
        
        return jsonify({
            "success": True,
            "procurement": procurement_data,
            "total_count": len(procurement_data)
        }), 200
    except Exception as e:
        log.error(f"Error fetching procurement: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_procurement_dashboard():
    """Get procurement dashboard data"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401
        
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'procurement':
            return jsonify({"error": "Invalid role"}), 403
        
        # Get procurement metrics
        total_requests = Purchase.query.filter_by(is_deleted=False).count()
        pending_review = Purchase.query.filter(
            and_(
                Purchase.is_deleted == False,
                Purchase.email_sent == True
            )
        ).count()
        
        # Get recent requests
        recent_requests = Purchase.query.filter_by(is_deleted=False).order_by(desc(Purchase.created_at)).limit(10).all()
        
        recent_data = []
        for purchase in recent_requests:
            recent_data.append({
                'purchase_id': purchase.purchase_id,
                'requested_by': purchase.requested_by,
                'site_location': purchase.site_location,
                'purpose': purchase.purpose,
                'created_at': purchase.created_at.isoformat() if purchase.created_at else None,
                'email_sent': purchase.email_sent
            })
        
        dashboard_data = {
            'metrics': {
                'total_requests': total_requests,
                'pending_review': pending_review,
                'completed_reviews': total_requests - pending_review,
                'completion_rate': round(((total_requests - pending_review) / total_requests * 100), 2) if total_requests > 0 else 0
            },
            'recent_requests': recent_data
        }
        
        return jsonify({
            "success": True,
            "dashboard_data": dashboard_data
        }), 200
    except Exception as e:
        log.error(f"Error fetching procurement dashboard: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_procurement_by_id(purchase_id):
    """Get specific procurement request by ID"""
    try:
        current_user = g.user
        if not current_user:
            return jsonify({"error": "Not logged in"}), 401
        
        role = Role.query.filter_by(role_id=current_user['role_id'], is_deleted=False).first()
        if not role or role.role != 'procurement':
            return jsonify({"error": "Invalid role"}), 403
        
        purchase = Purchase.query.filter_by(purchase_id=purchase_id, is_deleted=False).first()
        if not purchase:
            return jsonify({"error": "Purchase request not found"}), 404
        
        # Get materials
        materials = []
        if purchase.material_ids:
            material_objects = Material.query.filter(
                and_(
                    Material.is_deleted == False,
                    Material.material_id.in_(purchase.material_ids)
                )
            ).all()
            
            for mat in material_objects:
                materials.append({
                    'material_id': mat.material_id,
                    'description': mat.description,
                    'specification': mat.specification,
                    'unit': mat.unit,
                    'quantity': mat.quantity,
                    'category': mat.category,
                    'cost': mat.cost,
                    'priority': mat.priority,
                    'design_reference': mat.design_reference
                })
        
        # Get all statuses
        all_statuses = PurchaseStatus.get_all_role_statuses(purchase_id)
        status_history = PurchaseStatus.get_status_history(purchase_id)
        
        purchase_data = purchase.to_dict()
        purchase_data['materials'] = materials
        purchase_data['role_statuses'] = [status.to_dict() for status in all_statuses]
        purchase_data['status_history'] = [status.to_dict() for status in status_history]
        
        return jsonify({
            "success": True,
            "purchase": purchase_data
        }), 200
    except Exception as e:
        log.error(f"Error fetching procurement by ID: {str(e)}")
        return jsonify({"error": str(e)}), 500