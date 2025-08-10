import { createRouteHandlerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { testRSSConnectivity, detectRSSFeedType, suggestFeedName } from '@/lib/rss-validation'

// POST /api/rss-sources/validate - Validate RSS URL without saving
export async function POST(request: NextRequest) {
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
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate the RSS URL
    let validationResult
    try {
      validationResult = await testRSSConnectivity(url)
    } catch (testError) {
      console.error('RSS connectivity test error:', testError)
      // Provide a fallback validation result
      validationResult = {
        valid: false,
        error: testError instanceof Error ? testError.message : 'Failed to test RSS feed'
      }
    }
    
    // Add additional information for UI
    const response = {
      ...validationResult,
      suggestedName: suggestFeedName(url, validationResult.title),
      detectedType: detectRSSFeedType(url),
      timestamp: new Date().toISOString()
    }

    // Return validation result (regardless of success/failure)
    return NextResponse.json({ validation: response })
  } catch (error) {
    console.error('Error validating RSS URL:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        validation: {
          valid: false,
          error: 'Server error while validating URL',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}