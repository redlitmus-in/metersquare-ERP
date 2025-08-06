from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid

class UserRole(str, Enum):
    BUSINESS_OWNER = "businessOwner"
    PROJECT_MANAGER = "projectManager"
    FACTORY_SUPERVISOR = "factorySupervisor"
    SITE_ENGINEER = "siteEngineer"
    TECHNICIANS = "technicians"
    PURCHASE_TEAM = "purchaseTeam"
    ACCOUNTS = "accounts"
    SUB_CONTRACTORS = "subContractors"
    VENDOR_MANAGEMENT = "vendorManagement"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"

class ProjectStatus(str, Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role_id: UserRole
    department: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Role Schemas
class RoleResponse(BaseModel):
    id: str
    title: str
    tier: str
    color: str
    icon: str
    description: Optional[str] = None

# Process Schemas
class ProcessResponse(BaseModel):
    id: str
    role_id: str
    name: str
    description: Optional[str] = None
    frequency: str
    icon: Optional[str] = None
    approval_limit: Optional[str] = None
    steps: Optional[List[str]] = None

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    client_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None

class ProjectCreate(ProjectBase):
    project_manager_id: Optional[uuid.UUID] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    actual_cost: Optional[float] = None

class ProjectResponse(ProjectBase):
    id: uuid.UUID
    project_manager_id: Optional[uuid.UUID] = None
    status: ProjectStatus
    actual_cost: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None

class TaskCreate(TaskBase):
    project_id: uuid.UUID
    process_id: str
    assigned_to: uuid.UUID

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None
    actual_hours: Optional[int] = None

class TaskResponse(TaskBase):
    id: uuid.UUID
    project_id: uuid.UUID
    process_id: str
    assigned_to: uuid.UUID
    created_by: uuid.UUID
    status: TaskStatus
    completed_at: Optional[datetime] = None
    actual_hours: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Purchase Request Schemas
class PurchaseRequestBase(BaseModel):
    item_name: str
    description: Optional[str] = None
    quantity: int
    unit_price: float
    vendor_name: Optional[str] = None

class PurchaseRequestCreate(PurchaseRequestBase):
    project_id: uuid.UUID

class PurchaseRequestUpdate(BaseModel):
    status: Optional[str] = None
    approved_by: Optional[uuid.UUID] = None

class PurchaseRequestResponse(PurchaseRequestBase):
    id: uuid.UUID
    project_id: uuid.UUID
    requested_by: uuid.UUID
    approved_by: Optional[uuid.UUID] = None
    total_amount: float
    status: str
    approval_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Authentication Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None

# Analytics Schemas
class DashboardStats(BaseModel):
    total_projects: int
    active_projects: int
    pending_tasks: int
    completed_tasks: int
    pending_approvals: int
    total_budget: float
    actual_spend: float

class ProjectProgress(BaseModel):
    project_id: uuid.UUID
    project_name: str
    progress_percentage: float
    tasks_completed: int
    total_tasks: int
    budget_used: float
    total_budget: float

# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str

class NotificationCreate(NotificationBase):
    user_id: uuid.UUID
    related_table: Optional[str] = None
    related_id: Optional[uuid.UUID] = None

class NotificationResponse(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True