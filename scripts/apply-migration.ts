// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('🚀 Applying press releases migration...')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'lib/supabase/press-releases-migration.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration applied successfully!')
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['press_releases', 'rss_poll_logs'])
    
    if (tablesError) {
      console.warn('⚠️ Could not verify table creation:', tablesError)
    } else {
      console.log('📋 Created tables:', tables?.map(t => t.table_name).join(', '))
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    process.exit(1)
  }
}

// Alternative method if RPC doesn't work
async function applyMigrationDirect() {
  try {
    console.log('🚀 Applying press releases migration (direct method)...')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'lib/supabase/press-releases-migration.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error('❌ Statement failed:', error)
        console.error('Statement:', statement)
        // Continue with other statements
      }
    }
    
    console.log('✅ Migration completed!')
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
    process.exit(1)
  }
}

// Run the migration
if (process.argv.includes('--direct')) {
  applyMigrationDirect()
} else {
  applyMigration()
} 