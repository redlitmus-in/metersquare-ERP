# MeterSquare ERP - API Endpoints Documentation

## Authentication Endpoints (OTP-Based)

### 1. User Registration
**Endpoint**: `POST /register`
**Payload**:
```json
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "9876543210",
  "role": "project_manager",  // Optional, default: "user"
  "department": "Management"   // Optional, auto-assigned based on role
}
```
**Response**:
```json
{
  "message": "User registered successfully. OTP sent to email for first login.",
  "user_id": 1,
  "email": "user@example.com",
  "otp": 123456  // Only in non-production
}
```

### 2. User Login (Step 1: Request OTP)
**Endpoint**: `POST /login`
**Payload**:
```json
{
  "email": "user@example.com",
  "role": "project_manager"  // Optional, for role-specific login
}
```
**Response**:
```json
{
  "message": "OTP sent successfully to your email",
  "email": "user@example.com",
  "otp_expiry": "5 minutes",
  "otp": 123456  // Only in non-production
}
```

### 3. OTP Verification (Step 2: Complete Login)
**Endpoint**: `POST /verification_otp`
**Payload**:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```
**Response**:
```json
{
  "message": "Login successful",
  "access_token": "jwt_token_here",
  "expires_at": "2024-01-02T12:00:00",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "9876543210",
    "role": "project_manager",
    "role_id": 2,
    "department": "Management",
    "permissions": ["manage_projects", "approve_mid_range", ...]
  }
}
```

### 4. Send OTP
**Endpoint**: `POST /send_otp`
**Payload**:
```json
{
  "email": "user@example.com"
}
```

### 5. Logout
**Endpoint**: `POST /logout`
**Headers**: Authorization: Bearer {token}
**Response**:
```json
{
  "message": "Successfully logged out"
}
```

## Protected User Endpoints

### 6. Get Current User
**Endpoint**: `GET /self`
**Headers**: Authorization: Bearer {token}
**Response**:
```json
{
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "9876543210",
    "role": "project_manager",
    "department": "Management",
    "is_active": true
  },
  "api_info": {
    "endpoint": "/self",
    "method": "GET",
    "authentication": "Required (Bearer token)"
  }
}
```

### 7. Update Profile
**Endpoint**: `PUT /profile`
**Headers**: Authorization: Bearer {token}
**Payload**:
```json
{
  "full_name": "John Updated",
  "phone": "9876543211",
  "department": "Operations"
}
```

## Role-Based Endpoints

### Business Owner Routes (`/api/business/*`)
- `GET /api/business/dashboard` - Executive dashboard
- `GET /api/business/kpis` - Key performance indicators
- `GET /api/business/approvals/high-value` - Pending high-value approvals
- `POST /api/business/approvals/high-value/{id}` - Process approval
- `GET /api/business/budgets` - All project budgets
- `PUT /api/business/budgets/{project_id}` - Update budget

### Project Manager Routes (`/api/projects/*`)
- `GET /api/projects/list` - List all projects
- `POST /api/projects/create` - Create new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}/update` - Update project
- `GET /api/projects/{id}/tasks` - Get project tasks
- `POST /api/projects/{id}/tasks/assign` - Assign tasks
- `GET /api/projects/approvals/mid-range` - Mid-range approvals
- `POST /api/projects/approvals/mid-range/{id}` - Process approval

### Procurement Routes (`/api/procurement/*`)
- `GET /api/procurement/requests` - All purchase requests
- `POST /api/procurement/requests/create` - Create purchase request
- `GET /api/procurement/vendors` - List vendors
- `POST /api/procurement/vendors/create` - Create vendor
- `GET /api/procurement/quotations` - All quotations
- `POST /api/procurement/orders/create` - Create purchase order

### Common Routes (`/api/common/*`)
- `GET /api/common/profile` - User profile
- `PUT /api/common/profile/update` - Update profile
- `GET /api/common/permissions` - User permissions
- `GET /api/common/notifications` - User notifications
- `GET /api/common/dashboard` - Role-specific dashboard
- `GET /api/common/tasks/my` - Assigned tasks

## Authentication Notes

1. **No Passwords**: The system uses OTP-only authentication. No passwords are stored.
2. **JWT Token**: Include in Authorization header as `Bearer {token}`
3. **Token Expiry**: Tokens expire after 24 hours
4. **Role Validation**: Some endpoints require specific roles (decorators applied)
5. **Permissions**: JWT includes user permissions for client-side validation

## Available Roles
- `business_owner` - Strategic decisions, unlimited approval
- `project_manager` - Project coordination, ₹50,000 approval limit
- `factory_supervisor` - Production management, ₹10,000 limit
- `site_engineer` - Technical implementation, ₹10,000 limit
- `technician` - Task execution, no approval rights
- `purchaser` - Procurement, ₹10,000 limit
- `accounts` - Financial management, payment processing
- `sub_contractor` - External work execution
- `vendor_management` - Vendor relations, ₹5,000 limit

## Database Changes

### Removed Fields from Users Table:
- `password` - No longer needed
- `avatar_url` - Removed
- `org_uuid` - Removed

### Added Fields to Users Table:
- `department` - User's department
- `last_otp_request` - Track OTP rate limiting
- `otp_attempts` - Failed OTP attempt counter

## Testing

1. **Seed Roles**: `python backend/utils/seed_roles.py --seed-roles`
2. **Create Test Users**: `python backend/utils/seed_roles.py --seed-users`
3. **List Roles**: `python backend/utils/seed_roles.py --list-roles`
4. **List Users**: `python backend/utils/seed_roles.py --list-users`

All test users login using OTP sent to their email addresses.