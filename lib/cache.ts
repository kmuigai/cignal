interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface CacheOptions {
  ttlMinutes?: number
}

class CacheManager {
  private readonly CACHE_PREFIX = "cignal-cache-"
  private readonly DEFAULT_TTL_MINUTES = 15

  /**
   * Get cached data if it exists and is still valid
   */
  getCached<T>(key: string): T | null {
    try {
      const cacheKey = this.CACHE_PREFIX + key
      const cached = localStorage.getItem(cacheKey)

      if (!cached) {
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)

      // Check if cache is still valid
      if (Date.now() > entry.expiresAt) {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey)
        return null
      }

      return entry.data
    } catch (error) {
      console.error("Error reading from cache:", error)
      return null
    }
  }

  /**
   * Store data in cache with TTL
   */
  setCached<T>(key: string, data: T, options: CacheOptions = {}): void {
    try {
      const ttlMinutes = options.ttlMinutes || this.DEFAULT_TTL_MINUTES
      const now = Date.now()
      const expiresAt = now + ttlMinutes * 60 * 1000

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        expiresAt,
      }

      const cacheKey = this.CACHE_PREFIX + key
      localStorage.setItem(cacheKey, JSON.stringify(entry))
    } catch (error) {
      console.error("Error writing to cache:", error)
    }
  }

  /**
   * Check if cache is valid for a given key
   */
  isCacheValid(key: string): boolean {
    try {
      const cacheKey = this.CACHE_PREFIX + key
      const cached = localStorage.getItem(cacheKey)

      if (!cached) {
        return false
      }

      const entry: CacheEntry<any> = JSON.parse(cached)
      return Date.now() <= entry.expiresAt
    } catch (error) {
      console.error("Error checking cache validity:", error)
      return false
    }
  }

  /**
   * Get cache timestamp for display purposes
   */
  getCacheTimestamp(key: string): number | null {
    try {
      const cacheKey = this.CACHE_PREFIX + key
      const cached = localStorage.getItem(cacheKey)

      if (!cached) {
        return null
      }

      const entry: CacheEntry<any> = JSON.parse(cached)
      return entry.timestamp
    } catch (error) {
      console.error("Error getting cache timestamp:", error)
      return null
    }
  }

  /**
   * Clear specific cache entry
   */
  clearCache(key: string): void {
    try {
      const cacheKey = this.CACHE_PREFIX + key
      localStorage.removeItem(cacheKey)
    } catch (error) {
      console.error("Error clearing cache:", error)
    }
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error("Error clearing all cache:", error)
    }
  }

  /**
   * Get cache size information
   */
  getCacheInfo(): { totalEntries: number; totalSize: number } {
    let totalEntries = 0
    let totalSize = 0

    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          totalEntries++
          const value = localStorage.getItem(key)
          if (value) {
            totalSize += value.length
          }
        }
      })
    } catch (error) {
      console.error("Error getting cache info:", error)
    }

    return { totalEntries, totalSize }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()

// Utility functions for specific data types
export const pressReleasesCache = {
  get: (companiesKey: string) => cacheManager.getCached(`press-releases-${companiesKey}`),
  set: (companiesKey: string, data: any) => cacheManager.setCached(`press-releases-${companiesKey}`, data),
  isValid: (companiesKey: string) => cacheManager.isCacheValid(`press-releases-${companiesKey}`),
  getTimestamp: (companiesKey: string) => cacheManager.getCacheTimestamp(`press-releases-${companiesKey}`),
  clear: (companiesKey: string) => cacheManager.clearCache(`press-releases-${companiesKey}`),
}

// Helper to generate cache key from companies
export function generateCompaniesKey(companies: Array<{ name: string; variations: string[] }>): string {
  return companies
    .map((c) => `${c.name}-${c.variations.join(",")}`)
    .sort()
    .join("|")
}
