import type { RSSValidationResult, RSSSource } from './types'

/**
 * RSS Feed Validation Utilities
 * Provides validation, testing, and type detection for RSS feeds
 */

// Common RSS feed URL patterns for auto-detection
const RSS_PATTERNS = {
  'ir-news': [
    /investor[s]?\..*\/rss/i,
    /ir\..*\/rss/i,
    /newsroom\..*\/rss/i,
    /press\..*\/rss/i,
    /news\..*\/rss/i,
  ],
  'sec-filings': [
    /sec\.gov.*edgar/i,
    /edgar/i,
    /filings/i,
  ],
  'general-news': [
    /yahoo.*finance/i,
    /reuters/i,
    /bloomberg/i,
    /marketwatch/i,
    /cnbc/i,
  ],
  'industry': [
    /fintech/i,
    /finance/i,
    /banking/i,
    /payments/i,
  ],
} as const

/**
 * Validates RSS URL format and structure
 */
export function validateRSSUrl(url: string): { valid: boolean; error?: string } {
  // Basic URL format validation
  try {
    const parsedUrl = new URL(url)
    
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' }
    }
    
    // Check for common RSS extensions or paths
    const pathname = parsedUrl.pathname.toLowerCase()
    const hasRssExtension = pathname.includes('rss') || 
                           pathname.includes('xml') || 
                           pathname.includes('feed') ||
                           pathname.includes('atom')
    
    if (!hasRssExtension && !parsedUrl.searchParams.has('format')) {
      console.warn('URL may not be an RSS feed (no RSS indicators found)')
    }
    
    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Detects the most likely RSS feed type based on URL patterns
 */
export function detectRSSFeedType(url: string): RSSSource['feedType'] {
  const lowerUrl = url.toLowerCase()
  
  // Check each pattern category
  for (const [type, patterns] of Object.entries(RSS_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerUrl)) {
        return type as RSSSource['feedType']
      }
    }
  }
  
  return 'custom' // Default fallback
}

/**
 * Suggests a feed name based on the URL
 */
export function suggestFeedName(url: string, title?: string): string {
  if (title) {
    return title.replace(/RSS|Feed|News/gi, '').trim() || extractDomainName(url)
  }
  
  return extractDomainName(url)
}

/**
 * Extracts a clean domain name from URL for feed naming
 */
function extractDomainName(url: string): string {
  try {
    const domain = new URL(url).hostname
    // Remove www. prefix and convert to title case
    return domain
      .replace(/^www\./, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  } catch {
    return 'Custom Feed'
  }
}

/**
 * Tests RSS feed connectivity and parses basic info
 * This is a client-side validation - for full testing, use the API endpoint
 */
export async function testRSSConnectivity(
  url: string,
  timeout = 10000
): Promise<RSSValidationResult> {
  // First validate the URL format
  const urlValidation = validateRSSUrl(url)
  if (!urlValidation.valid) {
    return {
      valid: false,
      error: urlValidation.error
    }
  }
  
  try {
    // Use fetch with timeout and CORS handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      mode: 'no-cors', // Handle CORS issues for client-side validation
    })
    
    clearTimeout(timeoutId)
    
    // For no-cors mode, we can't read the response but can check if it loaded
    if (response.type === 'opaque') {
      // Request succeeded but we can't read content due to CORS
      return {
        valid: true,
        title: suggestFeedName(url),
        detectedType: detectRSSFeedType(url),
        error: 'Feed accessible but content validation requires server-side testing'
      }
    }
    
    if (!response.ok) {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    // Try to parse the response if we can read it
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('xml') && !contentType.includes('rss')) {
      console.warn('Response may not be XML/RSS format:', contentType)
    }
    
    const text = await response.text()
    const itemCount = (text.match(/<item[\s>]/g) || []).length +
                     (text.match(/<entry[\s>]/g) || []).length
    
    // Extract title if possible
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : undefined
    
    return {
      valid: true,
      title: suggestFeedName(url, title),
      description: `Found ${itemCount} items`,
      itemCount,
      detectedType: detectRSSFeedType(url)
    }
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { valid: false, error: 'Request timeout' }
      }
      return { valid: false, error: error.message }
    }
    return { valid: false, error: 'Unknown error testing feed' }
  }
}

/**
 * Validates RSS source data before saving
 */
export function validateRSSSourceData(data: {
  feedUrl: string
  feedName: string
  feedType: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validate URL
  const urlValidation = validateRSSUrl(data.feedUrl)
  if (!urlValidation.valid) {
    errors.push(urlValidation.error || 'Invalid URL')
  }
  
  // Validate name
  if (!data.feedName?.trim()) {
    errors.push('Feed name is required')
  } else if (data.feedName.trim().length < 2) {
    errors.push('Feed name must be at least 2 characters')
  }
  
  // Validate type
  const validTypes = ['ir-news', 'sec-filings', 'general-news', 'industry', 'custom']
  if (!validTypes.includes(data.feedType)) {
    errors.push('Invalid feed type')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Common RSS feed templates for quick setup
 */
export const RSS_FEED_TEMPLATES = {
  'Yahoo Finance': {
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
    type: 'general-news' as const,
    description: 'General financial news headlines'
  },
  'Reuters Business': {
    url: 'https://feeds.reuters.com/reuters/businessNews',
    type: 'general-news' as const,
    description: 'Reuters business news feed'
  },
  'MarketWatch': {
    url: 'https://feeds.marketwatch.com/marketwatch/topstories',
    type: 'general-news' as const,
    description: 'MarketWatch top business stories'
  },
  'SEC EDGAR (All)': {
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&output=atom',
    type: 'sec-filings' as const,
    description: 'Latest SEC filings for all companies'
  },
} as const

export type RSSFeedTemplate = keyof typeof RSS_FEED_TEMPLATES