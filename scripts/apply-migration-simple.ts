// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTables() {
  console.log('🚀 Creating press_releases table...')
  
  // Create press_releases table
  const createPressReleasesTable = `
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
  `
  
  const { error: pressReleasesError } = await supabase.rpc('sql', { query: createPressReleasesTable })
  
  if (pressReleasesError) {
    console.error('❌ Failed to create press_releases table:', pressReleasesError)
    return false
  }
  
  console.log('✅ press_releases table created')
  
  // Create rss_poll_logs table
  console.log('🚀 Creating rss_poll_logs table...')
  
  const createRssPollLogsTable = `
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
  `
  
  const { error: pollLogsError } = await supabase.rpc('sql', { query: createRssPollLogsTable })
  
  if (pollLogsError) {
    console.error('❌ Failed to create rss_poll_logs table:', pollLogsError)
    return false
  }
  
  console.log('✅ rss_poll_logs table created')
  return true
}

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security...')
  
  const { error: rlsError1 } = await supabase.rpc('sql', { 
    query: 'ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;' 
  })
  
  const { error: rlsError2 } = await supabase.rpc('sql', { 
    query: 'ALTER TABLE rss_poll_logs ENABLE ROW LEVEL SECURITY;' 
  })
  
  if (rlsError1 || rlsError2) {
    console.warn('⚠️ RLS may already be enabled:', rlsError1 || rlsError2)
  } else {
    console.log('✅ Row Level Security enabled')
  }
}

async function applyMigration() {
  try {
    console.log('🚀 Starting database migration...')
    
    const tablesCreated = await createTables()
    if (!tablesCreated) {
      process.exit(1)
    }
    
    await enableRLS()
    
    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Start your dev server: npm run dev')
    console.log('2. Test the system: npm run test:phase2')
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    process.exit(1)
  }
}

// Run the migration
applyMigration() 