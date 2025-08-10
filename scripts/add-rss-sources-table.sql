-- RSS Sources Table Migration
-- This migration adds RSS source management capabilities to the CIGNAL app
-- Run this in Supabase SQL Editor after the main schema is set up

-- Step 1: Create rss_sources table (consistent with existing schema patterns)
CREATE TABLE IF NOT EXISTS rss_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  feed_url TEXT NOT NULL,
  feed_name TEXT NOT NULL,
  feed_type TEXT CHECK (feed_type IN ('ir-news', 'sec-filings', 'general-news', 'industry', 'custom')) DEFAULT 'custom',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  article_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  -- Ensure user can only access their own RSS sources
  CONSTRAINT rss_sources_user_company_check 
    CHECK (user_id = (SELECT user_id FROM companies WHERE id = company_id))
);

-- Step 2: Add performance indexes (matching existing pattern)
CREATE INDEX IF NOT EXISTS rss_sources_company_id_idx ON rss_sources(company_id);
CREATE INDEX IF NOT EXISTS rss_sources_user_id_idx ON rss_sources(user_id);
CREATE INDEX IF NOT EXISTS rss_sources_enabled_idx ON rss_sources(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS rss_sources_last_fetched_idx ON rss_sources(last_fetched_at);
CREATE INDEX IF NOT EXISTS rss_sources_feed_url_idx ON rss_sources(feed_url);

-- Step 3: Enable Row Level Security (same pattern as companies table)
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (matching existing companies table pattern)
CREATE POLICY "Users can view own RSS sources" ON rss_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own RSS sources" ON rss_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSS sources" ON rss_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSS sources" ON rss_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Add updated_at trigger (using existing function)
CREATE TRIGGER update_rss_sources_updated_at BEFORE UPDATE ON rss_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Insert some default RSS sources for testing (optional)
-- Uncomment these lines if you want default sources for existing companies

/*
-- Add default RSS sources for existing companies
INSERT INTO rss_sources (company_id, user_id, feed_url, feed_name, feed_type, enabled)
SELECT 
  c.id as company_id,
  c.user_id,
  'https://feeds.finance.yahoo.com/rss/2.0/headline' as feed_url,
  'Yahoo Finance - General' as feed_name,
  'general-news' as feed_type,
  true as enabled
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rss_sources rs 
  WHERE rs.company_id = c.id 
  AND rs.feed_url = 'https://feeds.finance.yahoo.com/rss/2.0/headline'
);
*/

-- Step 7: Verify migration
-- Check table exists and has correct structure
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'rss_sources' 
ORDER BY ordinal_position;

-- Check RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'rss_sources';

-- Check indexes exist  
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'rss_sources';

-- Migration complete!
-- You can now use the RSS Source Management functionality in the app.