import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

interface StoredRelease {
  id: string
  title: string
  content: string
  summary: string
  source_url: string
  published_at: string
  company_id: string
  created_at: string
  ai_analysis?: any
}

/**
 * Get stored press releases for the current user
 * This supplements the RSS feed with historical data
 * NOTE: Currently works without user_id column by filtering through company ownership
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const companies = searchParams.get('companies')
    const limit = parseInt(searchParams.get('limit') || '50')
    const since = searchParams.get('since') // ISO date string
    
    // Parse companies filter
    let companyFilter: Array<{ name: string; variations?: string[] }> = []
    if (companies) {
      try {
        const parsed = JSON.parse(companies)
        companyFilter = parsed
      } catch (e) {
        console.error('Error parsing companies filter:', e)
      }
    }
    
    console.log(`📋 Getting stored releases for user: ${user.id}`)
    console.log(`📊 Company filter: ${companyFilter.map(c => c.name).join(', ')}`)
    
    // Step 1: Get user's company IDs (since no user_id column in press_releases yet)
    const { data: userCompanies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, variations')
      .eq('user_id', user.id)
    
    if (companiesError) {
      console.error('Error fetching user companies:', companiesError)
      return NextResponse.json(
        { error: 'Failed to fetch user companies' },
        { status: 500 }
      )
    }
    
    if (!userCompanies || userCompanies.length === 0) {
      console.log('📭 User has no companies, returning empty result')
      return NextResponse.json({
        items: [],
        fetchedAt: new Date().toISOString(),
        totalItems: 0,
        source: 'database'
      })
    }
    
    console.log(`🏢 User has ${userCompanies.length} companies: ${userCompanies.map(c => c.name).join(', ')}`)
    
    // Step 2: Filter company IDs based on company filter if provided
    let targetCompanyIds = userCompanies.map(c => c.id)
    
    if (companyFilter.length > 0) {
      const matchingCompanies = userCompanies.filter(company => 
        companyFilter.some(filter => 
          filter.name.toLowerCase() === company.name.toLowerCase()
        )
      )
      
      targetCompanyIds = matchingCompanies.map(c => c.id)
      
      if (targetCompanyIds.length === 0) {
        console.log('📭 No matching companies found, returning empty result')
        return NextResponse.json({
          items: [],
          fetchedAt: new Date().toISOString(),
          totalItems: 0,
          source: 'database'
        })
      }
    }
    
    console.log(`🎯 Searching for press releases from ${targetCompanyIds.length} companies`)
    
    // Step 3: Get press releases for those company IDs
    let query = supabase
      .from('press_releases')
      .select('*')
      .in('company_id', targetCompanyIds)
      .order('published_at', { ascending: false })
      .limit(limit)
    
    // Apply date filter if provided
    if (since) {
      query = query.gte('published_at', since)
    }
    
    const { data: storedReleases, error: dbError } = await query
    
    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch stored releases' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Found ${storedReleases?.length || 0} stored releases`)
    
    // Step 4: Map company IDs to company names for response
    const companyMap = new Map(userCompanies.map(c => [c.id, c.name]))
    
    // Convert to format expected by frontend
    const formattedReleases = (storedReleases || []).map((release: any) => ({
      id: release.id,
      title: release.title,
      content: release.content || release.summary,
      summary: release.summary,
      sourceUrl: release.source_url, // Map source_url to sourceUrl
      publishedAt: release.published_at,
      companyId: release.company_id,
      matchedCompany: companyMap.get(release.company_id) || 'Unknown Company',
      source: 'database',
      aiAnalysis: release.ai_analysis,
      createdAt: release.created_at
    }))
    
    return NextResponse.json({
      items: formattedReleases,
      fetchedAt: new Date().toISOString(),
      totalItems: formattedReleases.length,
      source: 'database'
    })
    
  } catch (error) {
    console.error('Error in get-stored-releases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 