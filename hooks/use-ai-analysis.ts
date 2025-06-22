"use client"

import { useState, useCallback, useEffect } from "react"
import { DEFAULT_AI_PROMPTS } from "@/lib/ai-prompts"

export interface AnalysisResult {
  summary: string
  keyPoints: string[]
  highlights: Array<{
    type: "financial" | "opportunity" | "risk" | "strategic"
    text: string
    reasoning?: string
    start?: number
    end?: number
  }>
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// Legacy hook for manual analysis
interface UseAIAnalysisReturn {
  analyze: (content: string, title?: string, companyName?: string, date?: string) => Promise<AnalysisResult | null>
  isAnalyzing: boolean
  error: string | null
}

export function useAIAnalysisLegacy(): UseAIAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(
    async (content: string, title?: string, companyName?: string, date?: string): Promise<AnalysisResult | null> => {
      setIsAnalyzing(true)
      setError(null)

      try {
        // Get API key
        const { claudeAPIKeyManager } = await import("@/lib/claude-api-key")
        const apiKey = claudeAPIKeyManager.getAPIKey()

        if (!apiKey) {
          throw new Error("Please configure your Claude API key in Settings → AI Configuration")
        }

        // Use default prompts
        const customPrompts = DEFAULT_AI_PROMPTS

        const response = await fetch("/api/analyze-release", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            title,
            companyName,
            date,
            apiKey,
            customPrompts,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to analyze content")
        }

        if (!data.success) {
          throw new Error(data.error || "Analysis failed")
        }

        return {
          summary: data.summary,
          keyPoints: data.keyPoints || [],
          highlights: data.highlights || [],
          usage: data.usage,
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(errorMessage)
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    [],
  )

  return {
    analyze,
    isAnalyzing,
    error,
  }
}

// New automatic analysis hook
interface UseAutoAIAnalysisReturn {
  analysis: AnalysisResult | null
  loading: boolean
  error: string | null
  performAnalysis: (forceRefresh?: boolean) => Promise<void>
  checkAPIKey: () => Promise<boolean>
  fromCache: boolean
  cacheAge: string | null
}

// Simple in-memory cache for AI analysis results
class AIAnalysisCache {
  private cache = new Map<string, { result: AnalysisResult; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private getCacheKey(title: string, content: string): string {
    // Create a simple hash of title + content for cache key
    return `${title.slice(0, 50)}-${content.slice(0, 100)}`.replace(/[^a-zA-Z0-9]/g, "")
  }

  getCachedAnalysis(title: string, content: string): { result: AnalysisResult; age: string } | null {
    const key = this.getCacheKey(title, content)
    const cached = this.cache.get(key)

    if (!cached) return null

    const now = Date.now()
    const age = now - cached.timestamp

    // Check if cache is still valid
    if (age > this.CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }

    // Format age string
    const ageMinutes = Math.floor(age / (1000 * 60))
    const ageString = ageMinutes === 0 ? "just now" : `${ageMinutes} minute${ageMinutes === 1 ? "" : "s"} ago`

    return {
      result: cached.result,
      age: ageString,
    }
  }

  setCachedAnalysis(title: string, content: string, result: AnalysisResult): void {
    const key = this.getCacheKey(title, content)
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    })

    // Clean up old entries (keep only last 10)
    if (this.cache.size > 10) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      this.cache.clear()
      entries.slice(0, 10).forEach(([k, v]) => this.cache.set(k, v))
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

const aiAnalysisCache = new AIAnalysisCache()

/**
 * Hook for AI analysis with caching and error handling
 */
export function useAIAnalysis(title: string, content: string): UseAutoAIAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [cacheAge, setCacheAge] = useState<string | null>(null)

  const checkAPIKey = useCallback(async (): Promise<boolean> => {
    try {
      const { claudeAPIKeyManager } = await import("@/lib/claude-api-key")
      const hasKey = await claudeAPIKeyManager.hasAPIKey()
      return hasKey
    } catch (error) {
      console.error("Error checking API key:", error)
      return false
    }
  }, [])

  const performAnalysis = useCallback(
    async (forceRefresh = false) => {
      if (!title.trim() || !content.trim()) {
        setError("Title and content are required for analysis")
        return
      }

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = aiAnalysisCache.getCachedAnalysis(title, content)
        if (cached) {
          setAnalysis(cached.result)
          setFromCache(true)
          setCacheAge(cached.age)
          setError(null)
          setLoading(false)
          console.log(`📋 Using cached AI analysis (${cached.age})`)
          return
        }
      }

      setLoading(true)
      setError(null)
      setFromCache(false)
      setCacheAge(null)

      try {
        // Check API key first
        const hasAPIKey = await checkAPIKey()
        if (!hasAPIKey) {
          throw new Error("Configure your Claude API key in Settings → AI Configuration to enable AI analysis")
        }

        console.log("🔍 API Key check passed")

        // Get the API key
        const { claudeAPIKeyManager } = await import("@/lib/claude-api-key")
        const apiKey = await claudeAPIKeyManager.getAPIKey()

        if (!apiKey) {
          throw new Error("Configure your Claude API key in Settings → AI Configuration to enable AI analysis")
        }

        console.log("🔍 Retrieved API Key (first 20 chars):", apiKey.substring(0, 20))
        console.log("🔍 Retrieved API Key length:", apiKey.length)

        console.log(`🤖 Starting AI analysis for: ${title.substring(0, 50)}...`)

        const response = await fetch("/api/analyze-release", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            title,
            apiKey,
            customPrompts: DEFAULT_AI_PROMPTS,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to analyze content")
        }

        if (!data.success) {
          throw new Error(data.error || "Analysis failed")
        }

        const result: AnalysisResult = {
          summary: data.summary,
          keyPoints: data.keyPoints || [],
          highlights: data.highlights || [],
          usage: data.usage,
        }

        setAnalysis(result)

        // Cache the result
        aiAnalysisCache.setCachedAnalysis(title, content, result)

        console.log(`✅ AI analysis complete: ${result.highlights?.length || 0} highlights found`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Analysis failed due to unexpected error"
        setError(errorMessage)
        console.error("❌ AI analysis error:", errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [title, content, checkAPIKey],
  )

  // Auto-analyze when title or content changes (with debouncing)
  useEffect(() => {
    if (!title.trim() || !content.trim()) return

    const timeoutId = setTimeout(() => {
      performAnalysis()
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [title, content, performAnalysis])

  return {
    analysis,
    loading,
    error,
    performAnalysis,
    checkAPIKey,
    fromCache,
    cacheAge,
  }
}
