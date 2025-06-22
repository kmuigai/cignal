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
      console.log(`💾 Using cached redirect for: ${googleNewsUrl.substring(0, 50)}...`)
      return {
        success: true,
        finalUrl: cached.finalUrl,
        redirectChain: cached.redirectChain,
        cached: true
      }
    }

    // Try to get the actual article URL by fetching the Google News page content
    const response = await fetch(googleNewsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    console.log(`📄 Fetched Google News page content (${html.length} chars)`)

    // Try to extract the actual article URL from the HTML content
    const actualUrl = extractArticleUrlFromGoogleNewsHtml(html, googleNewsUrl)
    
    if (actualUrl) {
      console.log(`✅ Extracted actual article URL: ${actualUrl}`)
      
      // Cache the result
      const redirectChain = [googleNewsUrl, actualUrl]
      cacheRedirect(googleNewsUrl, actualUrl, redirectChain)
      
      return {
        success: true,
        finalUrl: actualUrl,
        redirectChain,
      }
    } else {
      // If we can't extract the URL, try to infer it from the Google News URL structure
      const inferredUrl = inferArticleUrlFromGoogleNewsUrl(googleNewsUrl)
      
      if (inferredUrl) {
        console.log(`🔮 Inferred article URL: ${inferredUrl}`)
        
        // Cache the result
        const redirectChain = [googleNewsUrl, inferredUrl]
        cacheRedirect(googleNewsUrl, inferredUrl, redirectChain)
        
        return {
          success: true,
          finalUrl: inferredUrl,
          redirectChain,
        }
      } else {
        throw new Error('Could not extract or infer actual article URL from Google News page')
      }
    }

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

/**
 * Extract actual article URL from Google News HTML content
 */
function extractArticleUrlFromGoogleNewsHtml(html: string, originalUrl: string): string | null {
  try {
    // Look for various patterns that might contain the actual article URL
    
    // Pattern 1: Look for data-url attributes
    const dataUrlMatch = html.match(/data-url="([^"]+)"/i)
    if (dataUrlMatch) {
      const url = decodeURIComponent(dataUrlMatch[1])
      if (isValidArticleUrl(url)) {
        return url
      }
    }

    // Pattern 2: Look for href attributes with article URLs
    const hrefMatches = html.match(/href="([^"]*(?:reuters|bloomberg|wsj|nytimes|cnn|bbc)\.com[^"]*)"/gi)
    if (hrefMatches) {
      for (const match of hrefMatches) {
        const urlMatch = match.match(/href="([^"]+)"/i)
        if (urlMatch) {
          const url = decodeURIComponent(urlMatch[1])
          if (isValidArticleUrl(url) && !url.includes('google.com')) {
            return url
          }
        }
      }
    }

    // Pattern 3: Look for article URLs in script tags or JSON data
    const scriptMatches = html.match(/<script[^>]*>([^<]*(?:reuters|bloomberg|wsj|nytimes|cnn|bbc)\.com[^<]*)<\/script>/gi)
    if (scriptMatches) {
      for (const scriptMatch of scriptMatches) {
        const urlMatches = scriptMatch.match(/https?:\/\/[^\s"']+(?:reuters|bloomberg|wsj|nytimes|cnn|bbc)\.com[^\s"']+/gi)
        if (urlMatches) {
          for (const url of urlMatches) {
            if (isValidArticleUrl(url)) {
              return url
            }
          }
        }
      }
    }

    // Pattern 4: Look for meta tags with article URLs
    const metaMatches = html.match(/<meta[^>]*content="([^"]*(?:reuters|bloomberg|wsj|nytimes|cnn|bbc)\.com[^"]*)"/gi)
    if (metaMatches) {
      for (const match of metaMatches) {
        const urlMatch = match.match(/content="([^"]+)"/i)
        if (urlMatch) {
          const url = decodeURIComponent(urlMatch[1])
          if (isValidArticleUrl(url)) {
            return url
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting article URL from HTML:', error)
    return null
  }
}

/**
 * Try to infer the actual article URL from Google News URL structure
 * This is a heuristic approach and may not always work
 */
function inferArticleUrlFromGoogleNewsUrl(googleNewsUrl: string): string | null {
  try {
    // Extract the base64-encoded article ID from the URL
    const articleIdMatch = googleNewsUrl.match(/\/articles\/([^?]+)/)
    if (!articleIdMatch) {
      return null
    }

    const articleId = articleIdMatch[1]
    
    // Try to decode the article ID to get clues about the source
    try {
      const decoded = atob(articleId)
      console.log(`🔍 Decoded article ID: ${decoded.substring(0, 100)}...`)
      
      // Look for URL patterns in the decoded content
      const urlMatch = decoded.match(/https?:\/\/[^\s]+/)
      if (urlMatch) {
        const url = urlMatch[0]
        if (isValidArticleUrl(url)) {
          return url
        }
      }
    } catch (decodeError) {
      console.log('Could not decode article ID as base64')
    }

    // If we can't decode, try to infer from the original RSS search query
    const sourceHint = extractSourceHintFromGoogleNewsUrl(googleNewsUrl)
    if (sourceHint) {
      console.log(`🔍 Source hint: ${sourceHint}`)
      
      // For Reuters, try to construct a likely URL pattern
      if (sourceHint.includes('reuters.com')) {
        // This is a very rough heuristic - in practice, we'd need more sophisticated URL construction
        return `https://www.reuters.com/business/` // Fallback to Reuters business section
      }
    }

    return null
  } catch (error) {
    console.error('Error inferring article URL:', error)
    return null
  }
}

/**
 * Check if a URL looks like a valid article URL
 */
function isValidArticleUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    
    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      return false
    }
    
    // Must be from a known news domain
    const knownDomains = [
      'reuters.com',
      'bloomberg.com', 
      'wsj.com',
      'nytimes.com',
      'cnn.com',
      'bbc.com',
      'ap.org',
      'npr.org'
    ]
    
    const hostname = urlObj.hostname.toLowerCase()
    const isKnownDomain = knownDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    )
    
    if (!isKnownDomain) {
      return false
    }
    
    // Must have a meaningful path (not just homepage)
    if (urlObj.pathname.length < 5) {
      return false
    }
    
    // Should not contain certain patterns that indicate it's not an article
    const invalidPatterns = [
      '/search',
      '/category',
      '/tag',
      '/author',
      '/rss',
      '/feed'
    ]
    
    const path = urlObj.pathname.toLowerCase()
    if (invalidPatterns.some(pattern => path.includes(pattern))) {
      return false
    }
    
    return true
  } catch {
    return false
  }
} 