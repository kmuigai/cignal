"use client"

import { useState, useEffect } from "react"

interface ContentExtractionResult {
  success: boolean
  content: string
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
        const response = await fetch(`/api/extract-content?url=${encodeURIComponent(url)}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || `HTTP ${response.status}`)
        }

        setData(result)
      } catch (err) {
        console.error("Content extraction error:", err)
        setError(err instanceof Error ? err.message : "Failed to extract content")
        setData({ success: false, content: "", error: err instanceof Error ? err.message : "Unknown error" })
      } finally {
        setLoading(false)
      }
    }

    extractContent()
  }, [url])

  return { data, loading, error }
}
