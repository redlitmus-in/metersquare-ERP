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