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

-- Vendors policies (for purchase team and management)
CREATE POLICY "Purchase team can manage vendors" ON vendors FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('purchaseTeam', 'vendorManagement', 'businessOwner', 'projectManager'))
);

-- Invoices policies (for accounts and management)
CREATE POLICY "Accounts can manage invoices" ON invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('accounts', 'businessOwner', 'projectManager'))
);

-- Activity logs policies (for management and audit)
CREATE POLICY "Management can view activity logs" ON activity_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_id IN ('businessOwner', 'projectManager'))
); 