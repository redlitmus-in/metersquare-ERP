-- MeterSquare ERP - Reset and Sync Workflow Roles
-- This migration clears existing roles and populates with workflow-specific roles
-- Based on Material Purchases - Project Bound workflow

-- Start transaction
BEGIN;

-- Clear existing roles (CASCADE will handle foreign key constraints)
TRUNCATE TABLE roles RESTART IDENTITY CASCADE;

-- Insert workflow-specific roles matching the workflow diagram
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at) VALUES
-- Operations Tier
('siteSupervisor', 'Site Supervisor - Site operations and material requisition', 
 '{"permissions": ["create_purchase_request", "view_site_materials", "request_materials", "view_task_status"], "tier": "Operations", "level": 3, "approval_limit": 10000}'::jsonb, 
 true, false, NOW()),

('mepSupervisor', 'MEP Supervisor - MEP operations and material requisition', 
 '{"permissions": ["create_purchase_request", "view_mep_materials", "request_materials", "view_task_status"], "tier": "Operations", "level": 3, "approval_limit": 10000}'::jsonb, 
 true, false, NOW()),

-- Support Tier
('procurement', 'Procurement - Procurement and vendor management', 
 '{"permissions": ["manage_procurement", "vendor_evaluation", "create_purchase_orders", "manage_vendors", "process_requisitions", "qty_spec_flag_check"], "tier": "Support", "level": 3, "approval_limit": 10000}'::jsonb, 
 true, false, NOW()),

-- Management Tier
('projectManager', 'Project Manager - Project coordination and approvals', 
 '{"permissions": ["manage_projects", "approve_mid_range", "team_coordination", "pm_flag_approval", "qty_spec_approvals", "view_cost_analysis"], "tier": "Management", "level": 2, "approval_limit": 50000}'::jsonb, 
 true, false, NOW()),

-- Technical Tier
('design', 'Design - Design reference and technical inputs', 
 '{"permissions": ["review_specifications", "provide_reference_inputs", "design_approval", "technical_review"], "tier": "Technical", "level": 3, "approval_limit": 0}'::jsonb, 
 true, false, NOW()),

('estimation', 'Estimation - Cost estimation and validation', 
 '{"permissions": ["cost_analysis", "qty_spec_validation", "cost_flag_check", "budget_validation", "provide_cost_estimates"], "tier": "Technical", "level": 3, "approval_limit": 0}'::jsonb, 
 true, false, NOW()),

-- Support Tier
('accounts', 'Accounts - Financial management and payments', 
 '{"permissions": ["financial_management", "invoice_processing", "payment_transactions", "acknowledgement_processing", "financial_reporting"], "tier": "Support", "level": 3, "approval_limit": 0}'::jsonb, 
 true, false, NOW()),

-- Management Tier (Top Level)
('technicalDirector', 'Technical Director - Final approvals and technical decisions', 
 '{"permissions": ["final_approval", "flag_override", "technical_decisions", "approve_high_value", "strategic_planning"], "tier": "Management", "level": 1, "approval_limit": null}'::jsonb, 
 true, false, NOW());

-- Update existing users to map to correct roles (if any exist)
-- This will map old role names to new workflow role names
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role = 'projectManager')
WHERE role_id IN (SELECT role_id FROM roles WHERE role IN ('project_manager', 'projectmanager'));

UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role = 'procurement')
WHERE role_id IN (SELECT role_id FROM roles WHERE role IN ('purchaseTeam', 'purchase_team', 'purchaseteam'));

UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role = 'siteSupervisor')
WHERE role_id IN (SELECT role_id FROM roles WHERE role IN ('siteEngineer', 'site_engineer', 'siteengineer'));

UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role = 'technicalDirector')
WHERE role_id IN (SELECT role_id FROM roles WHERE role IN ('businessOwner', 'business_owner', 'businessowner'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_role ON roles(role);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_is_deleted ON roles(is_deleted);

-- Commit transaction
COMMIT;

-- Display inserted roles for verification
SELECT role_id, role, description, 
       permissions->>'tier' as tier,
       permissions->>'level' as level,
       permissions->>'approval_limit' as approval_limit,
       is_active
FROM roles 
WHERE is_deleted = false
ORDER BY (permissions->>'level')::int, role;