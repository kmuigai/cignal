import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFullFlow() {
  console.log('🔍 Testing full flow: Database → API → Frontend')
  
  try {
    const userId = '4428871e-35e2-484b-84a4-f4901d88e192'
    
    // Test 1: Direct database query
    console.log('\n📊 Test 1: Direct Database Query')
    console.log('=' .repeat(50))
    
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .eq('user_id', userId)
    
    const companyIds = companies?.map(c => c.id) || []
    
    const { data: releases } = await supabase
      .from('press_releases')
      .select('*')
      .in('company_id', companyIds)
    
    console.log(`✅ Database: Found ${releases?.length || 0} releases`)
    
    // Test 2: API Format
    console.log('\n🔄 Test 2: API Format Conversion')
    console.log('=' .repeat(50))
    
    const companiesData = companies?.map(c => ({ name: c.name, variations: [] })) || []
    const companiesParam = encodeURIComponent(JSON.stringify(companiesData))
    
    console.log(`📤 API Request: /api/get-stored-releases?companies=${companiesParam.substring(0, 100)}...`)
    
    // Test 3: Enhanced Hook Format
    console.log('\n🎯 Test 3: Enhanced Hook Expected Format')
    console.log('=' .repeat(50))
    
    if (releases && releases.length > 0) {
      const companyMap = new Map(companies?.map(c => [c.id, c.name]))
      
      const enhancedFormat = releases.map((release, index) => ({
        id: release.id,
        title: release.title,
        content: release.content || release.summary,
        summary: release.summary,
        sourceUrl: release.source_url,
        publishedAt: release.published_at,
        companyId: release.company_id,
        matchedCompany: companyMap.get(release.company_id) || 'Unknown',
        source: 'database' as const,
        createdAt: release.created_at
      }))
      
      console.log('📋 Enhanced Hook Format:')
      enhancedFormat.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title}`)
        console.log(`      ID: ${item.id}`)
        console.log(`      Company: ${item.matchedCompany} (${item.companyId})`)
        console.log(`      Source: ${item.source}`)
        console.log(`      URL: ${item.sourceUrl}`)
        console.log(`      Published: ${item.publishedAt}`)
        console.log('')
      })
    }
    
    // Test 4: Check for potential issues
    console.log('\n🔍 Test 4: Potential Issues Check')
    console.log('=' .repeat(50))
    
    // Check if user exists in auth
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const userExists = authUsers.users.some(u => u.id === userId)
    console.log(`👤 User exists in auth: ${userExists ? '✅ Yes' : '❌ No'}`)
    
    // Check companies
    console.log(`🏢 Companies count: ${companies?.length || 0}`)
    companies?.forEach(company => {
      console.log(`   - ${company.name} (${company.id})`)
    })
    
    // Check press releases
    console.log(`📰 Press releases count: ${releases?.length || 0}`)
    releases?.forEach(release => {
      const company = companies?.find(c => c.id === release.company_id)
      console.log(`   - ${release.title}`)
      console.log(`     Company: ${company?.name || 'UNKNOWN'} (${release.company_id})`)
      console.log(`     Has content: ${!!release.content}`)
      console.log(`     Has summary: ${!!release.summary}`)
      console.log(`     Source URL: ${release.source_url}`)
    })
    
    // Test 5: Simulate API response
    console.log('\n📡 Test 5: Simulated API Response')
    console.log('=' .repeat(50))
    
    if (releases && companies) {
      const companyMap = new Map(companies.map(c => [c.id, c.name]))
      
      const apiResponse = {
        items: releases.map((release) => ({
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
        })),
        fetchedAt: new Date().toISOString(),
        totalItems: releases.length,
        source: 'database'
      }
      
      console.log('📤 API Response:')
      console.log(`   Total items: ${apiResponse.totalItems}`)
      console.log(`   Fetched at: ${apiResponse.fetchedAt}`)
      console.log(`   Source: ${apiResponse.source}`)
      console.log('')
      
      apiResponse.items.forEach((item, index) => {
        console.log(`   Item ${index + 1}:`)
        console.log(`     Title: ${item.title}`)
        console.log(`     Company: ${item.matchedCompany}`)
        console.log(`     Source URL: ${item.sourceUrl}`)
        console.log(`     Published: ${item.publishedAt}`)
        console.log('')
      })
    }
    
    console.log('🎉 Full flow test completed!')
    
  } catch (error) {
    console.error('❌ Full flow test failed:', error)
  }
}

testFullFlow() 