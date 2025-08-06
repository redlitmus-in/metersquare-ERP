-- Corporate Interiors ERP System Database Schema
-- Supabase PostgreSQL Schema - Production Ready

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET row_security = on;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE public.roles (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processes table
CREATE TABLE public.processes (
    id VARCHAR(100) PRIMARY KEY,
    role_id VARCHAR(50) REFERENCES roles(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    approval_limit VARCHAR(50),
    steps JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process connections (workflow relationships)
CREATE TABLE public.process_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_role VARCHAR(50) REFERENCES roles(id),
    from_process VARCHAR(100) REFERENCES processes(id),
    to_role VARCHAR(50) REFERENCES roles(id),
    to_process VARCHAR(100) REFERENCES processes(id),
    connection_type VARCHAR(20) NOT NULL, -- 'command', 'approval', 'feedback', 'data'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255),
    project_manager_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'planning', -- planning, in_progress, completed, on_hold
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (individual work items)
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    process_id VARCHAR(100) REFERENCES processes(id),
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, rejected
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase requests table
CREATE TABLE public.purchase_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    vendor_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, ordered, received
    approval_level VARCHAR(50), -- under_10k, mid_range, high_value
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors table
CREATE TABLE public.vendors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    category VARCHAR(100),
    rating DECIMAL(3,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOQ (Bill of Quantities) table
CREATE TABLE public.boq (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    created_by UUID REFERENCES users(id),
    item_description TEXT NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vendor_id UUID REFERENCES vendors(id),
    project_id UUID REFERENCES projects(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, overdue
    processed_by UUID REFERENCES users(id),
    paid_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance table
CREATE TABLE public.attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present', -- present, absent, half_day, holiday
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- approval, task, reminder, system
    related_table VARCHAR(50),
    related_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_project_manager_id ON projects(project_manager_id);
CREATE INDEX idx_purchase_requests_project_id ON purchase_requests(project_id);
CREATE INDEX idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Insert initial roles data
INSERT INTO roles (id, title, tier, color, icon, description) VALUES
('businessOwner', 'Business Owner', 'Management Tier', '#1e40af', 'Briefcase', 'Strategic decision making and high-value approvals'),
('projectManager', 'Project Manager', 'Management Tier', '#059669', 'UserCheck', 'Project coordination and mid-range approvals'),
('factorySupervisor', 'Factory Supervisor', 'Operations Tier', '#7c3aed', 'HardHat', 'Production management and quality control'),
('siteEngineer', 'Site Engineer', 'Operations Tier', '#ea580c', 'HardHat', 'Technical implementation and material planning'),
('technicians', 'Technicians', 'Operations Tier', '#0891b2', 'Wrench', 'Task execution and quality checkpoints'),
('purchaseTeam', 'Purchaser', 'Support Tier', '#dc2626', 'ShoppingCart', 'Procurement and vendor management'),
('accounts', 'Accounts & Finance', 'Support Tier', '#16a34a', 'DollarSign', 'Financial management and reporting'),
('subContractors', 'Sub Contractors', 'Support Tier', '#8b5cf6', 'Building', 'Specialized work execution'),
('vendorManagement', 'Vendor Management', 'Support Tier', '#f59e0b', 'Truck', 'Vendor relationships and performance');

-- Insert initial processes data with complete workflow coverage
INSERT INTO processes (id, role_id, name, description, frequency, icon, approval_limit, steps) VALUES
-- Business Owner processes
('strategic-planning', 'businessOwner', 'Strategic Decision Making', 'Review executive dashboard, analyze KPIs, make strategic decisions', 'Weekly', 'BarChart3', null, 
 '["Monitor executive dashboard and analytics", "Review performance metrics and KPIs", "Analyze business trends and market data", "Make strategic decisions and set direction", "Communicate strategic priorities to Project Manager"]'::jsonb),
('budget-approval', 'businessOwner', 'High-Value Purchase Approval', 'Approve purchases above ₹50,000 with budget consideration', 'As Required', 'DollarSign', 'Above ₹50,000',
 '["Receive purchase approval request from Project Manager", "Review purchase details and budget impact", "Analyze cost-benefit and strategic alignment", "Approve or reject based on business priorities", "Update budget allocation and track spending"]'::jsonb),
('budget-management', 'businessOwner', 'Budget Management', 'Oversee budget planning, allocation, and financial control', 'Monthly', 'Target', null,
 '["Review and approve annual budget plans", "Monitor budget utilization across projects", "Analyze financial performance and trends", "Make budget adjustments as needed", "Ensure financial compliance and reporting"]'::jsonb),

-- Project Manager processes
('project-planning', 'projectManager', 'Project Planning & Execution', 'End-to-end project management from planning to delivery', 'Per Project', 'Calendar', null,
 '["Receive project requirements and objectives", "Create detailed project plan and timeline", "Allocate resources and assign team members", "Monitor progress and manage risks", "Ensure quality delivery and client satisfaction"]'::jsonb),
('mid-range-approval', 'projectManager', 'Mid-Range Purchase Approval', 'Approve purchases between ₹10,000-₹50,000', 'Daily', 'DollarSign', '₹10K-₹50K',
 '["Review purchase requests from teams", "Evaluate necessity and cost-effectiveness", "Check budget availability and constraints", "Approve or escalate to Business Owner", "Track purchase orders and deliveries"]'::jsonb),
('team-coordination', 'projectManager', 'Team Coordination', 'Coordinate between different teams and stakeholders', 'Daily', 'Users', null,
 '["Assign tasks to Factory Supervisor and Site Engineer", "Coordinate with Purchase Team for materials", "Manage Sub Contractor relationships", "Monitor progress and resolve conflicts", "Report status to Business Owner"]'::jsonb),

-- Factory Supervisor processes
('production-management', 'factorySupervisor', 'Production Management', 'Oversee manufacturing processes and quality control', 'Daily', 'HardHat', null,
 '["Review production schedules and capacity", "Monitor manufacturing processes and quality", "Coordinate with Site Engineer for technical requirements", "Manage technician assignments and workload", "Report production status to Project Manager"]'::jsonb),
('quality-control', 'factorySupervisor', 'Quality Control', 'Ensure product quality and standards compliance', 'Daily', 'CheckCircle', null,
 '["Inspect manufactured items for quality standards", "Document quality issues and corrective actions", "Coordinate with technicians for quality improvements", "Maintain quality control records", "Report quality metrics to Project Manager"]'::jsonb),

-- Site Engineer processes
('technical-implementation', 'siteEngineer', 'Technical Implementation', 'Handle technical specifications and site requirements', 'Daily', 'HardHat', null,
 '["Review technical specifications and drawings", "Plan material requirements and procurement", "Coordinate with Factory Supervisor for production", "Monitor site progress and technical compliance", "Report technical status to Project Manager"]'::jsonb),
('material-planning', 'siteEngineer', 'Material Planning', 'Plan and coordinate material requirements', 'Weekly', 'Package', null,
 '["Analyze project requirements and specifications", "Calculate material quantities and costs", "Coordinate with Purchase Team for procurement", "Track material delivery and inventory", "Update material status to Project Manager"]'::jsonb),

-- Technician processes
('task-execution', 'technicians', 'Task Execution', 'Execute assigned tasks and quality checkpoints', 'Daily', 'Wrench', null,
 '["Receive task assignments from Factory Supervisor", "Execute tasks according to specifications", "Perform quality checkpoints during work", "Report progress and issues to supervisor", "Complete task documentation and handover"]'::jsonb),
('quality-checkpoints', 'technicians', 'Quality Checkpoints', 'Perform quality checks during task execution', 'Daily', 'CheckCircle', null,
 '["Conduct quality checks at defined checkpoints", "Document quality measurements and results", "Report quality issues to supervisor", "Maintain quality control records", "Ensure compliance with quality standards"]'::jsonb),

-- Purchase Team processes
('procurement-management', 'purchaseTeam', 'Procurement Management', 'Handle purchase requests and vendor management', 'Daily', 'ShoppingCart', 'Under ₹10K',
 '["Receive purchase requests from teams", "Research vendors and obtain quotes", "Evaluate cost-effectiveness and quality", "Process purchase orders and track deliveries", "Maintain vendor relationships and performance"]'::jsonb),
('vendor-evaluation', 'purchaseTeam', 'Vendor Evaluation', 'Evaluate and manage vendor relationships', 'Monthly', 'Star', null,
 '["Assess vendor performance and reliability", "Review vendor pricing and quality", "Maintain vendor database and ratings", "Negotiate contracts and terms", "Report vendor performance to management"]'::jsonb),

-- Accounts processes
('financial-management', 'accounts', 'Financial Management', 'Handle financial reporting and budget tracking', 'Weekly', 'DollarSign', null,
 '["Monitor project budgets and expenditures", "Process invoices and payments", "Generate financial reports and analytics", "Track cost variances and trends", "Ensure financial compliance and controls"]'::jsonb),
('invoice-processing', 'accounts', 'Invoice Processing', 'Process vendor invoices and payments', 'Daily', 'FileText', null,
 '["Receive and review vendor invoices", "Verify invoice accuracy and approvals", "Process payments and update records", "Track payment status and due dates", "Maintain financial audit trail"]'::jsonb),

-- Sub Contractors processes
('specialized-work', 'subContractors', 'Specialized Work Execution', 'Execute specialized work as per contracts', 'Per Project', 'Building', null,
 '["Receive work specifications and requirements", "Execute specialized work according to standards", "Coordinate with Project Manager for deliverables", "Maintain quality and safety standards", "Report progress and completion status"]'::jsonb),

-- Vendor Management processes
('vendor-relationships', 'vendorManagement', 'Vendor Relationships', 'Manage vendor relationships and performance', 'Weekly', 'Truck', null,
 '["Maintain vendor database and contacts", "Monitor vendor performance and reliability", "Coordinate vendor communications and contracts", "Track vendor delivery and quality metrics", "Report vendor status to management"]'::jsonb);

-- Insert process connections for complete workflow
INSERT INTO process_connections (from_role, from_process, to_role, to_process, connection_type) VALUES
-- Command flows
('businessOwner', 'strategic-planning', 'projectManager', 'project-planning', 'command'),
('projectManager', 'team-coordination', 'factorySupervisor', 'production-management', 'command'),
('projectManager', 'team-coordination', 'siteEngineer', 'technical-implementation', 'command'),
('projectManager', 'team-coordination', 'purchaseTeam', 'procurement-management', 'command'),
('factorySupervisor', 'production-management', 'technicians', 'task-execution', 'command'),
('siteEngineer', 'technical-implementation', 'factorySupervisor', 'production-management', 'command'),
('siteEngineer', 'material-planning', 'purchaseTeam', 'procurement-management', 'command'),

-- Approval flows
('purchaseTeam', 'procurement-management', 'projectManager', 'mid-range-approval', 'approval'),
('projectManager', 'mid-range-approval', 'businessOwner', 'budget-approval', 'approval'),
('accounts', 'invoice-processing', 'projectManager', 'mid-range-approval', 'approval'),

-- Feedback flows
('technicians', 'task-execution', 'factorySupervisor', 'quality-control', 'feedback'),
('factorySupervisor', 'quality-control', 'projectManager', 'team-coordination', 'feedback'),
('purchaseTeam', 'procurement-management', 'projectManager', 'team-coordination', 'feedback'),

-- Data flows
('accounts', 'financial-management', 'businessOwner', 'budget-management', 'data'),
('vendorManagement', 'vendor-relationships', 'purchaseTeam', 'vendor-evaluation', 'data');

-- Enable RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Comprehensive RLS Policies
-- Users policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Project managers can view all users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager'))
);

-- Projects policies
CREATE POLICY "Users can view projects they are assigned to" ON projects FOR SELECT USING (
    project_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM tasks WHERE project_id = projects.id AND assigned_to = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager'))
);
CREATE POLICY "Project managers can manage projects" ON projects FOR ALL USING (
    project_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager'))
);

-- Tasks policies
CREATE POLICY "Users can view their assigned tasks" ON tasks FOR SELECT USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager'))
);
CREATE POLICY "Users can update their assigned tasks" ON tasks FOR UPDATE USING (
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager'))
);
CREATE POLICY "Project managers can create tasks" ON tasks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager'))
);

-- Purchase requests policies
CREATE POLICY "Users can view their purchase requests" ON purchase_requests FOR SELECT USING (
    requested_by = auth.uid() OR
    approved_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager', 'purchaseTeam'))
);
CREATE POLICY "Users can create purchase requests" ON purchase_requests FOR INSERT WITH CHECK (
    requested_by = auth.uid()
);
CREATE POLICY "Approvers can update purchase requests" ON purchase_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager', 'purchaseTeam'))
);

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Attendance policies
CREATE POLICY "Users can view their own attendance" ON attendance FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own attendance" ON attendance FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own attendance" ON attendance FOR UPDATE USING (user_id = auth.uid());

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_logs (user_id, action, table_name, record_id, new_values)
        VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_logs (user_id, action, table_name, record_id, old_values)
        VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create activity logging triggers for key tables
CREATE TRIGGER log_users_activity AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_projects_activity AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_tasks_activity AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER log_purchase_requests_activity AFTER INSERT OR UPDATE OR DELETE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION log_activity();