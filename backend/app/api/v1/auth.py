from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import LoginRequest, LoginResponse, UserCreate, UserResponse
from app.core.database import get_supabase
from app.middleware.auth import get_current_user
import uuid

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Authenticate user and return access token"""
    try:
        supabase = get_supabase()
        
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Get user profile
        user_profile = supabase.table("users").select("*").eq("id", auth_response.user.id).execute()
        
        if not user_profile.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        user_data = user_profile.data[0]
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            user=UserResponse(**user_data)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register new user"""
    try:
        supabase = get_supabase()
        
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )
        
        # Create user profile
        user_profile_data = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role_id": user_data.role_id,
            "department": user_data.department,
            "phone": user_data.phone,
            "avatar_url": user_data.avatar_url
        }
        
        profile_response = supabase.table("users").insert(user_profile_data).execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )
        
        return UserResponse(**profile_response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/logout")
async def logout():
    """Logout user"""
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(**current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: dict,
    current_user = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        supabase = get_supabase()
        
        # Update user profile
        update_response = supabase.table("users").update(user_data).eq("id", current_user["id"]).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        return UserResponse(**update_response.data[0])
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )