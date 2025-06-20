import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

interface StoredRelease {
  id: string
  title: string
  content: string
  summary: string
  url: string
  published_at: string
  company_name: string
  created_at: string
  ai_analysis?: any
}

/**
 * Get stored press releases for the current user
 * This supplements the RSS feed with historical data
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
    let companyFilter: string[] = []
    if (companies) {
      try {
        const parsed = JSON.parse(companies)
        companyFilter = parsed.map((c: any) => c.name)
      } catch (e) {
        console.error('Error parsing companies filter:', e)
      }
    }
    
    console.log(`📋 Getting stored releases for user: ${user.id}`)
    console.log(`📊 Company filter: ${companyFilter.join(', ')}`)
    
    // Build query
    let query = supabase
      .from('press_releases')
      .select('*')
      .eq('user_id', user.id)
      .order('published_at', { ascending: false })
      .limit(limit)
    
    // Apply company filter if provided
    if (companyFilter.length > 0) {
      query = query.in('company_name', companyFilter)
    }
    
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
    
    // Convert to format expected by frontend
    const formattedReleases = (storedReleases || []).map((release: any) => ({
      id: release.id,
      title: release.title,
      content: release.content || release.summary,
      summary: release.summary,
      sourceUrl: release.url,
      publishedAt: release.published_at,
      companyId: release.company_name, // Use company name as ID for now
      matchedCompany: release.company_name,
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