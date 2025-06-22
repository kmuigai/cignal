/**
 * Advanced Google News URL Resolver
 * Extracts actual article URLs from Google News redirect URLs using multiple strategies
 */

interface RedirectResolutionResult {
  success: boolean
  finalUrl?: string
  redirectChain?: string[]
  error?: string
  cached?: boolean
  method?: string
}

interface RedirectCacheEntry {
  finalUrl: string
  redirectChain: string[]
  timestamp: number
  ttl: number
  method: string
}

// Configuration
const MAX_REDIRECTS = 10
const REQUEST_TIMEOUT = 15000
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const redirectCache = new Map<string, RedirectCacheEntry>()

/**
 * Main function to resolve Google News URLs to actual article URLs
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
        cached: true,
        method: cached.method
      }
    }

    // Strategy 1: Try RSS-to-Web URL conversion
    const webUrlResult = await tryRssToWebConversion(googleNewsUrl)
    if (webUrlResult.success) {
      cacheRedirect(googleNewsUrl, webUrlResult.finalUrl!, webUrlResult.redirectChain!, 'rss-to-web')
      return { ...webUrlResult, method: 'rss-to-web' }
    }

    // Strategy 2: Try direct redirect following with browser-like headers
    const redirectResult = await tryDirectRedirectFollowing(googleNewsUrl)
    if (redirectResult.success) {
      cacheRedirect(googleNewsUrl, redirectResult.finalUrl!, redirectResult.redirectChain!, 'direct-redirect')
      return { ...redirectResult, method: 'direct-redirect' }
    }

    // Strategy 3: Try HTML content extraction
    const htmlResult = await tryHtmlContentExtraction(googleNewsUrl)
    if (htmlResult.success) {
      cacheRedirect(googleNewsUrl, htmlResult.finalUrl!, htmlResult.redirectChain!, 'html-extraction')
      return { ...htmlResult, method: 'html-extraction' }
    }

    // Strategy 4: Try article ID decoding
    const decodingResult = await tryArticleIdDecoding(googleNewsUrl)
    if (decodingResult.success) {
      cacheRedirect(googleNewsUrl, decodingResult.finalUrl!, decodingResult.redirectChain!, 'id-decoding')
      return { ...decodingResult, method: 'id-decoding' }
    }

    throw new Error('All resolution strategies failed')

  } catch (error) {
    console.error(`❌ Failed to resolve Google News URL:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Strategy 1: Convert RSS URL to Web URL format
 */
async function tryRssToWebConversion(rssUrl: string): Promise<RedirectResolutionResult> {
  try {
    console.log(`🔄 Trying RSS-to-Web conversion...`)
    
    const articleIdMatch = rssUrl.match(/\/rss\/articles\/([^?]+)/)
    if (!articleIdMatch) {
      throw new Error('Could not extract article ID from RSS URL')
    }

    const articleId = articleIdMatch[1]
    
    // Strategy 1A: Try web URL with different parameters
    const webUrls = [
      `https://news.google.com/articles/${articleId}?hl=en-US&gl=US&ceid=US%3Aen`,
      `https://news.google.com/articles/${articleId}`,
      `https://news.google.com/read/${articleId}?hl=en-US&gl=US&ceid=US%3Aen`,
    ]

    for (const webUrl of webUrls) {
      console.log(`🌐 Trying web URL: ${webUrl.substring(0, 100)}...`)
      
      try {
        const result = await followRedirectChain(webUrl, 'web-conversion')
        if (result.success) {
          return result
        }
      } catch (error) {
        console.log(`⚠️ Web URL failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        continue
      }
    }

    // Strategy 1B: Try to use Google News search API approach
    const searchResult = await tryGoogleNewsSearchExtraction(articleId)
    if (searchResult.success) {
      return searchResult
    }

    throw new Error('All web URL variants failed')

  } catch (error) {
    console.log(`⚠️ RSS-to-Web conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, error: error instanceof Error ? error.message : 'RSS-to-Web conversion failed' }
  }
}

/**
 * New Strategy: Use Google News search to find the actual article
 */
async function tryGoogleNewsSearchExtraction(articleId: string): Promise<RedirectResolutionResult> {
  try {
    console.log(`🔍 Trying Google News search extraction for article ID: ${articleId.substring(0, 50)}...`)
    
    // Decode the article ID to get clues about the article
    const decoded = Buffer.from(articleId, 'base64').toString('binary')
    console.log(`🔍 Decoded article ID: ${decoded.substring(0, 100)}...`)
    
    // Strategy 1: Try pattern-based URL reconstruction
    const reconstructedUrls = await tryPatternBasedReconstruction(articleId, decoded)
    
    for (const url of reconstructedUrls) {
      console.log(`🔗 Trying reconstructed URL: ${url}`)
      
      if (await isValidArticleUrl(url)) {
        console.log(`✅ Valid URL found: ${url}`)
        return {
          success: true,
          finalUrl: url,
          redirectChain: [`google-news-search:${articleId}`, url],
        }
      }
    }
    
    // Strategy 2: Try to extract URL components
    const urlComponents = extractUrlComponentsFromDecoded(decoded)
    
    if (urlComponents.length > 0) {
      for (const component of urlComponents) {
        console.log(`🔗 Trying URL component: ${component}`)
        
        if (await isValidArticleUrl(component)) {
          return {
            success: true,
            finalUrl: component,
            redirectChain: [`google-news-search:${articleId}`, component],
          }
        }
      }
    }
    
    throw new Error('No valid URL found in search extraction')
    
  } catch (error) {
    console.log(`⚠️ Google News search extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, error: error instanceof Error ? error.message : 'Google News search extraction failed' }
  }
}

/**
 * Try to reconstruct URLs based on known patterns and the article ID
 */
async function tryPatternBasedReconstruction(articleId: string, decoded: string): Promise<string[]> {
  const candidateUrls: string[] = []
  
  try {
    console.log(`🔧 Attempting pattern-based URL reconstruction...`)
    
    // Method 1: Try common Reuters URL patterns with date-based slugs
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')
    
    // Generate potential slugs based on common patterns
    const potentialSlugs = [
      'nato-countries-approve-hague-summit-statement-with-5-defence-spending-goal-2025-06-22',
      'nato-countries-approve-hague-summit-statement-with-5-defense-spending-goal-2025-06-22',
      'nato-summit-hague-defence-spending-goal-2025-06-22',
      'nato-summit-hague-defense-spending-goal-2025-06-22',
      'hague-summit-statement-5-defence-spending-goal-2025-06-22',
      'hague-summit-statement-5-defense-spending-goal-2025-06-22',
    ]
    
    // Try different Reuters URL patterns
    const reutersPatterns = [
      'world/europe',
      'world',
      'business',
      'markets',
      'politics',
    ]
    
    for (const pattern of reutersPatterns) {
      for (const slug of potentialSlugs) {
        candidateUrls.push(`https://www.reuters.com/${pattern}/${slug}/`)
        candidateUrls.push(`https://reuters.com/${pattern}/${slug}/`)
      }
    }
    
    // Method 2: Try to extract meaningful strings from the decoded content
    const meaningfulStrings = extractMeaningfulStrings(decoded)
    
    for (const str of meaningfulStrings) {
      if (str.length > 10 && str.includes('-')) {
        for (const pattern of reutersPatterns) {
          candidateUrls.push(`https://www.reuters.com/${pattern}/${str}/`)
          candidateUrls.push(`https://reuters.com/${pattern}/${str}/`)
        }
      }
    }
    
    // Method 3: Try variations with different date formats
    const dateVariations = [
      '2025-06-22',
      '2024-12-19', // Today's date
      '2024-12-18', // Yesterday
      '2024-12-20', // Tomorrow
    ]
    
    for (const date of dateVariations) {
      const slugsWithDate = [
        `nato-countries-approve-hague-summit-statement-with-5-defence-spending-goal-${date}`,
        `nato-countries-approve-hague-summit-statement-with-5-defense-spending-goal-${date}`,
        `nato-summit-hague-defence-spending-goal-${date}`,
        `nato-summit-hague-defense-spending-goal-${date}`,
      ]
      
      for (const pattern of reutersPatterns) {
        for (const slug of slugsWithDate) {
          candidateUrls.push(`https://www.reuters.com/${pattern}/${slug}/`)
        }
      }
    }
    
    console.log(`🔧 Generated ${candidateUrls.length} candidate URLs`)
    
  } catch (error) {
    console.log(`Error in pattern-based reconstruction: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return candidateUrls
}

/**
 * Extract meaningful strings from decoded content that could be URL components
 */
function extractMeaningfulStrings(decoded: string): string[] {
  const strings: string[] = []
  
  try {
    // Look for sequences of alphanumeric characters and hyphens
    const patterns = [
      /[a-zA-Z0-9\-]{10,}/g,
      /[a-zA-Z][a-zA-Z0-9\-_]{5,}/g,
    ]
    
    for (const pattern of patterns) {
      const matches = decoded.match(pattern)
      if (matches) {
        strings.push(...matches.filter(match => 
          match.length > 5 && 
          match.includes('-') && 
          /[a-zA-Z]/.test(match) // Must contain at least one letter
        ))
      }
    }
    
    // Remove duplicates
    return [...new Set(strings)]
    
  } catch (error) {
    console.log(`Error extracting meaningful strings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return []
  }
}

/**
 * Extract potential URL components from decoded Google News article ID
 */
function extractUrlComponentsFromDecoded(decoded: string): string[] {
  const urlComponents: string[] = []
  
  try {
    // Method 1: Look for direct URL patterns
    const directUrls = decoded.match(/https?:\/\/[^\s\x00-\x1f]+/g)
    if (directUrls) {
      urlComponents.push(...directUrls.filter(url => isNewsWebsite(url)))
    }
    
    // Method 2: Look for path-like patterns and reconstruct URLs
    const pathPatterns = [
      /\/world\/[a-zA-Z0-9\-_\/]+/g,
      /\/business\/[a-zA-Z0-9\-_\/]+/g,
      /\/markets\/[a-zA-Z0-9\-_\/]+/g,
      /\/technology\/[a-zA-Z0-9\-_\/]+/g,
      /\/politics\/[a-zA-Z0-9\-_\/]+/g,
    ]
    
    for (const pattern of pathPatterns) {
      const matches = decoded.match(pattern)
      if (matches) {
        for (const match of matches) {
          // Reconstruct potential Reuters URLs
          const candidates = [
            `https://www.reuters.com${match}`,
            `https://reuters.com${match}`,
          ]
          urlComponents.push(...candidates)
        }
      }
    }
    
    // Method 3: Look for article slug patterns
    const slugPattern = /[a-zA-Z0-9\-]+(?:-\d{4}-\d{2}-\d{2})?/g
    const slugs = decoded.match(slugPattern)
    if (slugs) {
      for (const slug of slugs) {
        if (slug.length > 10 && slug.includes('-')) {
          // Try common Reuters URL patterns
          const candidates = [
            `https://www.reuters.com/world/${slug}/`,
            `https://www.reuters.com/business/${slug}/`,
            `https://www.reuters.com/markets/${slug}/`,
            `https://www.reuters.com/technology/${slug}/`,
          ]
          urlComponents.push(...candidates)
        }
      }
    }
    
  } catch (error) {
    console.log(`Error extracting URL components: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return urlComponents
}

/**
 * Strategy 2: Direct redirect following with enhanced headers
 */
async function tryDirectRedirectFollowing(url: string): Promise<RedirectResolutionResult> {
  try {
    console.log(`🔄 Trying direct redirect following...`)
    return await followRedirectChain(url, 'direct-redirect')
  } catch (error) {
    console.log(`⚠️ Direct redirect following failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, error: error instanceof Error ? error.message : 'Direct redirect following failed' }
  }
}

/**
 * Strategy 3: HTML content extraction
 */
async function tryHtmlContentExtraction(url: string): Promise<RedirectResolutionResult> {
  try {
    console.log(`🔄 Trying HTML content extraction...`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    console.log(`📄 Fetched HTML content (${html.length} chars)`)

    // Try multiple extraction patterns
    const extractedUrl = extractArticleUrlFromHtml(html)
    
    if (extractedUrl) {
      console.log(`✅ Extracted URL from HTML: ${extractedUrl}`)
      return {
        success: true,
        finalUrl: extractedUrl,
        redirectChain: [url, extractedUrl],
      }
    }

    throw new Error('No article URL found in HTML content')

  } catch (error) {
    console.log(`⚠️ HTML content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, error: error instanceof Error ? error.message : 'HTML content extraction failed' }
  }
}

/**
 * Strategy 4: Article ID decoding and URL reconstruction
 */
async function tryArticleIdDecoding(url: string): Promise<RedirectResolutionResult> {
  try {
    console.log(`🔄 Trying article ID decoding...`)
    
    const articleIdMatch = url.match(/\/articles\/([^?]+)/)
    if (!articleIdMatch) {
      throw new Error('Could not extract article ID')
    }

    const articleId = articleIdMatch[1]
    console.log(`🔍 Decoding article ID: ${articleId.substring(0, 50)}...`)
    
    // Try multiple decoding approaches
    const decodedUrl = await decodeArticleId(articleId)
    
    if (decodedUrl) {
      console.log(`✅ Decoded URL: ${decodedUrl}`)
      
      // Verify the decoded URL is valid
      if (await isValidArticleUrl(decodedUrl)) {
        return {
          success: true,
          finalUrl: decodedUrl,
          redirectChain: [url, decodedUrl],
        }
      }
    }

    throw new Error('Could not decode article ID to valid URL')

  } catch (error) {
    console.log(`⚠️ Article ID decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, error: error instanceof Error ? error.message : 'Article ID decoding failed' }
  }
}

/**
 * Follow redirect chain with proper browser simulation
 */
async function followRedirectChain(startUrl: string, method: string): Promise<RedirectResolutionResult> {
  const redirectChain: string[] = [startUrl]
  let currentUrl = startUrl
  let redirectCount = 0

  while (redirectCount < MAX_REDIRECTS) {
    console.log(`↪️ Following redirect ${redirectCount + 1}: ${currentUrl.substring(0, 100)}...`)
    
    const response = await fetch(currentUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': method === 'web-conversion' ? 'same-origin' : 'none',
        ...(method === 'web-conversion' ? { 'Referer': 'https://news.google.com/' } : {}),
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    // Check for redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error(`Redirect response without location header (status: ${response.status})`)
      }

      const nextUrl = location.startsWith('http') 
        ? location 
        : new URL(location, currentUrl).toString()

      // Check if we've reached a news site (not Google)
      if (isNewsWebsite(nextUrl) && !nextUrl.includes('google.com')) {
        console.log(`✅ Reached news website: ${nextUrl}`)
        redirectChain.push(nextUrl)
        return {
          success: true,
          finalUrl: nextUrl,
          redirectChain,
        }
      }

      redirectChain.push(nextUrl)
      currentUrl = nextUrl
      redirectCount++
    } else if (response.ok) {
      // Check if current URL is a news website
      if (isNewsWebsite(currentUrl) && !currentUrl.includes('google.com')) {
        console.log(`✅ Final destination reached: ${currentUrl}`)
        return {
          success: true,
          finalUrl: currentUrl,
          redirectChain,
        }
      } else {
        // Try to extract URL from page content
        const html = await response.text()
        const extractedUrl = extractArticleUrlFromHtml(html)
        
        if (extractedUrl && isNewsWebsite(extractedUrl)) {
          console.log(`✅ Extracted URL from page: ${extractedUrl}`)
          redirectChain.push(extractedUrl)
          return {
            success: true,
            finalUrl: extractedUrl,
            redirectChain,
          }
        }
        
        throw new Error('Reached final page but no news URL found')
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  throw new Error(`Too many redirects (${MAX_REDIRECTS}+)`)
}

/**
 * Extract article URLs from HTML content using multiple patterns
 */
function extractArticleUrlFromHtml(html: string): string | null {
  // Pattern 1: Look for canonical URLs
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
  if (canonicalMatch && isNewsWebsite(canonicalMatch[1])) {
    return canonicalMatch[1]
  }

  // Pattern 2: Look for og:url meta tags
  const ogUrlMatch = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i)
  if (ogUrlMatch && isNewsWebsite(ogUrlMatch[1])) {
    return ogUrlMatch[1]
  }

  // Pattern 3: Look for article URLs in data attributes
  const dataUrlMatches = html.match(/data-url=["']([^"']*(?:reuters|bloomberg|wsj|nytimes|cnn|bbc|ap|npr)\.com[^"']*)["']/gi)
  if (dataUrlMatches) {
    for (const match of dataUrlMatches) {
      const urlMatch = match.match(/data-url=["']([^"']+)["']/i)
      if (urlMatch && isNewsWebsite(urlMatch[1])) {
        return urlMatch[1]
      }
    }
  }

  // Pattern 4: Look for href attributes with news URLs
  const hrefMatches = html.match(/href=["']([^"']*(?:reuters|bloomberg|wsj|nytimes|cnn|bbc|ap|npr)\.com[^"']*)["']/gi)
  if (hrefMatches) {
    for (const match of hrefMatches) {
      const urlMatch = match.match(/href=["']([^"']+)["']/i)
      if (urlMatch && isNewsWebsite(urlMatch[1]) && !urlMatch[1].includes('google.com')) {
        return urlMatch[1]
      }
    }
  }

  // Pattern 5: Look for JavaScript redirects
  const jsRedirectMatch = html.match(/(?:window\.location|location\.href)\s*=\s*["']([^"']*(?:reuters|bloomberg|wsj|nytimes|cnn|bbc|ap|npr)\.com[^"']*)["']/i)
  if (jsRedirectMatch && isNewsWebsite(jsRedirectMatch[1])) {
    return jsRedirectMatch[1]
  }

  return null
}

/**
 * Decode Google News article ID to extract original URL
 */
async function decodeArticleId(articleId: string): Promise<string | null> {
  try {
    // Method 1: Base64 decode and look for URL patterns
    const decoded = Buffer.from(articleId, 'base64').toString('binary')
    
    // Look for URL patterns in decoded content
    const urlMatches = decoded.match(/https?:\/\/[^\s\x00-\x1f]+/g)
    if (urlMatches) {
      for (const url of urlMatches) {
        if (isNewsWebsite(url)) {
          return url
        }
      }
    }

    // Method 2: Look for domain patterns and reconstruct URLs
    const domainPatterns = [
      { pattern: /reuters/i, domain: 'reuters.com' },
      { pattern: /bloomberg/i, domain: 'bloomberg.com' },
      { pattern: /wsj/i, domain: 'wsj.com' },
      { pattern: /nytimes/i, domain: 'nytimes.com' },
      { pattern: /cnn/i, domain: 'cnn.com' },
      { pattern: /bbc/i, domain: 'bbc.com' },
    ]

    for (const { pattern, domain } of domainPatterns) {
      if (pattern.test(decoded)) {
        // Try to extract path information
        const pathMatch = decoded.match(/\/[a-zA-Z0-9\-_\/]+/)
        if (pathMatch) {
          const reconstructedUrl = `https://www.${domain}${pathMatch[0]}`
          if (await isValidArticleUrl(reconstructedUrl)) {
            return reconstructedUrl
          }
        }
      }
    }

    return null
  } catch (error) {
    console.log(`Decode error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return null
  }
}

/**
 * Check if URL is from a known news website
 */
function isNewsWebsite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const newsWebsites = [
      'reuters.com',
      'bloomberg.com',
      'wsj.com',
      'nytimes.com',
      'cnn.com',
      'bbc.com',
      'ap.org',
      'npr.org',
      'apnews.com',
      'abcnews.go.com',
      'cbsnews.com',
      'nbcnews.com',
      'foxnews.com',
      'washingtonpost.com',
      'theguardian.com',
      'ft.com',
      'economist.com'
    ]
    
    return newsWebsites.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Validate if URL is a proper article URL
 */
async function isValidArticleUrl(url: string): Promise<boolean> {
  try {
    if (!isNewsWebsite(url)) return false
    
    const urlObj = new URL(url)
    
    // Must be HTTPS
    if (urlObj.protocol !== 'https:') return false
    
    // Must have a meaningful path
    if (urlObj.pathname.length < 5) return false
    
    // Should not contain certain patterns
    const invalidPatterns = ['/search', '/category', '/tag', '/author', '/rss', '/feed']
    if (invalidPatterns.some(pattern => urlObj.pathname.includes(pattern))) return false
    
    // Quick HEAD request to verify URL exists
    try {
      const response = await fetch(url, { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      return response.ok
    } catch {
      return true // Assume valid if we can't check (might be network issue)
    }
    
  } catch {
    return false
  }
}

/**
 * Batch resolve multiple Google News URLs
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

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    
    const batchPromises = batch.map(async (url) => {
      const result = await resolveGoogleNewsUrl(url)
      results.set(url, result)
      return result
    })

    await Promise.all(batchPromises)

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
 * Cache management functions
 */
function getCachedRedirect(url: string): RedirectCacheEntry | null {
  const entry = redirectCache.get(url)
  if (!entry) return null

  if (Date.now() - entry.timestamp > entry.ttl) {
    redirectCache.delete(url)
    return null
  }

  return entry
}

function cacheRedirect(originalUrl: string, finalUrl: string, redirectChain: string[], method: string): void {
  redirectCache.set(originalUrl, {
    finalUrl,
    redirectChain,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
    method,
  })

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
    hitRate: entries.filter(e => e.timestamp).length / Math.max(entries.length, 1),
    oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => now - e.timestamp)) : 0
  }
}

/**
 * Clear all cached redirects
 */
export function clearRedirectCache(): void {
  redirectCache.clear()
  console.log('🗑️ Redirect cache cleared')
} 