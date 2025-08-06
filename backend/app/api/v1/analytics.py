from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date
from app.models.schemas import DashboardStats, ProjectProgress
from app.core.database import get_supabase
from app.middleware.auth import get_current_user, require_manager, require_business_owner
import uuid

router = APIRouter()

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user = Depends(get_current_user)):
    """Get dashboard statistics for current user"""
    try:
        supabase = get_supabase()
        
        # Role-based dashboard data
        if current_user["role_id"] == "businessOwner":
            # Business Owner sees everything
            return await get_executive_dashboard(supabase)
        elif current_user["role_id"] == "projectManager":
            # Project Manager sees their projects
            return await get_project_manager_dashboard(supabase, current_user["id"])
        else:
            # Other roles see personalized dashboard
            return await get_personal_dashboard(supabase, current_user)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}"
        )

async def get_executive_dashboard(supabase) -> DashboardStats:
    """Get executive dashboard for Business Owner"""
    # Total projects
    total_projects_result = supabase.table("projects").select("id", count="exact").execute()
    
    # Active projects
    active_projects_result = supabase.table("projects").select("id", count="exact").in_("status", ["planning", "in_progress"]).execute()
    
    # Task statistics
    pending_tasks_result = supabase.table("tasks").select("id", count="exact").eq("status", "pending").execute()
    completed_tasks_result = supabase.table("tasks").select("id", count="exact").eq("status", "completed").execute()
    
    # Pending approvals (purchase requests)
    pending_approvals_result = supabase.table("purchase_requests").select("id", count="exact").eq("status", "pending").execute()
    
    # Budget statistics
    budget_result = supabase.table("projects").select("budget, actual_cost").execute()
    
    total_budget = sum(float(p.get("budget", 0) or 0) for p in budget_result.data)
    actual_spend = sum(float(p.get("actual_cost", 0) or 0) for p in budget_result.data)
    
    return DashboardStats(
        total_projects=total_projects_result.count,
        active_projects=active_projects_result.count,
        pending_tasks=pending_tasks_result.count,
        completed_tasks=completed_tasks_result.count,
        pending_approvals=pending_approvals_result.count,
        total_budget=total_budget,
        actual_spend=actual_spend
    )

async def get_project_manager_dashboard(supabase, manager_id: str) -> DashboardStats:
    """Get dashboard for Project Manager"""
    # Projects managed by this PM
    total_projects_result = supabase.table("projects").select("id", count="exact").eq("project_manager_id", manager_id).execute()
    
    active_projects_result = supabase.table("projects").select("id", count="exact").eq("project_manager_id", manager_id).in_("status", ["planning", "in_progress"]).execute()
    
    # Tasks in PM's projects
    project_ids_result = supabase.table("projects").select("id").eq("project_manager_id", manager_id).execute()
    project_ids = [p["id"] for p in project_ids_result.data]
    
    if project_ids:
        pending_tasks_result = supabase.table("tasks").select("id", count="exact").in_("project_id", project_ids).eq("status", "pending").execute()
        completed_tasks_result = supabase.table("tasks").select("id", count="exact").in_("project_id", project_ids).eq("status", "completed").execute()
        
        # Purchase requests for PM's projects
        pending_approvals_result = supabase.table("purchase_requests").select("id", count="exact").in_("project_id", project_ids).eq("status", "pending").execute()
        
        # Budget for PM's projects
        budget_result = supabase.table("projects").select("budget, actual_cost").eq("project_manager_id", manager_id).execute()
    else:
        pending_tasks_result = type('obj', (object,), {'count': 0})
        completed_tasks_result = type('obj', (object,), {'count': 0})
        pending_approvals_result = type('obj', (object,), {'count': 0})
        budget_result = type('obj', (object,), {'data': []})
    
    total_budget = sum(float(p.get("budget", 0) or 0) for p in budget_result.data)
    actual_spend = sum(float(p.get("actual_cost", 0) or 0) for p in budget_result.data)
    
    return DashboardStats(
        total_projects=total_projects_result.count,
        active_projects=active_projects_result.count,
        pending_tasks=pending_tasks_result.count,
        completed_tasks=completed_tasks_result.count,
        pending_approvals=pending_approvals_result.count,
        total_budget=total_budget,
        actual_spend=actual_spend
    )

async def get_personal_dashboard(supabase, current_user) -> DashboardStats:
    """Get personal dashboard for other roles"""
    # Personal tasks
    pending_tasks_result = supabase.table("tasks").select("id", count="exact").eq("assigned_to", current_user["id"]).eq("status", "pending").execute()
    completed_tasks_result = supabase.table("tasks").select("id", count="exact").eq("assigned_to", current_user["id"]).eq("status", "completed").execute()
    
    return DashboardStats(
        total_projects=0,
        active_projects=0,
        pending_tasks=pending_tasks_result.count,
        completed_tasks=completed_tasks_result.count,
        pending_approvals=0,
        total_budget=0,
        actual_spend=0
    )

@router.get("/projects/progress", response_model=List[ProjectProgress])
async def get_projects_progress(
    limit: Optional[int] = Query(10, le=50),
    current_user = Depends(require_manager)
):
    """Get progress for all projects (Manager+ only)"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("projects").select("*")
        
        if current_user["role_id"] == "projectManager":
            query = query.eq("project_manager_id", current_user["id"])
        
        projects_result = query.limit(limit).execute()
        
        progress_list = []
        
        for project in projects_result.data:
            # Get task statistics for this project
            total_tasks_result = supabase.table("tasks").select("id", count="exact").eq("project_id", project["id"]).execute()
            
            completed_tasks_result = supabase.table("tasks").select("id", count="exact").eq("project_id", project["id"]).eq("status", "completed").execute()
            
            total_tasks = total_tasks_result.count
            completed_tasks = completed_tasks_result.count
            
            progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            
            progress_list.append(ProjectProgress(
                project_id=uuid.UUID(project["id"]),
                project_name=project["name"],
                progress_percentage=round(progress_percentage, 2),
                tasks_completed=completed_tasks,
                total_tasks=total_tasks,
                budget_used=float(project.get("actual_cost", 0) or 0),
                total_budget=float(project.get("budget", 0) or 0)
            ))
        
        return progress_list
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project progress: {str(e)}"
        )

@router.get("/reports/financial")
async def get_financial_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user = Depends(require_business_owner)
):
    """Get financial report (Business Owner only)"""
    try:
        supabase = get_supabase()
        
        # Set default date range (last 30 days)
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get projects created in date range
        projects_result = supabase.table("projects").select("*").gte("created_at", start_date.isoformat()).lte("created_at", end_date.isoformat()).execute()
        
        # Get purchase requests in date range
        purchases_result = supabase.table("purchase_requests").select("*").gte("created_at", start_date.isoformat()).lte("created_at", end_date.isoformat()).execute()
        
        # Calculate financial metrics
        total_budget = sum(float(p.get("budget", 0) or 0) for p in projects_result.data)
        total_spent = sum(float(p.get("actual_cost", 0) or 0) for p in projects_result.data)
        
        purchase_requests_value = sum(float(p.get("total_amount", 0) or 0) for p in purchases_result.data)
        approved_purchases = sum(float(p.get("total_amount", 0) or 0) for p in purchases_result.data if p.get("status") == "approved")
        
        return {
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "projects": {
                "count": len(projects_result.data),
                "total_budget": total_budget,
                "total_spent": total_spent,
                "budget_utilization": (total_spent / total_budget * 100) if total_budget > 0 else 0
            },
            "purchases": {
                "total_requests": len(purchases_result.data),
                "total_value": purchase_requests_value,
                "approved_value": approved_purchases,
                "approval_rate": (len([p for p in purchases_result.data if p.get("status") == "approved"]) / len(purchases_result.data) * 100) if purchases_result.data else 0
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate financial report: {str(e)}"
        )

@router.get("/reports/productivity")
async def get_productivity_report(
    role_id: Optional[str] = Query(None),
    current_user = Depends(require_manager)
):
    """Get productivity report by role"""
    try:
        supabase = get_supabase()
        
        # Base query for users
        users_query = supabase.table("users").select("id, full_name, role_id")
        
        if role_id:
            users_query = users_query.eq("role_id", role_id)
        
        users_result = users_query.eq("is_active", True).execute()
        
        productivity_data = []
        
        for user in users_result.data:
            # Get task statistics for this user
            total_tasks = supabase.table("tasks").select("id", count="exact").eq("assigned_to", user["id"]).execute()
            
            completed_tasks = supabase.table("tasks").select("id", count="exact").eq("assigned_to", user["id"]).eq("status", "completed").execute()
            
            pending_tasks = supabase.table("tasks").select("id", count="exact").eq("assigned_to", user["id"]).eq("status", "pending").execute()
            
            in_progress_tasks = supabase.table("tasks").select("id", count="exact").eq("assigned_to", user["id"]).eq("status", "in_progress").execute()
            
            # Calculate productivity metrics
            completion_rate = (completed_tasks.count / total_tasks.count * 100) if total_tasks.count > 0 else 0
            
            productivity_data.append({
                "user_id": user["id"],
                "full_name": user["full_name"],
                "role_id": user["role_id"],
                "total_tasks": total_tasks.count,
                "completed_tasks": completed_tasks.count,
                "pending_tasks": pending_tasks.count,
                "in_progress_tasks": in_progress_tasks.count,
                "completion_rate": round(completion_rate, 2)
            })
        
        return {
            "role_filter": role_id,
            "users": productivity_data,
            "summary": {
                "total_users": len(productivity_data),
                "average_completion_rate": round(sum(u["completion_rate"] for u in productivity_data) / len(productivity_data), 2) if productivity_data else 0
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate productivity report: {str(e)}"
        )