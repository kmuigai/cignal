import { NextResponse } from "next/server"
import { getGoogleNewsHealthCheck, googleNewsMonitor } from "@/lib/google-news-monitor"
import { getRedirectCacheStats } from "@/lib/google-news-resolver"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const window = searchParams.get("window") // Time window in hours
    const detailed = searchParams.get("detailed") === "true"

    // Get health check data
    const healthCheck = getGoogleNewsHealthCheck()
    
    // Get cache statistics
    const cacheStats = getRedirectCacheStats()

    // Get window-specific metrics if requested
    let windowMetrics = undefined
    if (window) {
      const windowMs = parseInt(window) * 60 * 60 * 1000 // Convert hours to ms
      if (!isNaN(windowMs) && windowMs > 0) {
        windowMetrics = googleNewsMonitor.getMetricsForWindow(windowMs)
      }
    }

    // Get recent events if detailed view requested
    let recentEvents = undefined
    if (detailed) {
      recentEvents = googleNewsMonitor.getRecentEvents(20)
    }

    const response = {
      status: healthCheck.status,
      timestamp: new Date().toISOString(),
      overall: {
        metrics: healthCheck.metrics,
        insights: healthCheck.insights,
        cache: cacheStats
      },
      ...(windowMetrics && {
        window: {
          hours: parseInt(window!),
          metrics: windowMetrics
        }
      }),
      ...(recentEvents && {
        recentEvents: recentEvents.map(event => ({
          timestamp: new Date(event.timestamp).toISOString(),
          url: event.url.substring(0, 100) + (event.url.length > 100 ? '...' : ''),
          success: event.success,
          timing: {
            redirect: event.redirectTime,
            extraction: event.extractionTime,
            total: event.totalTime
          },
          cached: event.cached,
          finalSource: event.finalSource,
          extractedBy: event.extractedBy,
          confidence: event.confidence,
          error: event.error
        }))
      })
    }

    // Set appropriate HTTP status based on health
    let httpStatus = 200
    if (healthCheck.status === 'degraded') {
      httpStatus = 200 // Still OK, but with warnings
    } else if (healthCheck.status === 'unhealthy') {
      httpStatus = 503 // Service unavailable
    }

    return NextResponse.json(response, { status: httpStatus })

  } catch (error) {
    console.error("❌ Health check failed:", error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        overall: {
          metrics: null,
          insights: null,
          cache: null
        }
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to reset metrics (for testing/maintenance)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'reset') {
      googleNewsMonitor.reset()
      
      return NextResponse.json({
        success: true,
        message: 'Google News extraction metrics have been reset',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Supported actions: reset'
      },
      { status: 400 }
    )

  } catch (error) {
    console.error("❌ Health check action failed:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 