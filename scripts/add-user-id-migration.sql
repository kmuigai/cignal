-- Phase 1: Add user_id column to press_releases table
-- This migration adds user ownership to press releases for proper data isolation

-- Step 1: Add user_id column (nullable initially for migration)
ALTER TABLE press_releases 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Backfill user_id for existing records
-- We'll use the company ownership to determine user_id
UPDATE press_releases 
SET user_id = (
  SELECT c.user_id 
  FROM companies c 
  WHERE c.id = press_releases.company_id
  LIMIT 1
)
WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL after backfill
ALTER TABLE press_releases 
ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Add performance index
CREATE INDEX IF NOT EXISTS idx_press_releases_user_id ON press_releases(user_id);

-- Step 5: Update unique constraint to be user-scoped
-- First drop the old constraint if it exists
ALTER TABLE press_releases 
DROP CONSTRAINT IF EXISTS press_releases_company_id_title_key;

-- Add new user-scoped unique constraint
ALTER TABLE press_releases 
ADD CONSTRAINT press_releases_user_company_title_key 
UNIQUE(user_id, company_id, title);

-- Step 6: Update RLS policies for user_id
DROP POLICY IF EXISTS "Users can view their own press releases" ON press_releases;
DROP POLICY IF EXISTS "Users can insert their own press releases" ON press_releases;
DROP POLICY IF EXISTS "Users can update their own press releases" ON press_releases;
DROP POLICY IF EXISTS "Users can delete their own press releases" ON press_releases;

-- Create new user_id-based policies
CREATE POLICY "Users can view their own press releases" ON press_releases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own press releases" ON press_releases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own press releases" ON press_releases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own press releases" ON press_releases
  FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Create compound index for common queries
CREATE INDEX IF NOT EXISTS idx_press_releases_user_company_published 
ON press_releases(user_id, company_id, published_at DESC);

-- Verify the migration
SELECT 
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(DISTINCT user_id) as unique_users
FROM press_releases; 