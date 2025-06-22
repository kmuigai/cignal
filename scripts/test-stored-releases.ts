import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStoredReleases() {
  console.log('🧪 Testing stored releases API...')
  
  try {
    // Step 1: Get the user ID we know has data
    const userId = '4428871e-35e2-484b-84a4-f4901d88e192'
    console.log(`👤 Testing with user: ${userId}`)
    
    // Step 2: Get user's companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, variations')
      .eq('user_id', userId)
    
    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError)
      return
    }
    
    console.log(`🏢 User has ${companies?.length || 0} companies:`)
    companies?.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name} (${company.id})`)
    })
    
    // Step 3: Get press releases for user's companies
    if (companies && companies.length > 0) {
      const companyIds = companies.map(c => c.id)
      
      const { data: releases, error: releasesError } = await supabase
        .from('press_releases')
        .select('*')
        .in('company_id', companyIds)
        .order('published_at', { ascending: false })
      
      if (releasesError) {
        console.error('❌ Error fetching releases:', releasesError)
        return
      }
      
      console.log(`📰 Found ${releases?.length || 0} press releases:`)
      releases?.forEach((release, index) => {
        const company = companies.find(c => c.id === release.company_id)
        console.log(`   ${index + 1}. ${release.title}`)
        console.log(`      Company: ${company?.name || 'Unknown'}`)
        console.log(`      Published: ${release.published_at}`)
        console.log(`      Source: ${release.source_url}`)
        console.log('')
      })
      
      // Step 4: Test the API format conversion
      console.log('🔄 Testing API format conversion...')
      const companyMap = new Map(companies.map(c => [c.id, c.name]))
      
      const formattedReleases = releases?.map((release) => ({
        id: release.id,
        title: release.title,
        content: release.content || release.summary,
        summary: release.summary,
        sourceUrl: release.source_url,
        publishedAt: release.published_at,
        companyId: release.company_id,
        matchedCompany: companyMap.get(release.company_id) || 'Unknown Company',
        source: 'database',
        aiAnalysis: release.ai_analysis,
        createdAt: release.created_at
      }))
      
      console.log('📋 Formatted for frontend:')
      formattedReleases?.forEach((release, index) => {
        console.log(`   ${index + 1}. ${release.title}`)
        console.log(`      Company: ${release.matchedCompany}`)
        console.log(`      Source URL: ${release.sourceUrl}`)
        console.log('')
      })
      
      console.log('✅ Test completed successfully!')
      console.log(`📊 Summary: Found ${releases?.length || 0} releases for ${companies.length} companies`)
      
    } else {
      console.log('📭 No companies found for user')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testStoredReleases() 