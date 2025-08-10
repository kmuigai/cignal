"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Company } from "@/lib/types"
import { pressReleasesCache, generateCompaniesKey } from "@/lib/cache"

interface RSSItem {
  title: string
  description: string
  pubDate: string
  link: string
  companyMentions: string[]
  matchedCompany?: string
  // Fintech detection fields
  isFintech?: boolean
  fintechCategories?: string[]
  fintechRelevanceScore?: number
}

interface RSSResponse {
  items: RSSItem[]
  fetchedAt: string
  totalItems: number
  filteredItems: number
  userCompanies: string[]
}

interface EnhancedPressRelease {
  id: string
  title: string
  content: string
  summary: string
  sourceUrl: string
  publishedAt: string
  companyId: string
  matchedCompany: string
  source: 'rss' | 'database'
  createdAt: string
  // Fintech detection fields
  isFintech?: boolean
  fintechCategories?: string[]
  fintechRelevanceScore?: number
}

interface EnhancedResponse {
  items: EnhancedPressRelease[]
  fetchedAt: string
  totalItems: number
  rssItems: number
  storedItems: number
  userCompanies: string[]
}

/**
 * Enhanced hook that combines live RSS data with stored database articles
 * This solves the "disappearing articles" problem by showing both current and historical releases
 */
export function useEnhancedPressReleases(companies: Company[]) {
  const [data, setData] = useState<EnhancedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const companiesKey = generateCompaniesKey(companies.map((c) => ({ name: c.name, variations: c.variations })))

  const fetchEnhancedReleases = useCallback(
    async (forceRefresh = false, silent = false) => {
      if (companies.length === 0) {
        setData({ 
          items: [], 
          fetchedAt: new Date().toISOString(), 
          totalItems: 0, 
          rssItems: 0,
          storedItems: 0,
          userCompanies: [] 
        })
        if (!silent) setLoading(false)
        setLastUpdated(Date.now())
        return
      }

      // Check cache first unless forcing refresh
      if (!forceRefresh) {
                 const cachedData = pressReleasesCache.get(companiesKey + '-enhanced') as EnhancedResponse | null
         if (cachedData) {
           console.log("📦 Using cached enhanced press releases data")
           setData(cachedData)
           if (!silent) setLoading(false)
           setError(null)
           const cacheTimestamp = pressReleasesCache.getTimestamp(companiesKey + '-enhanced')
           setLastUpdated(cacheTimestamp)
           return
         }
      }

      // Only show loading state if not a silent refresh
      if (!silent) setLoading(true)
      setError(null)

      try {
        console.log("🌐 Fetching enhanced press releases data (RSS + Database)")

        // Prepare companies data for API calls
        const companiesData = companies.map((company) => ({
          id: company.id,
          name: company.name,
          variations: company.variations,
        }))

        const companiesParam = encodeURIComponent(JSON.stringify(companiesData))

        // Fetch both RSS and stored data in parallel
        const [rssResponse, storedResponse] = await Promise.allSettled([
          // Get current RSS data
          fetch(`/api/fetch-releases?companies=${companiesParam}`),
          // Get stored database data
          fetch(`/api/get-stored-releases?companies=${companiesParam}&limit=100`)
        ])

        let rssItems: EnhancedPressRelease[] = []
        let storedItems: EnhancedPressRelease[] = []

        // Process RSS data
        if (rssResponse.status === 'fulfilled' && rssResponse.value.ok) {
          const rssResult = await rssResponse.value.json()
          rssItems = (rssResult.items || []).map((item: RSSItem, index: number) => ({
            id: `rss-${index}-${Date.now()}`,
            title: item.title,
            content: item.description,
            summary: item.description.substring(0, 200) + (item.description.length > 200 ? '...' : ''),
            sourceUrl: item.link,
            publishedAt: item.pubDate,
            companyId: item.matchedCompany || 'unknown',
            matchedCompany: item.matchedCompany || 'Unknown',
            source: 'rss' as const,
            createdAt: new Date().toISOString(),
            // Preserve fintech detection fields
            isFintech: item.isFintech,
            fintechCategories: item.fintechCategories,
            fintechRelevanceScore: item.fintechRelevanceScore
          }))
          console.log(`📡 Fetched ${rssItems.length} RSS items`)
        } else {
          console.warn("⚠️ RSS fetch failed, continuing with stored data only")
        }

        // Process stored data (this might fail due to schema cache, but that's OK)
        if (storedResponse.status === 'fulfilled' && storedResponse.value.ok) {
          const storedResult = await storedResponse.value.json()
          storedItems = storedResult.items || []
          console.log(`💾 Fetched ${storedItems.length} stored items`)
        } else {
          console.warn("⚠️ Stored data fetch failed (possibly due to schema cache), continuing with RSS only")
        }

        // Combine and deduplicate items (prefer RSS for recent items)
        const allItems = [...rssItems, ...storedItems]
        const uniqueItems = deduplicateByUrl(allItems)
        
        // Sort by published date (newest first)
        uniqueItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

        const result: EnhancedResponse = {
          items: uniqueItems,
          fetchedAt: new Date().toISOString(),
          totalItems: uniqueItems.length,
          rssItems: rssItems.length,
          storedItems: storedItems.length,
          userCompanies: companiesData.map((c) => c.name),
        }

        // Cache the result
        pressReleasesCache.set(companiesKey + '-enhanced', result)
        const cacheTimestamp = pressReleasesCache.getTimestamp(companiesKey + '-enhanced')

        setData(result)
        setLastUpdated(cacheTimestamp)
        console.log(`✅ Enhanced data: ${result.rssItems} RSS + ${result.storedItems} stored = ${result.totalItems} total items`)
      } catch (err) {
        console.error("Error fetching enhanced press releases:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch press releases")
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [companies, companiesKey],
  )

  // Initial fetch
  useEffect(() => {
    fetchEnhancedReleases()
  }, [fetchEnhancedReleases])
  
  // Previous companies reference to detect actual changes
  const prevCompaniesRef = useRef<Company[]>([])
  
  // Auto-refresh when companies list actually changes
  useEffect(() => {
    // Check if companies actually changed (not just re-render)
    const currentCompaniesKey = JSON.stringify(companies.map(c => ({ name: c.name, variations: c.variations })))
    const prevCompaniesKey = JSON.stringify(prevCompaniesRef.current.map(c => ({ name: c.name, variations: c.variations })))
    
    if (companies.length > 0 && currentCompaniesKey !== prevCompaniesKey) {
      console.log("👥 Companies actually changed in hook, triggering silent refresh")
      console.log("📋 Previous:", prevCompaniesRef.current.map(c => c.name))
      console.log("📋 Current:", companies.map(c => c.name))
      
      prevCompaniesRef.current = companies
      fetchEnhancedReleases(true, true) // Force refresh, silent mode
    } else if (companies.length === 0) {
      prevCompaniesRef.current = []
    }
  }, [companies, fetchEnhancedReleases])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchEnhancedReleases(true)
  }, [fetchEnhancedReleases])

  // Silent refresh function (no loading state)
  const silentRefresh = useCallback(() => {
    return fetchEnhancedReleases(true, true)
  }, [fetchEnhancedReleases])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchEnhancedReleases,
    refresh,
    silentRefresh,
  }
}

/**
 * Remove duplicate articles based on URL, preferring RSS items for recent articles
 */
function deduplicateByUrl(items: EnhancedPressRelease[]): EnhancedPressRelease[] {
  const urlMap = new Map<string, EnhancedPressRelease>()
  
  for (const item of items) {
    const url = item.sourceUrl
    const existing = urlMap.get(url)
    
    if (!existing) {
      urlMap.set(url, item)
    } else {
      // Prefer RSS items for recent articles (last 7 days)
      const itemAge = Date.now() - new Date(item.publishedAt).getTime()
      const isRecent = itemAge < 7 * 24 * 60 * 60 * 1000 // 7 days
      
      if (isRecent && item.source === 'rss' && existing.source === 'database') {
        urlMap.set(url, item)
      }
    }
  }
  
  return Array.from(urlMap.values())
} 