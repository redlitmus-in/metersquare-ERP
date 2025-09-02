-- Migration script to update roles table with workflow-based roles
-- Based on Material Purchases - Project Bound workflow
-- For backend PostgreSQL database (not Supabase)

-- First, backup existing roles data
CREATE TABLE IF NOT EXISTS roles_backup AS 
SELECT * FROM roles WHERE is_deleted = false;

-- Update existing roles or insert new ones based on the workflow diagram
-- Using camelCase naming convention to match frontend/backend

-- 1. Site Supervisor
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('siteSupervisor', 'Site operations and material requisition', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- 2. MEP Supervisor
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('mepSupervisor', 'MEP operations and material requisition', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- 3. Procurement
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('procurement', 'Procurement and vendor management', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- 4. Project Manager
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('projectManager', 'Project coordination and approvals', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- 5. Design
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('design', 'Design reference and technical inputs', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- 6. Estimation
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('estimation', 'Cost estimation and validation', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- 7. Accounts
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('accounts', 'Financial management and payments', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- 8. Technical Director
INSERT INTO roles (role, description, is_active, is_deleted, created_at)
VALUES ('technicalDirector', 'Final approvals and technical decisions', true, false, NOW())
ON CONFLICT (role) 
DO UPDATE SET 
    description = EXCLUDED.description,
    is_active = true,
    is_deleted = false,
    last_modified_at = NOW()
WHERE roles.is_deleted = false;

-- Mark any non-workflow roles as inactive (but not deleted)
UPDATE roles 
SET is_active = false, last_modified_at = NOW()
WHERE role NOT IN (
    'siteSupervisor',
    'mepSupervisor', 
    'procurement',
    'projectManager',
    'design',
    'estimation',
    'accounts',
    'technicalDirector'
) AND is_deleted = false;

-- Update any users with old role names to new role names (if applicable)
-- This requires mapping old role names to new ones
UPDATE users u
SET role_id = r.role_id
FROM roles r
WHERE r.role = 'siteSupervisor' 
AND u.role_id IN (
    SELECT role_id FROM roles WHERE role IN ('site_supervisor', 'siteEngineer')
);

UPDATE users u
SET role_id = r.role_id
FROM roles r
WHERE r.role = 'mepSupervisor' 
AND u.role_id IN (
    SELECT role_id FROM roles WHERE role = 'mep_supervisor'
);

UPDATE users u
SET role_id = r.role_id
FROM roles r
WHERE r.role = 'projectManager' 
AND u.role_id IN (
    SELECT role_id FROM roles WHERE role IN ('project_manager', 'pm')
);

UPDATE users u
SET role_id = r.role_id
FROM roles r
WHERE r.role = 'technicalDirector' 
AND u.role_id IN (
    SELECT role_id FROM roles WHERE role IN ('technical_director', 'businessOwner', 'business_owner')
);

-- Add department field to users based on their roles if not already set
UPDATE users u
SET department = 
    CASE 
        WHEN r.role IN ('siteSupervisor', 'mepSupervisor') THEN 'Operations'
        WHEN r.role IN ('projectManager', 'technicalDirector') THEN 'Management'
        WHEN r.role IN ('procurement', 'accounts') THEN 'Support'
        WHEN r.role IN ('design', 'estimation') THEN 'Technical'
        ELSE u.department
    END
FROM roles r
WHERE u.role_id = r.role_id 
AND u.department IS NULL;

-- Verify the migration
SELECT r.role_id, r.role, r.description, r.is_active, 
       COUNT(u.user_id) as user_count
FROM roles r
LEFT JOIN users u ON r.role_id = u.role_id AND u.is_deleted = false
WHERE r.is_deleted = false
GROUP BY r.role_id, r.role, r.description, r.is_active
ORDER BY r.role_id;

-- To rollback if needed:
-- TRUNCATE TABLE roles CASCADE;
-- INSERT INTO roles SELECT * FROM roles_backup;