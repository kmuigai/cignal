import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rssSourceManager } from '@/lib/supabase/database'
import type { UpdateRSSSource } from '@/lib/types'

// PUT /api/rss-sources/:id - Update RSS source
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient(request)
    
    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const updates: UpdateRSSSource = body

    // Validate that at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      )
    }

    // Update RSS source (RSSSourceManager handles user authorization)
    const updatedSource = await rssSourceManager.updateRSSSource(params.id, updates)

    return NextResponse.json({ source: updatedSource })
  } catch (error) {
    console.error('Error updating RSS source:', error)
    
    // Handle validation errors
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Handle not found errors
    if (error instanceof Error && error.message.includes('No rows')) {
      return NextResponse.json({ error: 'RSS source not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/rss-sources/:id - Delete RSS source
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient(request)
    
    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete RSS source (RSSSourceManager handles user authorization)
    await rssSourceManager.deleteRSSSource(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting RSS source:', error)

    // Handle not found errors
    if (error instanceof Error && error.message.includes('No rows')) {
      return NextResponse.json({ error: 'RSS source not found or access denied' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/rss-sources/:id - Get single RSS source (for debugging/admin)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient(request)
    
    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get RSS source via database query (ensures user authorization)
    const { data: source, error } = await supabase
      .from('rss_sources')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !source) {
      return NextResponse.json({ error: 'RSS source not found or access denied' }, { status: 404 })
    }

    // Map database fields to frontend format
    const mappedSource = {
      id: source.id,
      companyId: source.company_id,
      userId: source.user_id,
      feedUrl: source.feed_url,
      feedName: source.feed_name,
      feedType: source.feed_type,
      enabled: source.enabled,
      createdAt: source.created_at,
      updatedAt: source.updated_at,
      lastFetchedAt: source.last_fetched_at || undefined,
      lastError: source.last_error || undefined,
      articleCount: source.article_count,
      successRate: source.success_rate,
    }

    return NextResponse.json({ source: mappedSource })
  } catch (error) {
    console.error('Error fetching RSS source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}