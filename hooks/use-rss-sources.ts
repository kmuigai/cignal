"use client"

import { useState, useEffect, useCallback } from "react"
import type { RSSSource, CreateRSSSource, UpdateRSSSource, RSSValidationResult } from "@/lib/types"

interface UseRSSSourcesResult {
  sources: RSSSource[]
  loading: boolean
  error: string | null
  addSource: (source: CreateRSSSource) => Promise<RSSSource>
  updateSource: (id: string, updates: UpdateRSSSource) => Promise<void>
  deleteSource: (id: string) => Promise<void>
  testSource: (url: string) => Promise<RSSValidationResult>
  testExistingSource: (id: string) => Promise<RSSValidationResult>
  refreshSources: () => Promise<void>
}

/**
 * Hook for managing RSS sources for a specific company
 */
export function useRSSSourcesByCompany(companyId: string): UseRSSSourcesResult {
  const [sources, setSources] = useState<RSSSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch RSS sources for the company
  const fetchSources = useCallback(async () => {
    if (!companyId) {
      setSources([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${companyId}/rss-sources`)
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch RSS sources: ${response.statusText}`
        
        // Try to get more specific error from response body
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Ignore JSON parsing errors, use generic message
        }
        
        // Add more context for common errors
        if (response.status === 401) {
          errorMessage = 'Not authorized - please check if you are logged in'
        } else if (response.status === 403) {
          errorMessage = 'Access denied - company may not belong to your account'
        } else if (response.status === 404) {
          errorMessage = 'Company not found'
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setSources(result.sources || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching RSS sources:', {
        companyId,
        error: err,
        url: `/api/companies/${companyId}/rss-sources`
      })
    } finally {
      setLoading(false)
    }
  }, [companyId])

  // Add a new RSS source
  const addSource = useCallback(async (source: CreateRSSSource): Promise<RSSSource> => {
    if (!companyId) {
      throw new Error('Company ID is required')
    }

    const response = await fetch(`/api/companies/${companyId}/rss-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(source),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add RSS source')
    }

    const result = await response.json()
    const newSource = result.source

    // Update local state
    setSources(prev => [...prev, newSource])

    return newSource
  }, [companyId])

  // Update an existing RSS source
  const updateSource = useCallback(async (id: string, updates: UpdateRSSSource): Promise<void> => {
    const response = await fetch(`/api/rss-sources/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update RSS source')
    }

    const result = await response.json()
    const updatedSource = result.source

    // Update local state
    setSources(prev => prev.map(source => 
      source.id === id ? updatedSource : source
    ))
  }, [])

  // Delete an RSS source
  const deleteSource = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/rss-sources/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete RSS source')
    }

    // Update local state
    setSources(prev => prev.filter(source => source.id !== id))
  }, [])

  // Test a new RSS URL (validation)
  const testSource = useCallback(async (url: string): Promise<RSSValidationResult> => {
    const response = await fetch('/api/rss-sources/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate RSS URL')
    }

    const result = await response.json()
    return result.validation
  }, [])

  // Test an existing RSS source
  const testExistingSource = useCallback(async (id: string): Promise<RSSValidationResult> => {
    const response = await fetch(`/api/rss-sources/${id}/test`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to test RSS source')
    }

    const result = await response.json()
    
    // Refresh sources to get updated metrics
    await fetchSources()
    
    return result.testResult
  }, [fetchSources])

  // Refresh sources (useful after external changes)
  const refreshSources = useCallback(async (): Promise<void> => {
    await fetchSources()
  }, [fetchSources])

  // Fetch sources when component mounts or companyId changes
  useEffect(() => {
    if (companyId) {
      fetchSources()
    } else {
      setSources([])
      setError(null)
    }
  }, [companyId, fetchSources])

  return {
    sources,
    loading,
    error,
    addSource,
    updateSource,
    deleteSource,
    testSource,
    testExistingSource,
    refreshSources,
  }
}

/**
 * Hook for managing RSS sources across all user companies (admin view)
 */
export function useAllRSSSourcesByUser() {
  const [sources, setSources] = useState<RSSSource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllSources = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // This would require a new API endpoint for getting all user sources
      // For now, this is a placeholder for future implementation
      console.log('All sources fetch not yet implemented')
      setSources([])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching all RSS sources:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllSources()
  }, [fetchAllSources])

  return {
    sources,
    loading,
    error,
    refreshSources: fetchAllSources,
  }
}