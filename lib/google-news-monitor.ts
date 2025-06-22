/**
 * Google News Extraction Monitoring
 * Tracks performance, success rates, and provides insights
 */

interface ExtractionMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageRedirectTime: number
  averageExtractionTime: number
  averageTotalTime: number
  successRate: number
  cacheHitRate: number
  errorsByType: Record<string, number>
  sourceDistribution: Record<string, number>
  lastUpdated: number
}

interface ExtractionEvent {
  timestamp: number
  url: string
  success: boolean
  redirectTime: number
  extractionTime: number
  totalTime: number
  cached: boolean
  finalSource?: string
  extractedBy?: string
  confidence?: number
  error?: string
}

// In-memory metrics storage (in production, consider persistent storage)
class GoogleNewsMonitor {
  private metrics: ExtractionMetrics
  private recentEvents: ExtractionEvent[] = []
  private readonly maxEvents = 1000

  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageRedirectTime: 0,
      averageExtractionTime: 0,
      averageTotalTime: 0,
      successRate: 0,
      cacheHitRate: 0,
      errorsByType: {},
      sourceDistribution: {},
      lastUpdated: Date.now()
    }
  }

  /**
   * Record a successful extraction event
   */
  recordSuccess(event: {
    url: string
    redirectTime: number
    extractionTime: number
    totalTime: number
    cached: boolean
    finalSource?: string
    extractedBy?: string
    confidence?: number
  }): void {
    const extractionEvent: ExtractionEvent = {
      timestamp: Date.now(),
      success: true,
      ...event
    }

    this.addEvent(extractionEvent)
    this.updateMetrics()
  }

  /**
   * Record a failed extraction event
   */
  recordFailure(event: {
    url: string
    redirectTime: number
    extractionTime: number
    totalTime: number
    error: string
  }): void {
    const extractionEvent: ExtractionEvent = {
      timestamp: Date.now(),
      success: false,
      cached: false,
      ...event
    }

    this.addEvent(extractionEvent)
    this.updateMetrics()
  }

  /**
   * Get current metrics
   */
  getMetrics(): ExtractionMetrics {
    return { ...this.metrics }
  }

  /**
   * Get recent events (for debugging)
   */
  getRecentEvents(limit: number = 50): ExtractionEvent[] {
    return this.recentEvents
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get performance insights
   */
  getInsights(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    recommendations: string[]
    topErrors: Array<{ error: string; count: number }>
    topSources: Array<{ source: string; count: number }>
    performanceIssues: string[]
  } {
    const insights = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      recommendations: [] as string[],
      topErrors: [] as Array<{ error: string; count: number }>,
      topSources: [] as Array<{ source: string; count: number }>,
      performanceIssues: [] as string[]
    }

    // Determine overall health status
    if (this.metrics.successRate < 0.5) {
      insights.status = 'unhealthy'
    } else if (this.metrics.successRate < 0.8) {
      insights.status = 'degraded'
    }

    // Generate recommendations based on metrics
    if (this.metrics.successRate < 0.8) {
      insights.recommendations.push('Success rate is below 80%. Consider investigating common failure patterns.')
    }

    if (this.metrics.cacheHitRate < 0.3) {
      insights.recommendations.push('Cache hit rate is low. Consider increasing cache TTL or improving cache key strategy.')
    }

    if (this.metrics.averageTotalTime > 10000) {
      insights.recommendations.push('Average extraction time is high (>10s). Consider optimizing timeout settings.')
    }

    // Top errors
    insights.topErrors = Object.entries(this.metrics.errorsByType)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Top sources
    insights.topSources = Object.entries(this.metrics.sourceDistribution)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Performance issues
    if (this.metrics.averageRedirectTime > 5000) {
      insights.performanceIssues.push('High redirect resolution time (>5s)')
    }

    if (this.metrics.averageExtractionTime > 8000) {
      insights.performanceIssues.push('High content extraction time (>8s)')
    }

    return insights
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageRedirectTime: 0,
      averageExtractionTime: 0,
      averageTotalTime: 0,
      successRate: 0,
      cacheHitRate: 0,
      errorsByType: {},
      sourceDistribution: {},
      lastUpdated: Date.now()
    }
    this.recentEvents = []
  }

  /**
   * Get metrics for a specific time window
   */
  getMetricsForWindow(windowMs: number): ExtractionMetrics {
    const cutoff = Date.now() - windowMs
    const windowEvents = this.recentEvents.filter(e => e.timestamp >= cutoff)

    if (windowEvents.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageRedirectTime: 0,
        averageExtractionTime: 0,
        averageTotalTime: 0,
        successRate: 0,
        cacheHitRate: 0,
        errorsByType: {},
        sourceDistribution: {},
        lastUpdated: Date.now()
      }
    }

    const successful = windowEvents.filter(e => e.success)
    const failed = windowEvents.filter(e => !e.success)
    const cached = windowEvents.filter(e => e.cached)

    const avgRedirectTime = windowEvents.reduce((sum, e) => sum + e.redirectTime, 0) / windowEvents.length
    const avgExtractionTime = windowEvents.reduce((sum, e) => sum + e.extractionTime, 0) / windowEvents.length
    const avgTotalTime = windowEvents.reduce((sum, e) => sum + e.totalTime, 0) / windowEvents.length

    const errorsByType: Record<string, number> = {}
    failed.forEach(event => {
      if (event.error) {
        errorsByType[event.error] = (errorsByType[event.error] || 0) + 1
      }
    })

    const sourceDistribution: Record<string, number> = {}
    successful.forEach(event => {
      if (event.finalSource) {
        sourceDistribution[event.finalSource] = (sourceDistribution[event.finalSource] || 0) + 1
      }
    })

    return {
      totalRequests: windowEvents.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageRedirectTime: avgRedirectTime,
      averageExtractionTime: avgExtractionTime,
      averageTotalTime: avgTotalTime,
      successRate: successful.length / windowEvents.length,
      cacheHitRate: cached.length / windowEvents.length,
      errorsByType,
      sourceDistribution,
      lastUpdated: Date.now()
    }
  }

  private addEvent(event: ExtractionEvent): void {
    this.recentEvents.push(event)

    // Keep only the most recent events
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents = this.recentEvents.slice(-this.maxEvents)
    }
  }

  private updateMetrics(): void {
    const successful = this.recentEvents.filter(e => e.success)
    const failed = this.recentEvents.filter(e => !e.success)
    const cached = this.recentEvents.filter(e => e.cached)

    this.metrics.totalRequests = this.recentEvents.length
    this.metrics.successfulRequests = successful.length
    this.metrics.failedRequests = failed.length
    this.metrics.successRate = this.recentEvents.length > 0 ? successful.length / this.recentEvents.length : 0
    this.metrics.cacheHitRate = this.recentEvents.length > 0 ? cached.length / this.recentEvents.length : 0

    if (this.recentEvents.length > 0) {
      this.metrics.averageRedirectTime = this.recentEvents.reduce((sum, e) => sum + e.redirectTime, 0) / this.recentEvents.length
      this.metrics.averageExtractionTime = this.recentEvents.reduce((sum, e) => sum + e.extractionTime, 0) / this.recentEvents.length
      this.metrics.averageTotalTime = this.recentEvents.reduce((sum, e) => sum + e.totalTime, 0) / this.recentEvents.length
    }

    // Update error distribution
    this.metrics.errorsByType = {}
    failed.forEach(event => {
      if (event.error) {
        this.metrics.errorsByType[event.error] = (this.metrics.errorsByType[event.error] || 0) + 1
      }
    })

    // Update source distribution
    this.metrics.sourceDistribution = {}
    successful.forEach(event => {
      if (event.finalSource) {
        this.metrics.sourceDistribution[event.finalSource] = (this.metrics.sourceDistribution[event.finalSource] || 0) + 1
      }
    })

    this.metrics.lastUpdated = Date.now()
  }
}

// Global monitor instance
export const googleNewsMonitor = new GoogleNewsMonitor()

/**
 * Utility function to log extraction events
 */
export function logGoogleNewsExtraction(
  result: {
    success: boolean
    originalUrl: string
    resolvedUrl?: string
    timing: {
      redirectResolution: number
      contentExtraction: number
      total: number
    }
    cached?: boolean
    extractedBy?: string
    confidence?: number
    error?: string
  }
): void {
  try {
    const finalSource = result.resolvedUrl ? new URL(result.resolvedUrl).hostname : undefined

    if (result.success) {
      googleNewsMonitor.recordSuccess({
        url: result.originalUrl,
        redirectTime: result.timing.redirectResolution,
        extractionTime: result.timing.contentExtraction,
        totalTime: result.timing.total,
        cached: result.cached || false,
        finalSource,
        extractedBy: result.extractedBy,
        confidence: result.confidence
      })
    } else {
      googleNewsMonitor.recordFailure({
        url: result.originalUrl,
        redirectTime: result.timing.redirectResolution,
        extractionTime: result.timing.contentExtraction,
        totalTime: result.timing.total,
        error: result.error || 'Unknown error'
      })
    }
  } catch (error) {
    console.error('Error logging Google News extraction:', error)
  }
}

/**
 * Get a health check summary
 */
export function getGoogleNewsHealthCheck(): {
  status: 'healthy' | 'degraded' | 'unhealthy'
  metrics: ExtractionMetrics
  insights: ReturnType<GoogleNewsMonitor['getInsights']>
  recentWindow: ExtractionMetrics
} {
  const metrics = googleNewsMonitor.getMetrics()
  const insights = googleNewsMonitor.getInsights()
  const recentWindow = googleNewsMonitor.getMetricsForWindow(60 * 60 * 1000) // Last hour

  return {
    status: insights.status,
    metrics,
    insights,
    recentWindow
  }
} 