import * as DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Create a DOM environment for server-side usage
const window = new JSDOM('').window
const DOMPurifyServer = DOMPurify.default ? DOMPurify.default(window as any) : (DOMPurify as any)(window as any)

// Configuration for HTML sanitization
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'br', 'b', 'i'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOW_DATA_ATTR: false,
  FORBID_CONTENTS: ['script', 'style'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  SANITIZE_DOM: true
}

// PR Newswire specific cleanup patterns
const PR_CLEANUP_PATTERNS = [
  // Remove wrapper containers
  /<section[^>]*class="[^"]*release-body[^>]*>|<\/section>/gi,
  /<div[^>]*class="[^"]*row[^>]*>|<\/div>/gi,
  /<div[^>]*class="[^"]*col-[^>]*>|<\/div>/gi,
  
  // Remove PR-specific spans but keep content
  /<span[^>]*class="[^"]*legendSpanClass[^>]*>/gi,
  /<span[^>]*class="[^"]*xn-[^"]*[^>]*>/gi,
  /<\/span>/gi,
  
  // Remove email protection
  /<span[^>]*__cf_email__[^>]*>.*?<\/span>/gi,
  /\/cdn-cgi\/l\/email-protection#[^"]+/gi,
  
  // Remove tracking images
  /<img[^>]*rt\.prnewswire[^>]*>/gi,
  /<img[^>]*style="[^"]*width:1px[^>]*>/gi,
  
  // Remove classes and data attributes
  /\s+class="[^"]*"/gi,
  /\s+data-[^=]+="[^"]*"/gi,
  
  // Clean up links - remove tracking attributes
  /\s+rel="[^"]*"/gi,
  /\s+data-toggle="[^"]*"/gi,
  
  // Remove line break classes
  /\s+class="dnr"/gi,
  
  // Remove empty paragraphs
  /<p[^>]*>\s*<\/p>/gi,
  
  // Remove multiple consecutive line breaks
  /(<br[^>]*>){3,}/gi,
]

/**
 * Clean PR Newswire specific HTML elements and attributes
 */
export function cleanPRNewswireHTML(html: string): string {
  if (!html) return ''
  
  let cleaned = html
  
  // Apply all cleanup patterns
  PR_CLEANUP_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Convert deprecated tags to semantic equivalents
  cleaned = cleaned
    .replace(/<b(\s[^>]*)?>/gi, '<strong>')
    .replace(/<\/b>/gi, '</strong>')
    .replace(/<i(\s[^>]*)?>/gi, '<em>')
    .replace(/<\/i>/gi, '</em>')
  
  // Clean up excessive whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim()
  
  return cleaned
}

/**
 * Sanitize HTML content using DOMPurify
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''
  
  try {
    // First clean PR Newswire specific elements
    const cleaned = cleanPRNewswireHTML(html)
    
    // Then sanitize with DOMPurify
    const sanitized = DOMPurifyServer.sanitize(cleaned, SANITIZE_CONFIG)
    
    return sanitized
  } catch (error) {
    console.error('HTML sanitization error:', error)
    // Fallback to plain text if sanitization fails
    return html.replace(/<[^>]*>/g, '').trim()
  }
}

/**
 * Validate that HTML content is safe to render
 */
export function validateHTMLSafety(html: string): boolean {
  if (!html) return true
  
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /<script[^>]*>/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi, // onclick, onload, etc.
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(html))
}

/**
 * Extract text content from HTML for fallback purposes
 */
export function extractTextContent(html: string): string {
  if (!html) return ''
  
  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Process HTML content with highlighting for financial terms
 */
export function highlightFinancialTerms(html: string): string {
  if (!html) return ''
  
  // Highlight financial amounts
  const financialPattern = /(\$[\d,]+(?:\.\d{2})?\s*(?:million|billion|trillion|thousand)?)/gi
  const percentagePattern = /(\d+(?:\.\d+)?%\s*(?:growth|increase|rise|up|down|decline|decrease))/gi
  
  let highlighted = html
    .replace(financialPattern, '<mark class="highlight-financial">$1</mark>')
    .replace(percentagePattern, '<mark class="highlight-percentage">$1</mark>')
  
  return highlighted
}

/**
 * Main function to process and sanitize HTML content
 */
export function processHTMLContent(html: string, enableHighlighting: boolean = true): {
  sanitizedHTML: string
  textContent: string
  isValid: boolean
} {
  try {
    // Validate input
    if (!html || typeof html !== 'string') {
      return {
        sanitizedHTML: '',
        textContent: '',
        isValid: false
      }
    }
    
    // Sanitize HTML
    let sanitized = sanitizeHTML(html)
    
    // Apply highlighting if enabled
    if (enableHighlighting && sanitized) {
      sanitized = highlightFinancialTerms(sanitized)
    }
    
    // Extract text content for fallback
    const textContent = extractTextContent(html)
    
    // Validate safety
    const isValid = validateHTMLSafety(sanitized) && sanitized.length > 0
    
    return {
      sanitizedHTML: sanitized,
      textContent,
      isValid
    }
  } catch (error) {
    console.error('HTML processing error:', error)
    return {
      sanitizedHTML: '',
      textContent: extractTextContent(html),
      isValid: false
    }
  }
} 