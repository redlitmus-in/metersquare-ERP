from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models.schemas import ProjectResponse, ProjectCreate, ProjectUpdate, ProjectStatus
from app.core.database import get_supabase
from app.middleware.auth import get_current_user, require_manager
import uuid

router = APIRouter()

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    status_filter: Optional[ProjectStatus] = Query(None, alias="status"),
    project_manager_id: Optional[uuid.UUID] = Query(None),
    current_user = Depends(get_current_user)
):
    """Get projects with optional filters"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("projects").select("*")
        
        # Role-based filtering
        if current_user["role_id"] == "projectManager":
            # Project managers see only their projects
            query = query.eq("project_manager_id", current_user["id"])
        elif current_user["role_id"] not in ["businessOwner"]:
            # Other roles see projects they're involved in
            # This would need more complex logic based on tasks/assignments
            pass
        
        if status_filter:
            query = query.eq("status", status_filter.value)
        if project_manager_id:
            query = query.eq("project_manager_id", str(project_manager_id))
        
        result = query.order("created_at", desc=True).execute()
        
        return [ProjectResponse(**project) for project in result.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}"
        )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    current_user = Depends(get_current_user)
):
    """Get project by ID"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("projects").select("*").eq("id", str(project_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        project = result.data[0]
        
        # Check access permissions
        if (current_user["role_id"] not in ["businessOwner"] and 
            project["project_manager_id"] != current_user["id"]):
            # Additional logic to check if user is assigned to this project
            pass
        
        return ProjectResponse(**project)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}"
        )

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user = Depends(require_manager)
):
    """Create new project (Manager+ only)"""
    try:
        supabase = get_supabase()
        
        # Set project manager if not specified
        if not project_data.project_manager_id:
            if current_user["role_id"] == "projectManager":
                project_data.project_manager_id = uuid.UUID(current_user["id"])
        
        project_dict = project_data.dict()
        if project_dict["project_manager_id"]:
            project_dict["project_manager_id"] = str(project_dict["project_manager_id"])
        
        result = supabase.table("projects").insert(project_dict).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create project"
            )
        
        return ProjectResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    project_data: ProjectUpdate,
    current_user = Depends(get_current_user)
):
    """Update project"""
    try:
        supabase = get_supabase()
        
        # Check if user can update this project
        project_check = supabase.table("projects").select("project_manager_id").eq("id", str(project_id)).execute()
        
        if not project_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        project = project_check.data[0]
        
        if (current_user["role_id"] not in ["businessOwner"] and 
            project["project_manager_id"] != current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this project"
            )
        
        # Convert to dict and remove None values
        update_data = {k: v for k, v in project_data.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided for update"
            )
        
        result = supabase.table("projects").update(update_data).eq("id", str(project_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update project"
            )
        
        return ProjectResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        )

@router.delete("/{project_id}")
async def delete_project(
    project_id: uuid.UUID,
    current_user = Depends(require_manager)
):
    """Delete project (Manager+ only)"""
    try:
        supabase = get_supabase()
        
        # Check if project has active tasks
        tasks_check = supabase.table("tasks").select("id", count="exact").eq("project_id", str(project_id)).neq("status", "completed").execute()
        
        if tasks_check.count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete project with active tasks"
            )
        
        result = supabase.table("projects").delete().eq("id", str(project_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return {"message": "Project deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )

@router.get("/{project_id}/progress")
async def get_project_progress(
    project_id: uuid.UUID,
    current_user = Depends(get_current_user)
):
    """Get project progress statistics"""
    try:
        supabase = get_supabase()
        
        # Get project info
        project_result = supabase.table("projects").select("*").eq("id", str(project_id)).execute()
        
        if not project_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        project = project_result.data[0]
        
        # Get task statistics
        tasks_result = supabase.table("tasks").select("status", count="exact").eq("project_id", str(project_id)).execute()
        
        total_tasks = tasks_result.count
        
        completed_tasks_result = supabase.table("tasks").select("id", count="exact").eq("project_id", str(project_id)).eq("status", "completed").execute()
        
        completed_tasks = completed_tasks_result.count
        
        progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "project_id": project_id,
            "project_name": project["name"],
            "progress_percentage": round(progress_percentage, 2),
            "tasks_completed": completed_tasks,
            "total_tasks": total_tasks,
            "budget_used": project.get("actual_cost", 0),
            "total_budget": project.get("budget", 0),
            "status": project["status"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project progress: {str(e)}"
        )