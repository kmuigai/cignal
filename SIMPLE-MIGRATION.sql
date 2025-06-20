-- SIMPLIFIED MIGRATION FOR PRESS RELEASES STORAGE
-- This creates tables without foreign key dependencies

-- Create press_releases table (standalone version)
CREATE TABLE IF NOT EXISTS press_releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,  -- Changed from UUID with FK to simple TEXT
  company_name TEXT NOT NULL,  -- Store company name directly instead of FK
  
  -- Press release content
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  url TEXT UNIQUE NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'rss',
  
  -- Deduplication and analysis
  content_hash TEXT UNIQUE NOT NULL,
  ai_analysis JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create RSS poll logs table (standalone version)
CREATE TABLE IF NOT EXISTS rss_poll_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,  -- Changed from UUID with FK to simple TEXT
  
  -- Poll details
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  
  -- Results
  total_feeds_checked INTEGER DEFAULT 0,
  total_items_found INTEGER DEFAULT 0,
  total_items_saved INTEGER DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_press_releases_user_id ON press_releases(user_id);
CREATE INDEX IF NOT EXISTS idx_press_releases_company_name ON press_releases(company_name);
CREATE INDEX IF NOT EXISTS idx_press_releases_published_at ON press_releases(published_at);
CREATE INDEX IF NOT EXISTS idx_press_releases_created_at ON press_releases(created_at);
CREATE INDEX IF NOT EXISTS idx_press_releases_content_hash ON press_releases(content_hash);
CREATE INDEX IF NOT EXISTS idx_press_releases_user_company_published ON press_releases(user_id, company_name, published_at);

CREATE INDEX IF NOT EXISTS idx_rss_poll_logs_user_id ON rss_poll_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rss_poll_logs_started_at ON rss_poll_logs(started_at);

-- Enable Row Level Security (if auth.users exists, we'll update policies later)
ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_poll_logs ENABLE ROW LEVEL SECURITY;

-- Create basic policies (will work even without auth.users)
CREATE POLICY IF NOT EXISTS "Users can view their own press releases" 
  ON press_releases FOR SELECT 
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY IF NOT EXISTS "Users can insert their own press releases" 
  ON press_releases FOR INSERT 
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY IF NOT EXISTS "Users can view their own poll logs" 
  ON rss_poll_logs FOR SELECT 
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY IF NOT EXISTS "Users can insert their own poll logs" 
  ON rss_poll_logs FOR INSERT 
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_press_releases_updated_at 
  BEFORE UPDATE ON press_releases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 