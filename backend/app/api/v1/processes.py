from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any
from app.models.schemas import RoleResponse, ProcessResponse
from app.core.database import get_supabase
from app.middleware.auth import get_current_user
import uuid

router = APIRouter()

@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(current_user = Depends(get_current_user)):
    """Get all roles"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("roles").select("*").order("tier").execute()
        
        return [RoleResponse(**role) for role in result.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch roles: {str(e)}"
        )

@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    current_user = Depends(get_current_user)
):
    """Get role by ID"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("roles").select("*").eq("id", role_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        return RoleResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch role: {str(e)}"
        )

@router.get("/", response_model=List[ProcessResponse])
async def get_processes(
    role_id: str = None,
    current_user = Depends(get_current_user)
):
    """Get all processes, optionally filtered by role"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("processes").select("*")
        
        if role_id:
            query = query.eq("role_id", role_id)
        
        result = query.order("role_id").execute()
        
        # Parse JSON steps field
        processes = []
        for process in result.data:
            process_data = ProcessResponse(**process)
            processes.append(process_data)
        
        return processes
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch processes: {str(e)}"
        )

@router.get("/{process_id}", response_model=ProcessResponse)
async def get_process(
    process_id: str,
    current_user = Depends(get_current_user)
):
    """Get process by ID"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("processes").select("*").eq("id", process_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Process not found"
            )
        
        return ProcessResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch process: {str(e)}"
        )

@router.get("/connections/workflow")
async def get_workflow_connections(current_user = Depends(get_current_user)):
    """Get all process workflow connections"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("process_connections").select("*").execute()
        
        return {"connections": result.data}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch workflow connections: {str(e)}"
        )

@router.get("/my-processes", response_model=List[ProcessResponse])
async def get_my_processes(current_user = Depends(get_current_user)):
    """Get processes for current user's role"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("processes").select("*").eq("role_id", current_user["role_id"]).execute()
        
        return [ProcessResponse(**process) for process in result.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch your processes: {str(e)}"
        )

@router.get("/role/{role_id}/workflow")
async def get_role_workflow(
    role_id: str,
    current_user = Depends(get_current_user)
):
    """Get complete workflow information for a specific role"""
    try:
        supabase = get_supabase()
        
        # Get role info
        role_result = supabase.table("roles").select("*").eq("id", role_id).execute()
        
        if not role_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        role = role_result.data[0]
        
        # Get processes for this role
        processes_result = supabase.table("processes").select("*").eq("role_id", role_id).execute()
        
        # Get incoming connections (processes that feed into this role)
        incoming_connections = supabase.table("process_connections").select("*").eq("to_role", role_id).execute()
        
        # Get outgoing connections (processes that this role feeds into)
        outgoing_connections = supabase.table("process_connections").select("*").eq("from_role", role_id).execute()
        
        return {
            "role": RoleResponse(**role),
            "processes": [ProcessResponse(**process) for process in processes_result.data],
            "incoming_connections": incoming_connections.data,
            "outgoing_connections": outgoing_connections.data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch role workflow: {str(e)}"
        )

@router.get("/hierarchy/organizational")
async def get_organizational_hierarchy(current_user = Depends(get_current_user)):
    """Get complete organizational hierarchy with roles and processes"""
    try:
        supabase = get_supabase()
        
        # Get all roles grouped by tier
        roles_result = supabase.table("roles").select("*").order("tier").execute()
        
        # Group roles by tier
        hierarchy = {
            "Management Tier": [],
            "Operations Tier": [],
            "Support Tier": []
        }
        
        for role in roles_result.data:
            tier = role["tier"]
            if tier in hierarchy:
                # Get processes for this role
                processes_result = supabase.table("processes").select("*").eq("role_id", role["id"]).execute()
                
                role_data = {
                    "role": RoleResponse(**role),
                    "processes": [ProcessResponse(**process) for process in processes_result.data]
                }
                
                hierarchy[tier].append(role_data)
        
        # Get all workflow connections
        connections_result = supabase.table("process_connections").select("*").execute()
        
        return {
            "hierarchy": hierarchy,
            "workflow_connections": connections_result.data
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch organizational hierarchy: {str(e)}"
        )