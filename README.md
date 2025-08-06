# Corporate Interiors ERP System

A comprehensive Enterprise Resource Planning system designed specifically for interior design businesses, featuring role-based access control, process workflow management, and real-time collaboration.

## 🏗️ Architecture Overview hi

### System Components

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **UI Components**: Headless UI + Lucide Icons

### Role-Based Hierarchy

#### Management Tier
- **Business Owner**: Strategic decision making, high-value approvals (>₹50K), budget management
- **Project Manager**: Project coordination, mid-range approvals (₹10K-₹50K), team management

#### Operations Tier
- **Factory Supervisor**: Production management, quality control, team leadership
- **Site Engineer**: Technical implementation, material planning, progress monitoring
- **Technicians**: Task execution, quality checkpoints, time tracking

#### Support Tier
- **Purchase Team**: Procurement management, vendor relations, cost optimization
- **Accounts & Finance**: Invoice processing, BOQ management, financial reporting
- **Sub Contractors**: Specialized work execution, progress reporting
- **Vendor Management**: Vendor onboarding, performance tracking, contract management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- Supabase account
- PostgreSQL (if running locally)

### Database Setup

1. **Create Supabase Project**
   ```bash
   # Create new project at https://supabase.com
   # Copy your project URL and anon key
   ```

2. **Run Database Schema**
   ```sql
   -- Execute the SQL in database/supabase_schema.sql in your Supabase SQL editor
   ```

3. **Configure Environment Variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your Supabase credentials
   
   # Frontend
   cd frontend
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/api/docs`
- Alternative Docs: `http://localhost:8000/api/redoc`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 📋 Core Features

### Process Flow Management
- **Interactive Workflow Visualization**: Click any role to see process connections
- **Hierarchical Organization**: Management → Operations → Support tiers
- **Real-time Process Tracking**: Monitor task progress across departments

### Project Management
- **End-to-end Project Lifecycle**: From planning to completion
- **Budget Tracking**: Monitor spending vs. allocated budget
- **Resource Allocation**: Assign tasks and track team performance
- **Client Management**: Track client information and project details

### Task Management
- **Role-based Task Assignment**: Tasks automatically routed based on processes
- **Priority Management**: Urgent, High, Medium, Low priority levels
- **Progress Tracking**: Real-time status updates and completion tracking
- **Time Logging**: Estimated vs. actual hours tracking

### Approval Workflows
- **Hierarchical Approvals**: 
  - Under ₹10K: Auto-approved
  - ₹10K-₹50K: Project Manager approval
  - Above ₹50K: Business Owner approval
- **Purchase Request Management**: Complete procurement workflow
- **Budget Control**: Automatic budget checks and notifications

### Financial Management
- **BOQ (Bill of Quantities)**: Detailed cost breakdowns
- **Invoice Processing**: Automated invoice workflows
- **Budget Monitoring**: Real-time budget utilization tracking
- **Financial Reporting**: Comprehensive financial analytics

## 🔧 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/logout` - User logout

### Users
- `GET /api/v1/users` - List users (Manager+ only)
- `GET /api/v1/users/{id}` - Get user details
- `PUT /api/v1/users/{id}` - Update user profile

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project (Manager+ only)
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `GET /api/v1/projects/{id}/progress` - Get project progress

### Tasks
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/my-tasks` - Get user's assigned tasks
- `PUT /api/v1/tasks/{id}` - Update task status

### Processes
- `GET /api/v1/processes/roles` - List all roles
- `GET /api/v1/processes` - List all processes
- `GET /api/v1/processes/hierarchy/organizational` - Get complete hierarchy
- `GET /api/v1/processes/connections/workflow` - Get workflow connections

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/projects/progress` - Project progress report
- `GET /api/v1/analytics/reports/financial` - Financial reports (Business Owner only)

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions based on user roles
- **Row Level Security**: Database-level security policies
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Configurable cross-origin resource sharing

## 📊 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `roles` - System roles and permissions
- `processes` - Business processes and workflows
- `process_connections` - Workflow relationships
- `projects` - Project information
- `tasks` - Individual work items
- `purchase_requests` - Procurement requests
- `invoices` - Financial invoices
- `notifications` - System notifications

### Relationships
- Users belong to roles
- Projects have managers and team members
- Tasks are assigned to users and linked to processes
- Purchase requests require approvals based on amount
- All activities are logged for audit trails

## 🎨 UI/UX Features

### Design System
- **Tailwind CSS**: Utility-first CSS framework
- **Consistent Color Palette**: Role-specific color coding
- **Responsive Design**: Mobile-first responsive layouts
- **Accessibility**: WCAG compliant components

### User Experience
- **Role-specific Dashboards**: Customized views per user role
- **Interactive Process Flow**: Visual workflow representation
- **Real-time Updates**: Live status updates and notifications
- **Intuitive Navigation**: Role-based menu structure

## 🚀 Deployment

### Production Build

```bash
# Backend
cd backend
pip install -r requirements.txt
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend
cd frontend
npm run build
# Serve the dist folder with your preferred web server
```

### Environment Variables

#### Backend (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET_KEY=your_jwt_secret_key
DATABASE_URL=postgresql://...
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=https://your-api-domain.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📈 Performance Optimizations

- **Code Splitting**: Lazy-loaded route components
- **State Management**: Zustand for efficient state updates
- **API Optimization**: Batched requests and caching
- **Database Indexing**: Optimized queries with proper indexes
- **Image Optimization**: Compressed and lazy-loaded images

## 🔄 Development Workflow

1. **Feature Development**: Create feature branches from main
2. **Code Review**: All changes require peer review
3. **Testing**: Comprehensive unit and integration tests
4. **Documentation**: Update docs with new features
5. **Deployment**: Automated CI/CD pipeline

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for Corporate Interiors business operations.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api/docs`

---

**Built with ❤️ for efficient interior design project management**