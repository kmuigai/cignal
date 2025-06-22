/**
 * Google News Link Resolver
 * Handles resolving Google News redirect URLs to actual article URLs
 */

interface RedirectResolutionResult {
  success: boolean
  finalUrl?: string
  redirectChain?: string[]
  error?: string
  cached?: boolean
}

interface RedirectCacheEntry {
  finalUrl: string
  redirectChain: string[]
  timestamp: number
  ttl: number // Time to live in milliseconds
}

// In-memory cache for resolved URLs (in production, consider Redis)
const redirectCache = new Map<string, RedirectCacheEntry>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const MAX_REDIRECTS = 10
const REQUEST_TIMEOUT = 15000 // 15 seconds

/**
 * Resolve Google News redirect URL to final article URL
 */
export async function resolveGoogleNewsUrl(googleNewsUrl: string): Promise<RedirectResolutionResult> {
  try {
    console.log(`🔍 Resolving Google News URL: ${googleNewsUrl.substring(0, 100)}...`)

    // Check cache first
    const cached = getCachedRedirect(googleNewsUrl)
    if (cached) {
      console.log(`📦 Using cached redirect: ${cached.finalUrl}`)
      return {
        success: true,
        finalUrl: cached.finalUrl,
        redirectChain: cached.redirectChain,
        cached: true
      }
    }

    // Follow redirect chain manually for better control
    const redirectChain: string[] = [googleNewsUrl]
    let currentUrl = googleNewsUrl
    let redirectCount = 0

    while (redirectCount < MAX_REDIRECTS) {
      const response = await fetch(currentUrl, {
        method: 'HEAD', // Use HEAD to avoid downloading full content
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'manual', // Handle redirects manually
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      })

      // Check if this is a redirect
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          throw new Error(`Redirect response without location header (status: ${response.status})`)
        }

        // Handle relative URLs
        const nextUrl = location.startsWith('http') 
          ? location 
          : new URL(location, currentUrl).toString()

        redirectChain.push(nextUrl)
        currentUrl = nextUrl
        redirectCount++

        console.log(`↪️ Redirect ${redirectCount}: ${nextUrl.substring(0, 100)}...`)
      } else if (response.ok) {
        // Successfully reached final destination
        console.log(`✅ Resolved to: ${currentUrl}`)
        
        // Cache the result
        cacheRedirect(googleNewsUrl, currentUrl, redirectChain)
        
        return {
          success: true,
          finalUrl: currentUrl,
          redirectChain,
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    }

    throw new Error(`Too many redirects (${MAX_REDIRECTS}+)`)

  } catch (error) {
    console.error(`❌ Failed to resolve Google News URL:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch resolve multiple Google News URLs with rate limiting
 */
export async function batchResolveGoogleNewsUrls(
  urls: string[], 
  options: { 
    concurrency?: number
    delayMs?: number 
  } = {}
): Promise<Map<string, RedirectResolutionResult>> {
  const { concurrency = 3, delayMs = 1000 } = options
  const results = new Map<string, RedirectResolutionResult>()
  
  console.log(`🔄 Batch resolving ${urls.length} Google News URLs (concurrency: ${concurrency})`)

  // Process URLs in batches to avoid overwhelming servers
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    
    // Process current batch in parallel
    const batchPromises = batch.map(async (url) => {
      const result = await resolveGoogleNewsUrl(url)
      results.set(url, result)
      return result
    })

    await Promise.all(batchPromises)

    // Add delay between batches (except for the last batch)
    if (i + concurrency < urls.length) {
      console.log(`⏳ Waiting ${delayMs}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  const successCount = Array.from(results.values()).filter(r => r.success).length
  console.log(`✅ Batch resolution complete: ${successCount}/${urls.length} successful`)

  return results
}

/**
 * Check if URL is a Google News redirect
 */
export function isGoogleNewsUrl(url: string): boolean {
  return url.includes('news.google.com/rss/articles/') || 
         url.includes('news.google.com/articles/')
}

/**
 * Extract potential source domain from Google News URL
 * This is a heuristic approach - not always accurate
 */
export function extractSourceHintFromGoogleNewsUrl(url: string): string | null {
  try {
    // Look for site parameter in the original RSS search URL
    const urlObj = new URL(url)
    const searchParams = urlObj.searchParams
    
    // Check for site: parameter in q parameter
    const query = searchParams.get('q')
    if (query) {
      const siteMatch = query.match(/site:([^\s&]+)/)
      if (siteMatch) {
        return siteMatch[1]
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Cache management functions
 */
function getCachedRedirect(url: string): RedirectCacheEntry | null {
  const entry = redirectCache.get(url)
  if (!entry) return null

  // Check if cache entry has expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    redirectCache.delete(url)
    return null
  }

  return entry
}

function cacheRedirect(originalUrl: string, finalUrl: string, redirectChain: string[]): void {
  redirectCache.set(originalUrl, {
    finalUrl,
    redirectChain,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  })

  // Clean up old cache entries periodically
  if (redirectCache.size > 1000) {
    cleanupCache()
  }
}

function cleanupCache(): void {
  const now = Date.now()
  let cleanedCount = 0

  for (const [url, entry] of redirectCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      redirectCache.delete(url)
      cleanedCount++
    }
  }

  console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`)
}

/**
 * Get cache statistics
 */
export function getRedirectCacheStats(): {
  size: number
  hitRate: number
  oldestEntry: number
} {
  const entries = Array.from(redirectCache.values())
  const now = Date.now()
  
  return {
    size: redirectCache.size,
    hitRate: 0, // TODO: Implement hit rate tracking
    oldestEntry: entries.length > 0 
      ? Math.min(...entries.map(e => now - e.timestamp)) 
      : 0
  }
}

/**
 * Clear all cached redirects (useful for testing)
 */
export function clearRedirectCache(): void {
  redirectCache.clear()
  console.log('🗑️ Redirect cache cleared')
} 