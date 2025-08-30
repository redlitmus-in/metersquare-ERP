# MeterSquare ERP Backend - Flask + Supabase

## 📋 Overview

Flask backend API for MeterSquare ERP system with Supabase database integration, JWT authentication, and role-based access control.

## 🏗️ Architecture

```
backend/
├── app.py                      # Main Flask application
├── config/
│   ├── __init__.py
│   ├── supabase.py            # Supabase client configuration
│   ├── logging.py             # Logging configuration
│   └── routes.py              # Route initialization
├── controllers/
│   ├── __init__.py
│   └── auth_controller.py     # Authentication logic
├── models/
│   ├── __init__.py
│   ├── user.py                # User model
│   └── role.py                # Role model
├── routes/
│   ├── __init__.py
│   └── auth_route.py          # Authentication routes
├── utils/
│   ├── __init__.py
│   └── authentication.py      # Auth utilities (OTP, etc.)
├── migrations/                 # Database migrations
├── requirements.txt           # Python dependencies
└── .env.example              # Environment variables template
```

## 🚀 Setup Instructions

### 1. Prerequisites
- Python 3.8+
- Supabase account and project
- pip package manager

### 2. Installation

```bash
# Clone the repository
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# JWT Secret Key
SECRET_KEY=your-secure-secret-key

# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 4. Database Setup

Create the following tables in your Supabase project:

#### Users Table
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(255),
    role_id INTEGER REFERENCES roles(role_id),
    department VARCHAR(255),
    avatar_url VARCHAR(255),
    org_uuid VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_modified_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_org ON users(org_uuid);
```

#### Roles Table
```sql
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    last_modified_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(role);
```

### 5. Run the Application

```bash
# Development mode (recommended)
flask run

# Alternative: Run directly with Python
python app.py

# Production mode (with Gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "secure_password",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "role": "user",
    "department": "Engineering"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "secure_password"
}
```

Response:
```json
{
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
        "user_id": 1,
        "email": "user@example.com",
        "full_name": "John Doe",
        "role": "user",
        "department": "Engineering"
    }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {jwt_token}
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "full_name": "John Updated",
    "phone": "+9876543210",
    "department": "Management"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
    "old_password": "current_password",
    "new_password": "new_secure_password"
}
```

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
    "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
    "email": "user@example.com",
    "otp": "123456",
    "new_password": "new_secure_password"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {jwt_token}
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer your_jwt_token_here
```

Tokens expire after 24 hours by default.

## 👥 User Roles

The system supports the following roles with specific permissions:

- **admin** - Full system access
- **project_manager** - Project and procurement management
- **procurement** - Procurement operations
- **estimation** - Cost estimation
- **technical_director** - Technical approvals
- **accounts** - Financial operations
- **design** - Design specifications
- **site_supervisor** - Site operations
- **mep_supervisor** - MEP operations
- **factory_supervisor** - Factory operations
- **store_incharge** - Inventory management
- **user** - Basic user access

## 🛠️ Models

### User Model
- `find_by_email(email)` - Find user by email
- `find_by_id(user_id)` - Find user by ID
- `create(data)` - Create new user
- `update(data)` - Update user data
- `delete(soft=True)` - Delete user
- `check_password(password)` - Verify password
- `get_role()` - Get user's role

### Role Model
- `find_by_name(role_name)` - Find role by name
- `find_by_id(role_id)` - Find role by ID
- `create(data)` - Create new role
- `has_permission(resource, action)` - Check permissions
- `get_users()` - Get users with this role

## 🔧 Development

### Adding New Routes

1. Create controller in `controllers/`
2. Create route file in `routes/`
3. Register route in `config/routes.py`

### Database Migrations

Use Alembic for database migrations:

```bash
# Create migration
alembic revision -m "Description"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| SUPABASE_URL | Supabase project URL | Yes |
| SUPABASE_ANON_KEY | Supabase anonymous key | Yes |
| SECRET_KEY | JWT secret key | Yes |
| SMTP_HOST | Email server host | No |
| SMTP_PORT | Email server port | No |
| SMTP_USER | Email username | No |
| SMTP_PASSWORD | Email password | No |

## 🐛 Troubleshooting

### Common Issues

1. **Supabase connection error**
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY
   - Check network connectivity
   - Ensure tables exist in Supabase

2. **JWT token errors**
   - Verify SECRET_KEY is set
   - Check token expiration
   - Ensure token format is correct

3. **Password hashing issues**
   - Ensure werkzeug is installed
   - Check password field length in database

## 📄 License

This project is part of the MeterSquare ERP system.

## 🤝 Support

For issues or questions, contact the development team.