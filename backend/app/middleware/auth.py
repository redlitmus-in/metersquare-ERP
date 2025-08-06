from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_supabase
from typing import Optional
import uuid

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user data"""
    try:
        token = credentials.credentials
        supabase = get_supabase()
        
        # Verify token with Supabase
        user = supabase.auth.get_user(token)
        
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user.user
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(user_data = Depends(verify_token)):
    """Get current user with additional profile data"""
    try:
        supabase = get_supabase()
        
        # Get user profile from our users table
        result = supabase.table("users").select("*").eq("id", user_data.id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching user profile"
        )

def require_role(allowed_roles: list):
    """Decorator to require specific roles"""
    def role_checker(current_user = Depends(get_current_user)):
        if current_user["role_id"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Specific role dependencies
def require_business_owner(current_user = Depends(get_current_user)):
    return require_role(["businessOwner"])(current_user)

def require_manager(current_user = Depends(get_current_user)):
    return require_role(["businessOwner", "projectManager"])(current_user)

def require_operations(current_user = Depends(get_current_user)):
    return require_role(["businessOwner", "projectManager", "factorySupervisor", "siteEngineer"])(current_user)