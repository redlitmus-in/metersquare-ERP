from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models.schemas import UserResponse, UserUpdate
from app.core.database import get_supabase
from app.middleware.auth import get_current_user, require_manager
import uuid

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    role_id: Optional[str] = Query(None, description="Filter by role ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user = Depends(require_manager)
):
    """Get all users with optional filters (Manager+ only)"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("users").select("*")
        
        if role_id:
            query = query.eq("role_id", role_id)
        if department:
            query = query.eq("department", department)
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        result = query.execute()
        
        return [UserResponse(**user) for user in result.data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user = Depends(get_current_user)
):
    """Get user by ID"""
    try:
        supabase = get_supabase()
        
        # Check if user can access this profile (own profile or manager+)
        if (str(user_id) != current_user["id"] and 
            current_user["role_id"] not in ["businessOwner", "projectManager"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this profile"
            )
        
        result = supabase.table("users").select("*").eq("id", str(user_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user: {str(e)}"
        )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_data: UserUpdate,
    current_user = Depends(get_current_user)
):
    """Update user profile"""
    try:
        supabase = get_supabase()
        
        # Check if user can update this profile (own profile or manager+)
        if (str(user_id) != current_user["id"] and 
            current_user["role_id"] not in ["businessOwner", "projectManager"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this profile"
            )
        
        # Convert to dict and remove None values
        update_data = {k: v for k, v in user_data.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data provided for update"
            )
        
        result = supabase.table("users").update(update_data).eq("id", str(user_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(**result.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.delete("/{user_id}")
async def deactivate_user(
    user_id: uuid.UUID,
    current_user = Depends(require_manager)
):
    """Deactivate user (soft delete)"""
    try:
        supabase = get_supabase()
        
        # Prevent self-deactivation
        if str(user_id) == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )
        
        result = supabase.table("users").update({"is_active": False}).eq("id", str(user_id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "User deactivated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate user: {str(e)}"
        )

@router.get("/role/{role_id}/count")
async def get_users_count_by_role(
    role_id: str,
    current_user = Depends(require_manager)
):
    """Get count of active users by role"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("users").select("id", count="exact").eq("role_id", role_id).eq("is_active", True).execute()
        
        return {"role_id": role_id, "count": result.count}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user count: {str(e)}"
        )