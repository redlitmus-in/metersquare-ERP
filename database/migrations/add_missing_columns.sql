-- Add missing columns to users and roles tables
-- This migration adds columns that are in the models but missing in the database

-- Add department column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
        UPDATE users SET department = 'Operations' WHERE department IS NULL;
    END IF;
END $$;

-- Add last_otp_request column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'last_otp_request') THEN
        ALTER TABLE users ADD COLUMN last_otp_request TIMESTAMP;
    END IF;
END $$;

-- Add otp_attempts column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'otp_attempts') THEN
        ALTER TABLE users ADD COLUMN otp_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add permissions column to roles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' 
                   AND column_name = 'permissions') THEN
        ALTER TABLE roles ADD COLUMN permissions JSONB;
    END IF;
END $$;

-- Add last_modified_at column to roles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' 
                   AND column_name = 'last_modified_at') THEN
        ALTER TABLE roles ADD COLUMN last_modified_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Drop columns that were removed from the model
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' 
               AND column_name = 'password') THEN
        ALTER TABLE users DROP COLUMN password;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' 
               AND column_name = 'avatar_url') THEN
        ALTER TABLE users DROP COLUMN avatar_url;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' 
               AND column_name = 'org_uuid') THEN
        ALTER TABLE users DROP COLUMN org_uuid;
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'roles'
ORDER BY ordinal_position;