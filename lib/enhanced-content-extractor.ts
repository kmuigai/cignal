/**
 * Enhanced Content Extractor
 * Handles content extraction from multiple news sources with intelligent fallbacks
 */

import { processHTMLContent } from './html-sanitizer'

interface ContentExtractionResult {
  success: boolean
  content: string
  htmlContent?: string
  textContent?: string
  extractedBy?: string
  confidence?: number
  error?: string
}

interface ExtractorConfig {
  timeout: number
  retries: number
  userAgent: string
  headers: Record<string, string>
}

const DEFAULT_CONFIG: ExtractorConfig = {
  timeout: 15000,
  retries: 2,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  }
}

// Source-specific content extractors
const CONTENT_EXTRACTORS = {
  'reuters.com': {
    name: 'Reuters',
    selectors: [
      '[data-module="ArticleBody"] [data-module="StandardArticleBody_body"]',
      '[data-testid="paragraph"]',
      '.StandardArticleBody_body',
      '.ArticleBodyWrapper',
      '.StandardArticleBody_container',
      'div[data-module="ArticleBody"]',
      '.PaywallBarrier-free-content',
      '.article-body',
      '.story-body',
    ],
    cleanupSelectors: [
      '.RelatedCoverage-container',
      '.Attribution-container',
      '.AdSlot-container',
      '.SocialEmbed-container',
      '.Slideshow-container',
      '.MediaPlayer-container',
      '.InlineVideo-container',
      '.trust-project-component',
      '.paywall-bar',
      '.related-coverage',
      '.social-share',
      '.advertisement',
      '.ad-container',
    ],
    confidence: 0.9
  },
  'prnewswire.com': {
    name: 'PR Newswire',
    selectors: [
      '.release-body',
      '.news-release-content',
      '.release-text',
      '.pr-body',
      '.content-body',
      '.press-release-content',
      '.release-content',
    ],
    cleanupSelectors: [
      '.social-share',
      '.related-releases',
      '.company-boilerplate',
      '.contact-info',
      '.footer-content',
      '.advertisement',
      '.ad-container',
    ],
    confidence: 0.85
  },
  'bloomberg.com': {
    name: 'Bloomberg',
    selectors: [
      '[data-module="BodyWrapper"]',
      '.body-content',
      '.story-body',
      '.article-content',
      '.paywall-banner',
    ],
    cleanupSelectors: [
      '.inline-newsletter',
      '.related-stories',
      '.social-icons',
      '.advertisement',
      '.ad-container',
    ],
    confidence: 0.88
  },
  'wsj.com': {
    name: 'Wall Street Journal',
    selectors: [
      '.wsj-article-body',
      '.articleLead-container',
      '.article-content',
      '.story-body',
    ],
    cleanupSelectors: [
      '.wsj-article-credit-tagline',
      '.related-coverage-module',
      '.social-share',
      '.advertisement',
      '.ad-container',
    ],
    confidence: 0.87
  },
  // Generic fallback for unknown sources
  'generic': {
    name: 'Generic',
    selectors: [
      'article',
      '.article-content',
      '.article-body',
      '.story-content',
      '.story-body',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main-content',
      '#main-content',
    ],
    cleanupSelectors: [
      'nav',
      'header',
      'footer',
      'aside',
      '.sidebar',
      '.navigation',
      '.social-share',
      '.related-articles',
      '.advertisement',
      '.ad-container',
      '.comments',
      '.comment-section',
    ],
    confidence: 0.6
  }
}

/**
 * Extract content from a URL with intelligent source detection
 */
export async function extractContentFromUrl(
  url: string, 
  config: Partial<ExtractorConfig> = {}
): Promise<ContentExtractionResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  console.log(`🔍 Extracting content from: ${url}`)

  // Detect source and get appropriate extractor
  const source = detectNewsSource(url)
  const extractor = CONTENT_EXTRACTORS[source] || CONTENT_EXTRACTORS.generic
  
  console.log(`📰 Detected source: ${extractor.name} (${source})`)

  try {
    // Fetch HTML with retries
    const html = await fetchHtmlWithRetries(url, finalConfig)
    
    if (!html || html.trim().length === 0) {
      throw new Error('Empty HTML response')
    }

    // Try source-specific extraction first
    let extractionResult = await trySourceSpecificExtraction(html, extractor, source)
    
    // If source-specific extraction fails, try generic extraction
    if (!extractionResult.success && source !== 'generic') {
      console.log(`⚠️ Source-specific extraction failed, trying generic...`)
      extractionResult = await trySourceSpecificExtraction(html, CONTENT_EXTRACTORS.generic, 'generic')
    }

    // If all else fails, try fallback patterns
    if (!extractionResult.success) {
      console.log(`⚠️ Generic extraction failed, trying fallback patterns...`)
      extractionResult = await tryFallbackExtraction(html)
    }

    if (extractionResult.success) {
      console.log(`✅ Content extracted successfully (${extractionResult.extractedBy}, confidence: ${extractionResult.confidence})`)
      console.log(`📊 Content length: ${extractionResult.content.length} chars`)
    }

    return extractionResult

  } catch (error) {
    console.error(`❌ Content extraction failed:`, error)
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Fetch HTML with retry logic and proper error handling
 */
async function fetchHtmlWithRetries(url: string, config: ExtractorConfig): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      console.log(`📡 Fetching HTML (attempt ${attempt}/${config.retries})...`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': config.userAgent,
          ...config.headers,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        throw new Error(`Expected HTML, got: ${contentType}`)
      }

      return await response.text()

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown fetch error')
      console.warn(`⚠️ Fetch attempt ${attempt} failed:`, lastError.message)
      
      // Wait before retry (exponential backoff)
      if (attempt < config.retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('All fetch attempts failed')
}

/**
 * Try source-specific content extraction
 */
async function trySourceSpecificExtraction(
  html: string, 
  extractor: typeof CONTENT_EXTRACTORS.generic,
  source: string
): Promise<ContentExtractionResult> {
  try {
    // Clean up unwanted elements first
    let cleanedHtml = html
    for (const selector of extractor.cleanupSelectors) {
      cleanedHtml = removeElementsBySelector(cleanedHtml, selector)
    }

    // Try each selector in order of preference
    for (const selector of extractor.selectors) {
      const extractedContent = extractContentBySelector(cleanedHtml, selector)
      
      if (extractedContent && validateContentQuality(extractedContent)) {
        // Process the extracted HTML content
        const { sanitizedHTML, textContent, isValid } = processHTMLContent(extractedContent, true)
        
        if (isValid && (sanitizedHTML || textContent)) {
          return {
            success: true,
            content: sanitizedHTML || textContent,
            htmlContent: sanitizedHTML,
            textContent: textContent,
            extractedBy: `${extractor.name} (${selector})`,
            confidence: extractor.confidence
          }
        }
      }
    }

    return {
      success: false,
      content: '',
      error: `No content found with ${extractor.name} selectors`
    }

  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Extraction error'
    }
  }
}

/**
 * Try fallback extraction patterns when source-specific extraction fails
 */
async function tryFallbackExtraction(html: string): Promise<ContentExtractionResult> {
  try {
    // Look for common article patterns
    const fallbackPatterns = [
      // Look for substantial paragraph content
      /<div[^>]*>([^<]*<p[^>]*>[^<]{100,}[\s\S]*?)<\/div>/gi,
      
      // Look for content with article-like structure
      /<section[^>]*>([\s\S]*?)<\/section>/gi,
      
      // Look for main content areas
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      
      // Look for content between common press release markers
      /(?:NEW YORK|LONDON|SAN FRANCISCO|CHICAGO|LOS ANGELES|BOSTON|WASHINGTON)[^<]*?--[^<]*?--([\s\S]*?)(?:<\/section|<\/div|$)/gi,
    ]

    for (const pattern of fallbackPatterns) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        const content = matches.join('')
        
        if (validateContentQuality(content)) {
          const { sanitizedHTML, textContent, isValid } = processHTMLContent(content, true)
          
          if (isValid && (sanitizedHTML || textContent)) {
            return {
              success: true,
              content: sanitizedHTML || textContent,
              htmlContent: sanitizedHTML,
              textContent: textContent,
              extractedBy: 'Fallback patterns',
              confidence: 0.4
            }
          }
        }
      }
    }

    return {
      success: false,
      content: '',
      error: 'No content found with fallback patterns'
    }

  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Fallback extraction error'
    }
  }
}

/**
 * Detect news source from URL
 */
function detectNewsSource(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    
    // Remove www. prefix
    const cleanHostname = hostname.replace(/^www\./, '')
    
    // Check for exact matches first
    if (CONTENT_EXTRACTORS[cleanHostname]) {
      return cleanHostname
    }
    
    // Check for partial matches (e.g., subdomain.reuters.com)
    for (const source in CONTENT_EXTRACTORS) {
      if (source !== 'generic' && cleanHostname.includes(source)) {
        return source
      }
    }
    
    return 'generic'
  } catch {
    return 'generic'
  }
}

/**
 * Extract content using CSS selector (regex-based for server-side)
 */
function extractContentBySelector(html: string, selector: string): string | null {
  try {
    let pattern: RegExp

    if (selector.startsWith('[') && selector.includes('=')) {
      // Attribute selector like [data-module="ArticleBody"]
      const attrMatch = selector.match(/\[([^=]+)="([^"]+)"\]/)
      if (attrMatch) {
        const [, attr, value] = attrMatch
        pattern = new RegExp(`<[^>]*${attr}="[^"]*${value}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi')
      } else {
        return null
      }
    } else if (selector.startsWith('.')) {
      // Class selector
      const className = selector.substring(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`<[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi')
    } else if (selector.startsWith('#')) {
      // ID selector
      const id = selector.substring(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`<[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi')
    } else {
      // Tag selector
      const tag = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
    }

    const match = pattern.exec(html)
    return match ? match[1].trim() : null

  } catch (error) {
    console.error(`Error extracting with selector ${selector}:`, error)
    return null
  }
}

/**
 * Remove elements by selector from HTML
 */
function removeElementsBySelector(html: string, selector: string): string {
  try {
    let pattern: RegExp

    if (selector.startsWith('.')) {
      // Class selector
      const className = selector.substring(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`<[^>]*class="[^"]*${className}[^"]*"[^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi')
    } else if (selector.startsWith('#')) {
      // ID selector
      const id = selector.substring(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`<[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/[^>]+>`, 'gi')
    } else {
      // Tag selector
      const tag = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi')
    }

    return html.replace(pattern, '')

  } catch (error) {
    console.error(`Error removing selector ${selector}:`, error)
    return html
  }
}

/**
 * Validate extracted content quality
 */
function validateContentQuality(content: string): boolean {
  if (!content || content.trim().length < 100) {
    return false
  }

  // Extract text for analysis
  const textContent = content.replace(/<[^>]*>/g, '').trim()
  const words = textContent.split(/\s+/)
  
  // Minimum word count
  if (words.length < 30) {
    return false
  }

  // Check for reasonable sentence structure
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length < 3) {
    return false
  }

  // Check for unwanted patterns
  const unwantedPatterns = [
    /^(share|follow|subscribe|contact|advertisement)/i,
    /^(home|news|previous|next)/i,
    /^(learn more|visit us|for more)/i,
    /javascript.*required/i,
    /enable.*javascript/i,
  ]

  for (const pattern of unwantedPatterns) {
    if (pattern.test(textContent)) {
      return false
    }
  }

  return true
}

/**
 * Get supported news sources
 */
export function getSupportedSources(): string[] {
  return Object.keys(CONTENT_EXTRACTORS).filter(source => source !== 'generic')
}

/**
 * Check if a URL is from a supported news source
 */
export function isSupportedSource(url: string): boolean {
  const source = detectNewsSource(url)
  return source !== 'generic'
} 