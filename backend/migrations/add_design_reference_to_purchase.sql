-- Migration to add design_reference column to purchase table
-- Run this SQL script to update your existing database

ALTER TABLE public.purchase 
ADD COLUMN IF NOT EXISTS design_reference VARCHAR(255);

-- Optional: Update existing records with a default value
UPDATE public.purchase 
SET design_reference = '' 
WHERE design_reference IS NULL;