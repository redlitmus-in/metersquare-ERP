"""
Business Owner Controller
Handles business logic for executive operations
"""

from flask import g, request, jsonify
from datetime import datetime, timedelta
from config.db import db
from config.logging import get_logger
from sqlalchemy import func

log = get_logger()

def executive_dashboard():
    """Get executive dashboard with KPIs and metrics"""
    try:
        # Mock data for now - replace with actual database queries
        dashboard_data = {
            "kpis": {
                "total_revenue": 15000000,
                "active_projects": 12,
                "completion_rate": 85.5,
                "budget_utilization": 78.3,
                "employee_count": 150,
                "vendor_count": 45
            },
            "trends": {
                "revenue_trend": "+12.5%",
                "project_trend": "+3",
                "cost_trend": "-5.2%"
            },
            "recent_activities": [
                {
                    "type": "approval",
                    "description": "High-value purchase approved",
                    "amount": 75000,
                    "timestamp": datetime.utcnow().isoformat()
                }
            ],
            "alerts": [
                {
                    "level": "warning",
                    "message": "Project XYZ budget utilization at 95%"
                }
            ]
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        log.error(f"Error fetching executive dashboard: {str(e)}")
        return jsonify({"error": "Failed to fetch dashboard"}), 500

def get_business_kpis():
    """Get detailed KPIs"""
    try:
        kpis = {
            "financial": {
                "revenue": {
                    "current": 15000000,
                    "target": 18000000,
                    "percentage": 83.3
                },
                "profit_margin": {
                    "current": 22.5,
                    "target": 25.0,
                    "percentage": 90.0
                },
                "cost_savings": {
                    "current": 500000,
                    "target": 750000,
                    "percentage": 66.7
                }
            },
            "operational": {
                "project_completion": {
                    "on_time": 85,
                    "delayed": 15,
                    "percentage": 85.0
                },
                "resource_utilization": {
                    "current": 78,
                    "optimal": 85,
                    "percentage": 91.8
                },
                "quality_score": {
                    "current": 4.2,
                    "target": 4.5,
                    "percentage": 93.3
                }
            },
            "growth": {
                "new_clients": 8,
                "repeat_business": 75,
                "market_share": 12.5
            }
        }
        
        return jsonify(kpis), 200
        
    except Exception as e:
        log.error(f"Error fetching KPIs: {str(e)}")
        return jsonify({"error": "Failed to fetch KPIs"}), 500

def get_pending_high_value_approvals():
    """Get all pending high-value approvals (>₹50,000)"""
    try:
        # Mock data - replace with actual database query
        approvals = [
            {
                "id": 1,
                "type": "purchase_request",
                "description": "Heavy machinery purchase",
                "amount": 250000,
                "requested_by": "Project Manager",
                "project": "Construction Site A",
                "date": datetime.utcnow().isoformat(),
                "priority": "high",
                "status": "pending"
            },
            {
                "id": 2,
                "type": "vendor_contract",
                "description": "Annual maintenance contract",
                "amount": 180000,
                "requested_by": "Procurement Team",
                "vendor": "ABC Services Ltd",
                "date": datetime.utcnow().isoformat(),
                "priority": "medium",
                "status": "pending"
            }
        ]
        
        return jsonify({
            "approvals": approvals,
            "total_count": len(approvals),
            "total_amount": sum(a["amount"] for a in approvals)
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching high-value approvals: {str(e)}")
        return jsonify({"error": "Failed to fetch approvals"}), 500

def process_high_value_approval(request_id):
    """Process approval or rejection of high-value request"""
    try:
        data = request.get_json()
        action = data.get("action")  # "approve" or "reject"
        comments = data.get("comments", "")
        
        if action not in ["approve", "reject"]:
            return jsonify({"error": "Invalid action"}), 400
        
        # Mock processing - replace with actual database update
        result = {
            "request_id": request_id,
            "action": action,
            "processed_by": g.user.get("full_name"),
            "processed_at": datetime.utcnow().isoformat(),
            "comments": comments,
            "status": "approved" if action == "approve" else "rejected"
        }
        
        # Log the action
        log.info(f"High-value request {request_id} {action}ed by {g.user.get('email')}")
        
        return jsonify({
            "message": f"Request {action}ed successfully",
            "result": result
        }), 200
        
    except Exception as e:
        log.error(f"Error processing approval: {str(e)}")
        return jsonify({"error": "Failed to process approval"}), 500

def get_all_budgets():
    """Get all project budgets"""
    try:
        # Mock data - replace with actual database query
        budgets = [
            {
                "project_id": 1,
                "project_name": "Construction Site A",
                "total_budget": 5000000,
                "utilized": 3500000,
                "remaining": 1500000,
                "utilization_percentage": 70,
                "status": "on_track"
            },
            {
                "project_id": 2,
                "project_name": "Interior Design Project B",
                "total_budget": 2000000,
                "utilized": 1900000,
                "remaining": 100000,
                "utilization_percentage": 95,
                "status": "at_risk"
            }
        ]
        
        return jsonify({
            "budgets": budgets,
            "total_allocated": sum(b["total_budget"] for b in budgets),
            "total_utilized": sum(b["utilized"] for b in budgets)
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching budgets: {str(e)}")
        return jsonify({"error": "Failed to fetch budgets"}), 500

def update_project_budget(project_id):
    """Update project budget allocation"""
    try:
        data = request.get_json()
        new_budget = data.get("budget")
        reason = data.get("reason", "")
        
        if not new_budget or new_budget <= 0:
            return jsonify({"error": "Invalid budget amount"}), 400
        
        # Mock update - replace with actual database update
        result = {
            "project_id": project_id,
            "new_budget": new_budget,
            "updated_by": g.user.get("full_name"),
            "updated_at": datetime.utcnow().isoformat(),
            "reason": reason
        }
        
        log.info(f"Budget updated for project {project_id} by {g.user.get('email')}")
        
        return jsonify({
            "message": "Budget updated successfully",
            "result": result
        }), 200
        
    except Exception as e:
        log.error(f"Error updating budget: {str(e)}")
        return jsonify({"error": "Failed to update budget"}), 500

def get_strategic_projects_overview():
    """Get overview of strategic projects"""
    try:
        # Mock data - replace with actual database query
        projects = [
            {
                "id": 1,
                "name": "Expansion Project Alpha",
                "type": "strategic",
                "status": "in_progress",
                "progress": 45,
                "roi_projection": 25.5,
                "risk_level": "medium",
                "timeline": "Q2 2024 - Q4 2024"
            },
            {
                "id": 2,
                "name": "Digital Transformation Initiative",
                "type": "strategic",
                "status": "planning",
                "progress": 15,
                "roi_projection": 35.0,
                "risk_level": "low",
                "timeline": "Q3 2024 - Q2 2025"
            }
        ]
        
        return jsonify({
            "strategic_projects": projects,
            "total_count": len(projects),
            "average_progress": sum(p["progress"] for p in projects) / len(projects) if projects else 0
        }), 200
        
    except Exception as e:
        log.error(f"Error fetching strategic projects: {str(e)}")
        return jsonify({"error": "Failed to fetch strategic projects"}), 500

def generate_financial_reports():
    """Generate comprehensive financial reports"""
    try:
        # Mock report data - replace with actual calculations
        report = {
            "period": {
                "start": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end": datetime.utcnow().isoformat()
            },
            "summary": {
                "total_revenue": 5000000,
                "total_expenses": 3500000,
                "net_profit": 1500000,
                "profit_margin": 30.0
            },
            "breakdown": {
                "revenue_by_project": [
                    {"project": "Site A", "amount": 2000000},
                    {"project": "Site B", "amount": 1500000},
                    {"project": "Site C", "amount": 1500000}
                ],
                "expense_categories": [
                    {"category": "Materials", "amount": 1500000},
                    {"category": "Labor", "amount": 1000000},
                    {"category": "Equipment", "amount": 500000},
                    {"category": "Overhead", "amount": 500000}
                ]
            },
            "trends": {
                "revenue_growth": 12.5,
                "expense_growth": 8.3,
                "profit_growth": 18.7
            }
        }
        
        return jsonify(report), 200
        
    except Exception as e:
        log.error(f"Error generating financial reports: {str(e)}")
        return jsonify({"error": "Failed to generate reports"}), 500

def organization_overview():
    """Get organization structure and performance"""
    try:
        overview = {
            "structure": {
                "total_employees": 150,
                "departments": [
                    {"name": "Management", "count": 10},
                    {"name": "Operations", "count": 80},
                    {"name": "Support", "count": 60}
                ],
                "roles_distribution": {
                    "business_owner": 1,
                    "project_manager": 5,
                    "factory_supervisor": 8,
                    "site_engineer": 12,
                    "technician": 50,
                    "purchaser": 10,
                    "accounts": 8,
                    "vendor_management": 6,
                    "sub_contractor": 50
                }
            },
            "performance": {
                "productivity_index": 85.5,
                "employee_satisfaction": 78.0,
                "retention_rate": 92.0,
                "training_completion": 88.5
            },
            "capacity": {
                "current_utilization": 78,
                "max_capacity": 100,
                "available_capacity": 22
            }
        }
        
        return jsonify(overview), 200
        
    except Exception as e:
        log.error(f"Error fetching organization overview: {str(e)}")
        return jsonify({"error": "Failed to fetch overview"}), 500

def override_system_decision():
    """Override any decision in the system"""
    try:
        data = request.get_json()
        decision_type = data.get("type")
        decision_id = data.get("id")
        new_decision = data.get("new_decision")
        reason = data.get("reason")
        
        if not all([decision_type, decision_id, new_decision, reason]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Mock override - replace with actual implementation
        override_record = {
            "decision_type": decision_type,
            "decision_id": decision_id,
            "original_decision": "previous_value",
            "new_decision": new_decision,
            "overridden_by": g.user.get("full_name"),
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        log.warning(f"Decision override by {g.user.get('email')}: {decision_type} #{decision_id}")
        
        return jsonify({
            "message": "Decision overridden successfully",
            "override_record": override_record
        }), 200
        
    except Exception as e:
        log.error(f"Error overriding decision: {str(e)}")
        return jsonify({"error": "Failed to override decision"}), 500