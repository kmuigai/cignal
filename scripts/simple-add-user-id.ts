import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addUserIdColumn() {
  console.log('🚀 Adding user_id column to press_releases table...')
  
  try {
    // Step 1: Check current schema
    console.log('📝 Checking current press_releases schema...')
    const { data: currentData, error: selectError } = await supabase
      .from('press_releases')
      .select('*')
      .limit(1)
    
    if (selectError) {
      console.error('Error checking current schema:', selectError)
      return
    }
    
    console.log('✅ Current press_releases table accessible')
    console.log('📊 Sample record:', currentData?.[0] ? Object.keys(currentData[0]) : 'No records')
    
    // Step 2: Get the existing Cabirou record to see its company_id
    const { data: existingReleases, error: existingError } = await supabase
      .from('press_releases')
      .select('*')
    
    if (existingError) {
      console.error('Error fetching existing releases:', existingError)
      return
    }
    
    console.log(`📋 Found ${existingReleases?.length || 0} existing press releases`)
    
    if (existingReleases && existingReleases.length > 0) {
      console.log('📄 Existing releases:')
      existingReleases.forEach((release, index) => {
        console.log(`   ${index + 1}. ${release.title} (company_id: ${release.company_id})`)
      })
      
      // Get the company info to find the user_id
      for (const release of existingReleases) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('user_id, name')
          .eq('id', release.company_id)
          .single()
        
        if (companyData) {
          console.log(`🏢 Company ${companyData.name} belongs to user: ${companyData.user_id}`)
        }
      }
    }
    
    console.log('✅ Schema check completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addUserIdColumn() 