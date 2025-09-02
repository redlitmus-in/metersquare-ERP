# 🚀 MeterSquare ERP - Complete Setup & Installation Guide

## ✅ System Overview

**MeterSquare ERP** implements a complete role-based authentication system with OTP login, matching the Material Purchases workflow diagram. No hardcoded values, no duplicates - everything is properly aligned.

## 📋 Prerequisites

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 16+** - [Download](https://nodejs.org/)
- **PostgreSQL 12+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

## 🎯 Quick Start (Automated)

### Windows:
```cmd
# Clone the repository (if not already done)
git clone <repository-url>
cd metersquare-ERP

# Run the automated setup
start_app.bat
```

### Linux/Mac:
```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd metersquare-ERP

# Make script executable
chmod +x start_app.sh

# Run the automated setup
./start_app.sh
```

## 📝 Manual Setup (Step-by-Step)

### Step 1: Database Setup

1. **Create PostgreSQL Database:**
```sql
CREATE DATABASE metersquare_erp;
```

2. **Run Migration:**
```bash
# Option A: Using psql
psql -U postgres -d metersquare_erp -f database/migrations/reset_workflow_roles.sql

# Option B: Using Python script
cd backend
python scripts/setup_database.py
```

### Step 2: Backend Configuration

1. **Create Backend Environment File:**
```bash
cd backend
cp .env.example .env
```

2. **Edit `.env` with your configuration:**
```env
SECRET_KEY=your-secret-key-here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metersquare_erp
DB_USER=postgres
DB_PASSWORD=your_password
SENDER_EMAIL=your-email@gmail.com
SENDER_EMAIL_PASSWORD=your-app-password
```

3. **Install Dependencies:**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

4. **Seed Database with Roles and Users:**
```bash
python utils/seed_roles.py --all
```

5. **Start Backend Server:**
```bash
python app.py
# Server runs on http://localhost:5000
```

### Step 3: Frontend Configuration

1. **Navigate to Frontend:**
```bash
cd ../frontend
```

2. **Environment is already configured:**
- `.env` file is pre-configured with correct API URL
- Points to Flask backend at `http://localhost:5000`

3. **Install Dependencies:**
```bash
npm install
```

4. **Start Frontend Server:**
```bash
npm run dev
# Server runs on http://localhost:5173
```

## 🔍 Verify Installation

Run the verification script to check everything is configured correctly:

```bash
python verify_setup.py
```

This will check:
- ✅ Python and Node.js installation
- ✅ Database connection
- ✅ All required files
- ✅ Environment configuration
- ✅ Backend API status

## 👥 Workflow Roles & Test Users

### Available Roles (From Workflow Diagram):

| Role | Description | Test Email | Permissions |
|------|-------------|------------|-------------|
| **Site Supervisor** | Initiates purchase requisitions | site.supervisor@metersquare.com | Create purchase requests |
| **MEP Supervisor** | MEP requisitions | mep.supervisor@metersquare.com | Create MEP requests |
| **Procurement** | Process with QTY/SPEC FLAG | procurement@metersquare.com | Process requisitions, vendor management |
| **Project Manager** | PM FLAG approval | pm@metersquare.com | Approve mid-range, team coordination |
| **Design** | Reference inputs | design@metersquare.com | Technical review, specifications |
| **Estimation** | COST FLAG validation | estimation@metersquare.com | Cost analysis, budget validation |
| **Accounts** | Payment processing | accounts@metersquare.com | Financial management, payments |
| **Technical Director** | Final FLAG approval | director@metersquare.com | Final approvals, override |

## 🔐 Login Process

1. **Navigate to:** http://localhost:5173/login
2. **Enter email:** (e.g., `pm@metersquare.com`)
3. **Click "Send OTP"**
4. **Check console/email for OTP** (in dev mode, OTP shows in response)
5. **Enter 6-digit OTP**
6. **Login successful** - Redirected to dashboard with assigned role

## 🏗️ System Architecture

```
metersquare-ERP/
├── backend/
│   ├── config/
│   │   ├── roles_config.py      # Single source of truth for roles
│   │   └── routes.py            # Route configuration
│   ├── controllers/
│   │   └── auth_controller.py   # OTP authentication
│   ├── models/
│   │   ├── user.py             # User model
│   │   └── role.py             # Role model
│   ├── utils/
│   │   ├── authentication.py    # OTP generation/verification
│   │   ├── rbac.py             # Role-based access control
│   │   └── seed_roles.py       # Database seeding
│   └── app.py                   # Flask application
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.ts         # Authentication API service
│   │   │   └── config.ts       # API configuration
│   │   ├── pages/
│   │   │   └── LoginPageOTP.tsx # OTP login page
│   │   └── utils/
│   │       └── environment.ts   # Environment configuration
│   └── .env                     # Frontend environment variables
│
└── database/
    └── migrations/
        └── reset_workflow_roles.sql # Database migration
```

## 🔄 Workflow Implementation

The system implements the complete Material Purchases workflow:

1. **Initiation** → Site/MEP Supervisor creates requisition
2. **QTY/SPEC FLAG** → Procurement validates specifications
3. **PM FLAG** → Project Manager approval
4. **COST FLAG** → Estimation validates costs
5. **FLAG** → Technical Director final approval
6. **Payment** → Accounts processes payment
7. **Completion** → Acknowledgment and closure

## 🛠️ Troubleshooting

### Backend won't start:
```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall dependencies
pip install -r requirements.txt

# Check database connection
python verify_setup.py
```

### Frontend won't start:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 16+
```

### Login issues:
- Ensure backend is running on port 5000
- Check CORS configuration in `app.py`
- Verify user exists in database
- Check OTP expiry (5 minutes)

### Database issues:
```bash
# Reset database and re-run migration
psql -U postgres -d metersquare_erp -f database/migrations/reset_workflow_roles.sql

# Re-seed users
cd backend
python utils/seed_roles.py --all
```

## 📊 API Endpoints

### Authentication:
- `POST /login` - Send OTP to email
- `POST /verification_otp` - Verify OTP and login
- `GET /self` - Get current user
- `POST /logout` - Logout user

### Roles:
- `GET /api/roles` - Get all workflow roles
- `GET /api/roles/database` - Get roles from database
- `POST /api/roles/sync` - Sync workflow roles to database

## 🎉 Success Indicators

When everything is working correctly:

1. ✅ `verify_setup.py` shows all checks passed
2. ✅ Backend API responds at http://localhost:5000/api/roles
3. ✅ Frontend loads at http://localhost:5173
4. ✅ Login page shows without errors
5. ✅ OTP is sent and can be verified
6. ✅ After login, user role is displayed
7. ✅ Dashboard loads with role-specific content

## 📚 Additional Resources

- **Setup Issues:** See `ROLE_LOGIN_SETUP.md`
- **Test Script:** `backend/scripts/test_login_flow.py`
- **Verification:** `verify_setup.py`
- **Database Migration:** `database/migrations/reset_workflow_roles.sql`

## 🔒 Security Notes

- **No passwords stored** - OTP-only authentication
- **JWT tokens** - 24-hour expiry
- **Role-based access** - Each role has specific permissions
- **CORS configured** - Only allows specific origins
- **Environment variables** - Sensitive data not in code

## 💡 Development Tips

1. **Watch backend logs:** Shows OTP in console for development
2. **Use test script:** `python backend/scripts/test_login_flow.py`
3. **Check role permissions:** Defined in `backend/config/roles_config.py`
4. **Frontend hot reload:** Changes reflect immediately
5. **Database reset:** Migration script can be re-run safely

---

## ✨ Complete Feature List

- ✅ **8 Workflow Roles** matching diagram exactly
- ✅ **OTP Authentication** with email delivery
- ✅ **No Hardcoding** - all configuration-driven
- ✅ **No Duplicates** - single source of truth
- ✅ **Clean Database** - migration resets completely
- ✅ **Role Permissions** - properly enforced
- ✅ **CORS Configured** - frontend-backend communication
- ✅ **Environment Files** - proper configuration
- ✅ **Test Users** - ready for testing
- ✅ **Verification Script** - check setup status
- ✅ **Startup Scripts** - one-click launch
- ✅ **Complete Documentation** - everything explained

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** Current

## 🎯 You're All Set!

Run `start_app.bat` (Windows) or `./start_app.sh` (Linux/Mac) and the entire application will start automatically. Login with any test user email to see the role-based system in action!