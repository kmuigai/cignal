# Manual Migration Guide

Since Supabase doesn't allow direct SQL execution through the JavaScript client, you need to run the migration manually through the Supabase dashboard.

## 📋 Steps to Apply Migration

### 1. Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: `pntjdjapwfkrqrcbqrcg`
3. Navigate to **SQL Editor** in the left sidebar

### 2. Run Migration SQL
Copy and paste the following SQL into the SQL Editor and click **Run**:

```sql
-- Create press_releases table for historical storage
CREATE TABLE IF NOT EXISTS press_releases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Press release content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Deduplication and tracking
  content_hash TEXT NOT NULL,
  rss_source_url TEXT NOT NULL,
  
  -- AI analysis (stored as JSONB for flexibility)
  ai_analysis JSONB,
  highlights JSONB,
  
  -- Metadata
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL,
  
  -- Ensure uniqueness per user/company/content
  UNIQUE(user_id, company_id, content_hash)
);

-- Create monitoring table for RSS polling jobs
CREATE TABLE IF NOT EXISTS rss_poll_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Poll attempt details
  poll_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  poll_completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  
  -- Results
  releases_found INTEGER DEFAULT 0,
  releases_new INTEGER DEFAULT 0,
  releases_duplicate INTEGER DEFAULT 0,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_press_releases_user_id ON press_releases(user_id);
CREATE INDEX IF NOT EXISTS idx_press_releases_company_id ON press_releases(company_id);
CREATE INDEX IF NOT EXISTS idx_press_releases_published_at ON press_releases(published_at);
CREATE INDEX IF NOT EXISTS idx_press_releases_created_at ON press_releases(created_at);
CREATE INDEX IF NOT EXISTS idx_press_releases_content_hash ON press_releases(content_hash);
CREATE INDEX IF NOT EXISTS idx_press_releases_user_company_published ON press_releases(user_id, company_id, published_at);

-- Index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_rss_poll_logs_user_company ON rss_poll_logs(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_rss_poll_logs_status ON rss_poll_logs(status);
CREATE INDEX IF NOT EXISTS idx_rss_poll_logs_created_at ON rss_poll_logs(created_at);

-- Enable Row Level Security
ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_poll_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for press_releases
CREATE POLICY "Users can view their own press releases" ON press_releases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own press releases" ON press_releases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own press releases" ON press_releases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own press releases" ON press_releases
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for monitoring
CREATE POLICY "Users can view their own poll logs" ON rss_poll_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own poll logs" ON rss_poll_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3. Verify Tables Created
After running the SQL, check that both tables appear in:
- **Table Editor** → You should see `press_releases` and `rss_poll_logs`

## ✅ What This Creates

1. **`press_releases` table** - Stores historical press releases
2. **`rss_poll_logs` table** - Tracks RSS polling attempts  
3. **Row Level Security** - Ensures users only see their own data
4. **Indexes** - For fast queries
5. **Policies** - Security rules for multi-user access

## 🎯 Next Steps

Once you've run this migration in the Supabase dashboard:
1. Come back to this terminal
2. Start your dev server: `npm run dev`
3. Test the system: `npm run test:phase2`

---

**Alternative:** If you prefer, we can proceed to test the system without the migration for now, and you can apply it later when needed. 