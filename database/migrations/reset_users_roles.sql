-- Complete Database Reset Script for Users and Roles
-- MeterSquare ERP - Workflow-based Role System
-- WARNING: This script will DELETE all existing users and roles data

-- =====================================================
-- STEP 1: Backup existing data
-- =====================================================
CREATE TABLE IF NOT EXISTS users_backup_before_reset AS 
SELECT * FROM users;

CREATE TABLE IF NOT EXISTS roles_backup_before_reset AS 
SELECT * FROM roles;

-- =====================================================
-- STEP 2: Clean existing data
-- =====================================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Delete all existing users
DELETE FROM users;

-- Delete all existing roles
DELETE FROM roles;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Reset sequences
ALTER SEQUENCE IF EXISTS users_user_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS roles_role_id_seq RESTART WITH 1;

-- =====================================================
-- STEP 3: Insert Workflow-based Roles
-- =====================================================

-- 1. Site Supervisor
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'siteSupervisor',
    'Site operations and material requisition',
    '{
        "can_initiate": ["purchase_requisition"],
        "can_approve": [],
        "permissions": ["create_purchase_request", "view_site_materials", "request_materials", "view_task_status"],
        "approval_limit": 10000
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- 2. MEP Supervisor
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'mepSupervisor',
    'MEP operations and material requisition',
    '{
        "can_initiate": ["purchase_requisition"],
        "can_approve": [],
        "permissions": ["create_purchase_request", "view_mep_materials", "request_materials", "view_task_status"],
        "approval_limit": 10000
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- 3. Procurement
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'procurement',
    'Procurement and vendor management',
    '{
        "can_approve": ["small_purchases"],
        "permissions": ["manage_procurement", "vendor_evaluation", "create_purchase_orders", "manage_vendors", "process_requisitions", "qty_spec_flag_check"],
        "approval_limit": 10000
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- 4. Project Manager
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'projectManager',
    'Project coordination and approvals',
    '{
        "can_approve": ["purchase_request", "project_task", "material_request"],
        "permissions": ["manage_projects", "approve_mid_range", "team_coordination", "pm_flag_approval", "qty_spec_approvals", "view_cost_analysis"],
        "approval_limit": 50000
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- 5. Design
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'design',
    'Design reference and technical inputs',
    '{
        "can_approve": [],
        "permissions": ["review_specifications", "provide_reference_inputs", "design_approval", "technical_review"],
        "approval_limit": 0
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- 6. Estimation
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'estimation',
    'Cost estimation and validation',
    '{
        "can_approve": [],
        "permissions": ["cost_analysis", "qty_spec_validation", "cost_flag_check", "budget_validation", "provide_cost_estimates"],
        "approval_limit": 0
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- 7. Accounts
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'accounts',
    'Financial management and payments',
    '{
        "can_approve": ["payment_processing"],
        "permissions": ["financial_management", "invoice_processing", "payment_transactions", "acknowledgement_processing", "financial_reporting"],
        "approval_limit": 0
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- 8. Technical Director
INSERT INTO roles (role, description, permissions, is_active, is_deleted, created_at, last_modified_at)
VALUES (
    'technicalDirector',
    'Final approvals and technical decisions',
    '{
        "can_approve": ["all"],
        "permissions": ["final_approval", "flag_override", "technical_decisions", "approve_high_value", "strategic_planning"],
        "approval_limit": null
    }'::jsonb,
    true,
    false,
    NOW(),
    NOW()
);

-- =====================================================
-- STEP 4: Insert Sample Users for Each Role
-- =====================================================

-- Get role IDs after insert
DO $$
DECLARE
    site_supervisor_id INTEGER;
    mep_supervisor_id INTEGER;
    procurement_id INTEGER;
    project_manager_id INTEGER;
    design_id INTEGER;
    estimation_id INTEGER;
    accounts_id INTEGER;
    technical_director_id INTEGER;
BEGIN
    -- Get role IDs
    SELECT role_id INTO site_supervisor_id FROM roles WHERE role = 'siteSupervisor';
    SELECT role_id INTO mep_supervisor_id FROM roles WHERE role = 'mepSupervisor';
    SELECT role_id INTO procurement_id FROM roles WHERE role = 'procurement';
    SELECT role_id INTO project_manager_id FROM roles WHERE role = 'projectManager';
    SELECT role_id INTO design_id FROM roles WHERE role = 'design';
    SELECT role_id INTO estimation_id FROM roles WHERE role = 'estimation';
    SELECT role_id INTO accounts_id FROM roles WHERE role = 'accounts';
    SELECT role_id INTO technical_director_id FROM roles WHERE role = 'technicalDirector';

    -- Insert sample users
    
    -- Site Supervisor
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'site.supervisor@metersquare.com',
        'John Smith',
        '+1234567890',
        site_supervisor_id,
        'Operations',
        true,
        false,
        NOW(),
        NOW()
    );

    -- MEP Supervisor
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'mep.supervisor@metersquare.com',
        'Sarah Johnson',
        '+1234567891',
        mep_supervisor_id,
        'Operations',
        true,
        false,
        NOW(),
        NOW()
    );

    -- Procurement
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'procurement@metersquare.com',
        'Michael Chen',
        '+1234567892',
        procurement_id,
        'Support',
        true,
        false,
        NOW(),
        NOW()
    );

    -- Project Manager
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'project.manager@metersquare.com',
        'Emily Davis',
        '+1234567893',
        project_manager_id,
        'Management',
        true,
        false,
        NOW(),
        NOW()
    );

    -- Design
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'design@metersquare.com',
        'David Wilson',
        '+1234567894',
        design_id,
        'Technical',
        true,
        false,
        NOW(),
        NOW()
    );

    -- Estimation
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'estimation@metersquare.com',
        'Lisa Anderson',
        '+1234567895',
        estimation_id,
        'Technical',
        true,
        false,
        NOW(),
        NOW()
    );

    -- Accounts
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'accounts@metersquare.com',
        'Robert Taylor',
        '+1234567896',
        accounts_id,
        'Support',
        true,
        false,
        NOW(),
        NOW()
    );

    -- Technical Director
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'technical.director@metersquare.com',
        'James Williams',
        '+1234567897',
        technical_director_id,
        'Management',
        true,
        false,
        NOW(),
        NOW()
    );

    -- Additional test user for development
    INSERT INTO users (email, full_name, phone, role_id, department, is_active, is_deleted, created_at, last_modified_at)
    VALUES (
        'admin@metersquare.com',
        'Admin User',
        '+1234567898',
        technical_director_id,
        'Management',
        true,
        false,
        NOW(),
        NOW()
    );

END $$;

-- =====================================================
-- STEP 5: Verify the migration
-- =====================================================

-- Show all roles with user count
SELECT 
    r.role_id,
    r.role,
    r.description,
    r.is_active,
    r.permissions,
    COUNT(u.user_id) as user_count
FROM roles r
LEFT JOIN users u ON r.role_id = u.role_id AND u.is_deleted = false
WHERE r.is_deleted = false
GROUP BY r.role_id, r.role, r.description, r.is_active, r.permissions
ORDER BY r.role_id;

-- Show all users with their roles
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    u.department,
    r.role as role_name,
    u.is_active
FROM users u
JOIN roles r ON u.role_id = r.role_id
WHERE u.is_deleted = false
ORDER BY u.user_id;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================
-- To rollback this migration:
-- 1. First backup current state:
--    CREATE TABLE users_after_reset AS SELECT * FROM users;
--    CREATE TABLE roles_after_reset AS SELECT * FROM roles;
--
-- 2. Then restore from backup:
--    TRUNCATE TABLE users CASCADE;
--    INSERT INTO users SELECT * FROM users_backup_before_reset;
--    TRUNCATE TABLE roles CASCADE;
--    INSERT INTO roles SELECT * FROM roles_backup_before_reset;
--
-- 3. Clean up backup tables:
--    DROP TABLE IF EXISTS users_backup_before_reset;
--    DROP TABLE IF EXISTS roles_backup_before_reset;