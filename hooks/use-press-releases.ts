"use client"

import { useState, useEffect, useCallback } from "react"
import type { Company } from "@/lib/types"
import { pressReleasesCache, generateCompaniesKey } from "@/lib/cache"

interface RSSItem {
  title: string
  description: string
  pubDate: string
  link: string
  companyMentions: string[]
  matchedCompany?: string
}

interface RSSResponse {
  items: RSSItem[]
  fetchedAt: string
  totalItems: number
  filteredItems: number
  userCompanies: string[]
}

export function usePressReleases(companies: Company[]) {
  const [data, setData] = useState<RSSResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const companiesKey = generateCompaniesKey(companies.map((c) => ({ name: c.name, variations: c.variations })))

  const fetchReleases = useCallback(
    async (forceRefresh = false) => {
      if (companies.length === 0) {
        setData({ items: [], fetchedAt: new Date().toISOString(), totalItems: 0, filteredItems: 0, userCompanies: [] })
        setLoading(false)
        setLastUpdated(Date.now())
        return
      }

      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const cachedData = pressReleasesCache.get(companiesKey)
        if (cachedData) {
          console.log("📦 Using cached press releases data")
          setData(cachedData)
          setLoading(false)
          setError(null)
          const cacheTimestamp = pressReleasesCache.getTimestamp(companiesKey)
          setLastUpdated(cacheTimestamp)
          return
        }
      }

      setLoading(true)
      setError(null)

      try {
        console.log("🌐 Fetching fresh press releases data")

        // Prepare companies data for API
        const companiesData = companies.map((company) => ({
          name: company.name,
          variations: company.variations,
        }))

        const companiesParam = encodeURIComponent(JSON.stringify(companiesData))
        const response = await fetch(`/api/fetch-releases?companies=${companiesParam}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const result = await response.json()

        // Cache the result
        pressReleasesCache.set(companiesKey, result)
        const cacheTimestamp = pressReleasesCache.getTimestamp(companiesKey)

        setData(result)
        setLastUpdated(cacheTimestamp)
        console.log("✅ Press releases data fetched and cached")
      } catch (err) {
        console.error("Error fetching press releases:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch press releases")
      } finally {
        setLoading(false)
      }
    },
    [companies, companiesKey],
  )

  // Initial fetch
  useEffect(() => {
    fetchReleases()
  }, [fetchReleases])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchReleases(true)
  }, [fetchReleases])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: fetchReleases,
    refresh,
  }
}
