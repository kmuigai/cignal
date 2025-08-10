import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { RSSSourceManager } from '@/lib/supabase/database'

// POST /api/rss-sources/:id/test - Test RSS feed connectivity
export async function POST(
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

    // Get RSS source to verify ownership and get URL
    const { data: source, error: sourceError } = await supabase
      .from('rss_sources')
      .select('feed_url, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (sourceError || !source) {
      return NextResponse.json({ error: 'RSS source not found or access denied' }, { status: 404 })
    }

    // Test the RSS feed
    const rssSourceManager = new RSSSourceManager(supabase)
    const testResult = await rssSourceManager.testRSSFeed(source.feed_url)

    // Update the RSS source with test results if successful
    if (testResult.valid) {
      await rssSourceManager.updateFeedMetrics(params.id, {
        lastFetchedAt: new Date().toISOString(),
        lastError: null,
      })
    } else if (testResult.error) {
      await rssSourceManager.updateFeedMetrics(params.id, {
        lastFetchedAt: new Date().toISOString(),
        lastError: testResult.error,
      })
    }

    return NextResponse.json({ 
      testResult,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error testing RSS feed:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        testResult: {
          valid: false,
          error: 'Server error while testing feed'
        }
      },
      { status: 500 }
    )
  }
}