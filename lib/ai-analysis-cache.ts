import { cacheManager } from "./cache"

interface AIAnalysis {
  summary: string
  keyPoints: string[]
  highlights: Array<{
    type: "financial" | "opportunity" | "risk" | "strategic"
    text: string
    start: number
    end: number
  }>
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  analyzedAt: string
}

class AIAnalysisCache {
  private readonly CACHE_PREFIX = "ai-analysis-"
  private readonly DEFAULT_TTL_HOURS = 24 // Cache for 24 hours

  /**
   * Generate cache key from press release content
   */
  private generateCacheKey(title: string, content: string): string {
    // Create a hash-like key from title and content
    const combined = `${title}-${content}`.replace(/\s+/g, " ").trim()
    const hash = this.simpleHash(combined)
    return `${this.CACHE_PREFIX}${hash}`
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get cached AI analysis
   */
  getCachedAnalysis(title: string, content: string): AIAnalysis | null {
    try {
      const cacheKey = this.generateCacheKey(title, content)
      return cacheManager.getCached<AIAnalysis>(cacheKey)
    } catch (error) {
      console.error("Error reading AI analysis cache:", error)
      return null
    }
  }

  /**
   * Store AI analysis in cache
   */
  setCachedAnalysis(title: string, content: string, analysis: Omit<AIAnalysis, "analyzedAt">): void {
    try {
      const cacheKey = this.generateCacheKey(title, content)
      const analysisWithTimestamp: AIAnalysis = {
        ...analysis,
        analyzedAt: new Date().toISOString(),
      }

      cacheManager.setCached(cacheKey, analysisWithTimestamp, {
        ttlMinutes: this.DEFAULT_TTL_HOURS * 60,
      })
    } catch (error) {
      console.error("Error caching AI analysis:", error)
    }
  }

  /**
   * Check if analysis is cached
   */
  isAnalysisCached(title: string, content: string): boolean {
    try {
      const cacheKey = this.generateCacheKey(title, content)
      return cacheManager.isCacheValid(cacheKey)
    } catch (error) {
      console.error("Error checking AI analysis cache:", error)
      return false
    }
  }

  /**
   * Clear specific analysis cache
   */
  clearAnalysisCache(title: string, content: string): void {
    try {
      const cacheKey = this.generateCacheKey(title, content)
      cacheManager.clearCache(cacheKey)
    } catch (error) {
      console.error("Error clearing AI analysis cache:", error)
    }
  }

  /**
   * Clear all AI analysis cache
   */
  clearAllAnalysisCache(): void {
    try {
      // Get all localStorage keys and remove AI analysis entries
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.includes(this.CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error("Error clearing all AI analysis cache:", error)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalAnalyses: number; totalSize: number } {
    let totalAnalyses = 0
    let totalSize = 0

    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.includes(this.CACHE_PREFIX)) {
          totalAnalyses++
          const value = localStorage.getItem(key)
          if (value) {
            totalSize += value.length
          }
        }
      })
    } catch (error) {
      console.error("Error getting AI cache stats:", error)
    }

    return { totalAnalyses, totalSize }
  }
}

export const aiAnalysisCache = new AIAnalysisCache()
