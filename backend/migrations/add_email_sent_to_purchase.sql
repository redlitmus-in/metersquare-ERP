-- Migration to add email_sent column to purchase table
-- Run this SQL script to update your existing database

ALTER TABLE public.purchase 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE NOT NULL;

-- Optional: Update existing records with a default value (FALSE means email not sent)
UPDATE public.purchase 
SET email_sent = FALSE 
WHERE email_sent IS NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.purchase.email_sent IS 'Track whether email notification has been sent for this purchase request';