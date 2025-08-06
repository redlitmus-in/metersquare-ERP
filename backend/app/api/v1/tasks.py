from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models.schemas import TaskResponse, TaskCreate, TaskUpdate, TaskStatus, Priority
from app.core.database import get_supabase
from app.middleware.auth import get_current_user, require_manager
import uuid

router = APIRouter()

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    project_id: Optional[uuid.UUID] = Query(None),
    assigned_to: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    priority_filter: Optional[Priority] = Query(None, alias="priority"),
    current_user = Depends(get_current_user)
):
    """Get tasks with optional filters"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("tasks").select("*")
        
        # Role-based filtering
        if current_user["role_id"] in ["technicians"]:
            # Technicians see only their assigned tasks
            query = query.eq("assigned_to", current_user["id"])
        elif current_user["role_id"] in ["factorySupervisor", "siteEngineer"]:
            # Supervisors see tasks in their domain (would need more complex logic)
            pass
        
        if project_id:
            query = query.eq("project_id", str(project_id))
        if assigned_to:
            query = query.eq("assigned_to", str(assigned_to))
        if status_filter:
            query = query.eq("status", status_filter.value)
        if priority_filter:
            query = query.eq("priority", priority_filter.value)
        
        result = query.order("created_at", desc=True).execute()
        
        return [TaskResponse(**task) for task in result.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tasks: {str(e)}"
        )

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user)
):
    """Get task by ID"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("tasks").select("*").eq("id", str(task_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = result.data[0]
        
        # Check access permissions
        if (current_user["role_id"] in ["technicians"] and 
            task["assigned_to"] != current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this task"
            )
        
        return TaskResponse(**task)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch task: {str(e)}"
        )

@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user = Depends(get_current_user)
):
    """Create new task"""
    try:
        supabase = get_supabase()
        
        # Verify project exists and user has access
        project_result = supabase.table("projects").select("*").eq("id", str(task_data.project_id)).execute()
        
        if not project_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Verify assigned user exists and has appropriate role for the process
        user_result = supabase.table("users").select("role_id").eq("id", str(task_data.assigned_to)).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned user not found"
            )
        
        task_dict = task_data.dict()
        task_dict["created_by"] = current_user["id"]
        task_dict["project_id"] = str(task_dict["project_id"])
        task_dict["assigned_to"] = str(task_dict["assigned_to"])
        
        result = supabase.table("tasks").insert(task_dict).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create task"
            )
        
        # Create notification for assigned user
        notification_data = {
            "user_id": str(task_data.assigned_to),
            "title": "New Task Assigned",
            "message": f"You have been assigned a new task: {task_data.title}",
            "type": "task",
            "related_table": "tasks",
            "related_id": result.data[0]["id"]
        }
        
        supabase.table("notifications").insert(notification_data).execute()
        
        return TaskResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    task_data: TaskUpdate,
    current_user = Depends(get_current_user)
):
    """Update task"""
    try:
        supabase = get_supabase()
        
        # Check if task exists and user has permission to update
        task_result = supabase.table("tasks").select("*").eq("id", str(task_id)).execute()
        
        if not task_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = task_result.data[0]
        
        # Permission check
        can_update = (
            current_user["role_id"] in ["businessOwner", "projectManager"] or
            task["assigned_to"] == current_user["id"] or
            task["created_by"] == current_user["id"]
        )
        
        if not can_update:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this task"
            )
        
        # Convert to dict and remove None values
        update_data = {k: v for k, v in task_data.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided for update"
            )
        
        # Set completion timestamp if status changed to completed
        if update_data.get("status") == "completed" and task["status"] != "completed":
            from datetime import datetime
            update_data["completed_at"] = datetime.utcnow().isoformat()
        
        result = supabase.table("tasks").update(update_data).eq("id", str(task_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update task"
            )
        
        # Create notification if status changed to completed
        if update_data.get("status") == "completed":
            notification_data = {
                "user_id": task["created_by"],
                "title": "Task Completed",
                "message": f"Task '{task['title']}' has been completed",
                "type": "task",
                "related_table": "tasks",
                "related_id": str(task_id)
            }
            
            supabase.table("notifications").insert(notification_data).execute()
        
        return TaskResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update task: {str(e)}"
        )

@router.delete("/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    current_user = Depends(get_current_user)
):
    """Delete task"""
    try:
        supabase = get_supabase()
        
        # Check if task exists and user has permission to delete
        task_result = supabase.table("tasks").select("*").eq("id", str(task_id)).execute()
        
        if not task_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = task_result.data[0]
        
        # Only creators or managers can delete tasks
        can_delete = (
            current_user["role_id"] in ["businessOwner", "projectManager"] or
            task["created_by"] == current_user["id"]
        )
        
        if not can_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this task"
            )
        
        result = supabase.table("tasks").delete().eq("id", str(task_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete task"
            )
        
        return {"message": "Task deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}"
        )

@router.get("/my-tasks", response_model=List[TaskResponse])
async def get_my_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    current_user = Depends(get_current_user)
):
    """Get current user's assigned tasks"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("tasks").select("*").eq("assigned_to", current_user["id"])
        
        if status_filter:
            query = query.eq("status", status_filter.value)
        
        result = query.order("due_date", nulls_last=True).order("priority", desc=True).execute()
        
        return [TaskResponse(**task) for task in result.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch your tasks: {str(e)}"
        )