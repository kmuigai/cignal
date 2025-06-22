"use client"

import { useState, useEffect } from "react"

interface ContentExtractionResult {
  success: boolean
  content: string
  htmlContent?: string
  textContent?: string
  extractedBy?: string
  confidence?: number
  error?: string
}

export function useContentExtraction(url: string | null) {
  const [data, setData] = useState<ContentExtractionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const extractContent = async () => {
      setLoading(true)
      setError(null)

      try {
        // Determine which API endpoint to use based on URL type
        const isGoogleNews = url.includes('news.google.com/rss/articles/') || 
                            url.includes('news.google.com/articles/')
        
        const apiEndpoint = isGoogleNews 
          ? '/api/extract-google-news-content'
          : '/api/extract-content'

        console.log(`🔍 Using ${isGoogleNews ? 'Google News' : 'standard'} extraction for: ${url.substring(0, 100)}...`)

        const response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(url)}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || `HTTP ${response.status}`)
        }

        // Handle different response formats
        if (isGoogleNews) {
          // Google News API response format
          if (result.success) {
            setData({
              success: true,
              content: result.content || "",
              htmlContent: result.htmlContent,
              textContent: result.textContent,
              extractedBy: result.extractedBy,
              confidence: result.confidence
            })
            console.log(`✅ Google News extraction successful (${result.extractedBy}, ${result.timing?.total}ms)`)
          } else {
            throw new Error(result.error || 'Google News extraction failed')
          }
        } else {
          // Standard extraction API response format
          setData(result)
          console.log(`✅ Standard extraction successful`)
        }

      } catch (err) {
        console.error("Content extraction error:", err)
        setError(err instanceof Error ? err.message : "Failed to extract content")
        setData({ 
          success: false, 
          content: "", 
          htmlContent: "",
          textContent: "",
          error: err instanceof Error ? err.message : "Unknown error" 
        })
      } finally {
        setLoading(false)
      }
    }

    extractContent()
  }, [url])

  return { data, loading, error }
}

/**
 * Helper function to get the best available content from extraction result
 */
export function getBestContent(data: ContentExtractionResult | null): {
  content: string
  isHTML: boolean
  hasContent: boolean
} {
  if (!data || !data.success) {
    return {
      content: "",
      isHTML: false,
      hasContent: false
    }
  }

  // Prefer HTML content if available and valid
  if (data.htmlContent && data.htmlContent.trim().length > 0) {
    return {
      content: data.htmlContent,
      isHTML: true,
      hasContent: true
    }
  }

  // Fallback to text content
  if (data.textContent && data.textContent.trim().length > 0) {
    return {
      content: data.textContent,
      isHTML: false,
      hasContent: true
    }
  }

  // Final fallback to main content field
  if (data.content && data.content.trim().length > 0) {
    return {
      content: data.content,
      isHTML: data.htmlContent ? true : false,
      hasContent: true
    }
  }

  return {
    content: "",
    isHTML: false,
    hasContent: false
  }
}
