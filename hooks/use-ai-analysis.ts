"use client"

import { useState, useCallback, useEffect } from "react"
import { getCustomPrompts } from "@/lib/ai-prompts"
import { aiAnalysisCache } from "@/lib/ai-analysis-cache"

interface AnalysisResult {
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

        // Get custom prompts
        const customPrompts = getCustomPrompts()

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
  retry: () => void
  fromCache: boolean
  cacheAge?: string
}

export function useAIAnalysis(title: string, content: string): UseAutoAIAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [cacheAge, setCacheAge] = useState<string>()
  const [hasAPIKey, setHasAPIKey] = useState<boolean | null>(null)

  // Check API key availability
  const checkAPIKey = useCallback(async () => {
    try {
      const { claudeAPIKeyManager } = await import("@/lib/claude-api-key")
      const apiKey = await claudeAPIKeyManager.getAPIKey()
      setHasAPIKey(!!apiKey)
      return !!apiKey
    } catch {
      setHasAPIKey(false)
      return false
    }
  }, [])

  const performAnalysis = useCallback(
    async (forceRefresh = false) => {
      if (!title || !content) return

      // Check API key first
      const hasKey = await checkAPIKey()
      if (!hasKey) {
        setError("Configure your Claude API key in Settings → AI Configuration to enable AI analysis")
        setLoading(false)
        return
      }

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = aiAnalysisCache.getCachedAnalysis(title, content)
        if (cached) {
          setAnalysis({
            summary: cached.summary,
            keyPoints: cached.keyPoints,
            highlights: cached.highlights,
            usage: cached.usage,
          })
          setFromCache(true)
          setError(null)
          setLoading(false)

          // Calculate cache age
          const analysisDate = new Date(cached.analyzedAt)
          const now = new Date()
          const diffHours = Math.floor((now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60))
          
          if (diffHours < 1) {
            setCacheAge("Just now")
          } else if (diffHours < 24) {
            setCacheAge(`${diffHours}h ago`)
          } else {
            const diffDays = Math.floor(diffHours / 24)
            setCacheAge(`${diffDays}d ago`)
          }
          
          return
        }
      }

      setLoading(true)
      setError(null)
      setFromCache(false)
      setCacheAge(undefined)

      try {
        // Get API key (we already checked it exists)
        const { claudeAPIKeyManager } = await import("@/lib/claude-api-key")
        const apiKey = await claudeAPIKeyManager.getAPIKey()

        if (!apiKey) {
          throw new Error("Configure your Claude API key in Settings → AI Configuration to enable AI analysis")
        }

        console.log("🔍 Retrieved API Key (first 20 chars):", apiKey.substring(0, 20))
        console.log("🔍 Retrieved API Key length:", apiKey.length)

        // Get custom prompts
        const customPrompts = getCustomPrompts()

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

  // Check API key and auto-start analysis when title/content changes
  useEffect(() => {
    const initializeAnalysis = async () => {
      const hasKey = await checkAPIKey()
      if (hasKey) {
        performAnalysis()
      }
    }
    
    initializeAnalysis()
  }, [performAnalysis, checkAPIKey])

  const retry = useCallback(() => {
    performAnalysis(true) // Force refresh
  }, [performAnalysis])

  return {
    analysis,
    loading,
    error,
    retry,
    fromCache,
    cacheAge,
  }
}
