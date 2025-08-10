import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rssSourceManager } from '@/lib/supabase/database'
import type { CreateRSSSource } from '@/lib/types'

// GET /api/companies/:id/rss-sources - Fetch all RSS sources for company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[RSS Sources API] GET request for company:', params.id)
  
  try {
    const supabase = createRouteHandlerClient(request)
    
    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('[RSS Sources API] Auth check:', { userId: user?.id, authError })

    if (authError || !user) {
      console.error('[RSS Sources API] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    // Handle empty company ID
    if (!params.id || params.id === 'undefined' || params.id === 'null') {
      console.log('[RSS Sources API] No valid company ID provided')
      return NextResponse.json({ sources: [] }, { status: 200 })
    }

    // Verify company belongs to user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()
    
    console.log('[RSS Sources API] Company check:', { company, companyError })

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found or access denied' }, { status: 404 })
    }

    // Get RSS sources for the company
    try {
      const sources = await rssSourceManager.getRSSSourcesByCompany(params.id)
      console.log('[RSS Sources API] Found sources:', sources.length)
      return NextResponse.json({ sources })
    } catch (dbError) {
      console.error('[RSS Sources API] Database error:', dbError)
      // Return empty array instead of error for better UX
      return NextResponse.json({ sources: [] })
    }
  } catch (error) {
    console.error('[RSS Sources API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', sources: [] },
      { status: 500 }
    )
  }
}

// POST /api/companies/:id/rss-sources - Add new RSS source
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[RSS Sources API] POST request for company:', params.id)
  
  try {
    const supabase = createRouteHandlerClient(request)
    
    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[RSS Sources API] POST - Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    // Verify company belongs to user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found or access denied' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { feedUrl, feedName, feedType, enabled }: CreateRSSSource = body

    // Validate required fields
    if (!feedUrl || !feedName || !feedType) {
      return NextResponse.json(
        { error: 'Missing required fields: feedUrl, feedName, feedType' },
        { status: 400 }
      )
    }

    // Create RSS source
    const newSource = await rssSourceManager.createRSSSource(params.id, {
      feedUrl,
      feedName,
      feedType,
      enabled: enabled ?? true,
    })

    return NextResponse.json({ source: newSource }, { status: 201 })
  } catch (error) {
    console.error('Error creating RSS source:', error)
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}