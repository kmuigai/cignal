import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Starting user_id migration for press_releases table...')
  
  try {
    // Step 1: Add user_id column
    console.log('📝 Step 1: Adding user_id column...')
    const { error: addColumnError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE press_releases ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE'
    })
    
    if (addColumnError && !addColumnError.message.includes('already exists')) {
      throw new Error(`Failed to add user_id column: ${addColumnError.message}`)
    }
    console.log('✅ user_id column added successfully')

    // Step 2: Backfill user_id for existing records
    console.log('📝 Step 2: Backfilling user_id for existing records...')
    const { error: backfillError } = await supabase.rpc('sql', {
      query: `
        UPDATE press_releases 
        SET user_id = (
          SELECT c.user_id 
          FROM companies c 
          WHERE c.id = press_releases.company_id
          LIMIT 1
        )
        WHERE user_id IS NULL
      `
    })
    
    if (backfillError) {
      throw new Error(`Failed to backfill user_id: ${backfillError.message}`)
    }
    console.log('✅ user_id backfilled successfully')

    // Step 3: Make user_id NOT NULL
    console.log('📝 Step 3: Making user_id NOT NULL...')
    const { error: notNullError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE press_releases ALTER COLUMN user_id SET NOT NULL'
    })
    
    if (notNullError) {
      throw new Error(`Failed to set user_id NOT NULL: ${notNullError.message}`)
    }
    console.log('✅ user_id set to NOT NULL')

    // Step 4: Add performance index
    console.log('📝 Step 4: Adding performance index...')
    const { error: indexError } = await supabase.rpc('sql', {
      query: 'CREATE INDEX IF NOT EXISTS idx_press_releases_user_id ON press_releases(user_id)'
    })
    
    if (indexError) {
      throw new Error(`Failed to create index: ${indexError.message}`)
    }
    console.log('✅ Performance index created')

    // Step 5: Update unique constraint
    console.log('📝 Step 5: Updating unique constraints...')
    const { error: dropConstraintError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE press_releases DROP CONSTRAINT IF EXISTS press_releases_company_id_title_key'
    })
    
    const { error: addConstraintError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE press_releases 
        ADD CONSTRAINT press_releases_user_company_title_key 
        UNIQUE(user_id, company_id, title)
      `
    })
    
    if (addConstraintError && !addConstraintError.message.includes('already exists')) {
      throw new Error(`Failed to add unique constraint: ${addConstraintError.message}`)
    }
    console.log('✅ Unique constraints updated')

    // Step 6: Update RLS policies
    console.log('📝 Step 6: Updating RLS policies...')
    
    // Drop old policies
    const policies = [
      'DROP POLICY IF EXISTS "Users can view their own press releases" ON press_releases',
      'DROP POLICY IF EXISTS "Users can insert their own press releases" ON press_releases',
      'DROP POLICY IF EXISTS "Users can update their own press releases" ON press_releases',
      'DROP POLICY IF EXISTS "Users can delete their own press releases" ON press_releases'
    ]
    
    for (const policy of policies) {
      await supabase.rpc('sql', { query: policy })
    }
    
    // Create new policies
    const newPolicies = [
      'CREATE POLICY "Users can view their own press releases" ON press_releases FOR SELECT USING (auth.uid() = user_id)',
      'CREATE POLICY "Users can insert their own press releases" ON press_releases FOR INSERT WITH CHECK (auth.uid() = user_id)',
      'CREATE POLICY "Users can update their own press releases" ON press_releases FOR UPDATE USING (auth.uid() = user_id)',
      'CREATE POLICY "Users can delete their own press releases" ON press_releases FOR DELETE USING (auth.uid() = user_id)'
    ]
    
    for (const policy of newPolicies) {
      const { error: policyError } = await supabase.rpc('sql', { query: policy })
      if (policyError && !policyError.message.includes('already exists')) {
        console.warn(`Policy warning: ${policyError.message}`)
      }
    }
    console.log('✅ RLS policies updated')

    // Step 7: Add compound index
    console.log('📝 Step 7: Adding compound index...')
    const { error: compoundIndexError } = await supabase.rpc('sql', {
      query: 'CREATE INDEX IF NOT EXISTS idx_press_releases_user_company_published ON press_releases(user_id, company_id, published_at DESC)'
    })
    
    if (compoundIndexError) {
      throw new Error(`Failed to create compound index: ${compoundIndexError.message}`)
    }
    console.log('✅ Compound index created')

    // Verify migration
    console.log('📝 Verifying migration...')
    const { data: verifyData, error: verifyError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          COUNT(*) as total_records,
          COUNT(user_id) as records_with_user_id,
          COUNT(DISTINCT user_id) as unique_users
        FROM press_releases
      `
    })
    
    if (verifyError) {
      throw new Error(`Failed to verify migration: ${verifyError.message}`)
    }
    
    console.log('✅ Migration verification:')
    console.log(`   Total records: ${verifyData?.[0]?.total_records || 0}`)
    console.log(`   Records with user_id: ${verifyData?.[0]?.records_with_user_id || 0}`)
    console.log(`   Unique users: ${verifyData?.[0]?.unique_users || 0}`)
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration() 