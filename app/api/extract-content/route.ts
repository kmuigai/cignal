import { NextResponse } from "next/server"
import { processHTMLContent } from "@/lib/html-sanitizer"

interface ExtractContentResponse {
  success: boolean
  content: string
  htmlContent?: string
  textContent?: string
  error?: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          content: "",
          error: "URL parameter is required",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Extracting content from: ${url}`)

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    if (!html || html.trim().length === 0) {
      throw new Error("Empty response received")
    }

    // Extract the main content from PR Newswire HTML
    const rawContent = extractPRNewswireContent(html)

    if (!rawContent || rawContent.trim().length === 0) {
      throw new Error("Could not extract content from HTML")
    }

    // Process the HTML content using our new sanitization approach
    const { sanitizedHTML, textContent, isValid } = processHTMLContent(rawContent, true)

    if (!isValid || (!sanitizedHTML && !textContent)) {
      throw new Error("Failed to process extracted content")
    }

    console.log(`✅ Successfully extracted and processed content: ${sanitizedHTML ? sanitizedHTML.length : textContent.length} characters`)

    return NextResponse.json({
      success: true,
      content: sanitizedHTML || textContent, // Primary content (HTML preferred)
      htmlContent: sanitizedHTML, // Explicit HTML content
      textContent: textContent, // Fallback text content
    })
  } catch (error) {
    console.error("❌ Content extraction failed:", error)

    return NextResponse.json({
      success: false,
      content: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    })
  }
}

function extractPRNewswireContent(html: string): string {
  try {
    // ⭐ NEW: Try precise PR Newswire boundary extraction first
    const preciseContent = extractPRNewswireArticleContent(html)
    if (preciseContent && preciseContent.length > 100) {
      console.log(`📝 Content extracted using precise PR Newswire boundaries`)
      return preciseContent
    }

    // Enhanced PR Newswire content selectors (in order of preference)
    const contentSelectors = [
      // Most specific PR Newswire selectors
      ".release-body",
      ".news-release-content", 
      ".release-text",
      ".pr-body",
      ".content-body",
      ".press-release-content",
      ".release-content",

      // Article-specific content areas
      ".news-content",
      "article .content",
      ".article-content",
      ".story-content",
      ".article-body",

      // Generic content areas (lower priority)
      ".main-content",
      "#main-content",
      ".content",

      // Fallback to common HTML5 elements
      "main",
      "article",
    ]

    // Try each selector until we find quality content
    for (const selector of contentSelectors) {
      const content = extractContentBySelector(html, selector)
      if (content && content.length > 100) {
        console.log(`📝 Content extracted using selector: ${selector}`)
        return content
      }
    }

    // If no specific selectors work, try to extract from common patterns
    const fallbackContent = extractFallbackContent(html)
    if (fallbackContent && fallbackContent.length > 100) {
      console.log(`📝 Content extracted using fallback patterns`)
      return fallbackContent
    }

    throw new Error("No suitable content found with any selector")
  } catch (error) {
    console.error("Content extraction error:", error)
    throw error
  }
}

function extractContentBySelector(html: string, selector: string): string | null {
  try {
    // Simple regex-based extraction for HTML content
    let pattern: RegExp

    if (selector.startsWith(".")) {
      // Class selector - capture the full HTML content including tags
      const className = selector.substring(1)
      pattern = new RegExp(`<[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, "gi")
    } else if (selector.startsWith("#")) {
      // ID selector
      const id = selector.substring(1)
      pattern = new RegExp(`<[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, "gi")
    } else {
      // Tag selector
      pattern = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, "gi")
    }

    const match = pattern.exec(html)
    if (match && match[1]) {
      // Return the raw HTML content - don't strip tags here
      const rawContent = match[1].trim()
      return validateContentQuality(rawContent) ? rawContent : null
    }

    return null
  } catch (error) {
    console.error(`Error extracting with selector ${selector}:`, error)
    return null
  }
}

function extractFallbackContent(html: string): string | null {
  try {
          // Look for common press release patterns - keep HTML structure
      const patterns = [
        // Look for content between common press release markers
        /(?:NEW YORK|LONDON|SAN FRANCISCO|CHICAGO|LOS ANGELES|BOSTON|WASHINGTON)[^<]*?--[^<]*?--([\s\S]*?)(?:<\/section|<\/div|$)/gi,

        // Look for content after dateline patterns
        /\b[A-Z]{2,}[^<]*?,\s*[^<]*?\d{4}[^<]*?--([\s\S]*?)(?:<\/section|<\/div|$)/gi,

        // Look for substantial content blocks
        /<div[^>]*>([^<]*<p[^>]*>[^<]{100,}[\s\S]*?)<\/div>/gi,
      ]

    for (const pattern of patterns) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        const content = matches.join("")
        if (validateContentQuality(content)) {
          return content
        }
      }
    }

    return null
  } catch (error) {
    console.error("Fallback extraction error:", error)
    return null
  }
}

/**
 * Validate content quality after extraction
 */
function validateContentQuality(content: string): boolean {
  if (!content || content.trim().length < 50) {
    return false
  }

  // Extract text for word counting (remove HTML tags temporarily)
  const textContent = content.replace(/<[^>]*>/g, '').trim()
  
  // Check for minimum word count
  const words = textContent.split(/\s+/)
  if (words.length < 20) {
    return false
  }

  // Check that content doesn't start with common unwanted patterns
  const unwantedStartPatterns = [
    /^(share|follow|subscribe|contact|advertisement)/i,
    /^(home|news|previous|next)/i,
    /^(learn more|visit us|for more)/i,
  ]

  for (const pattern of unwantedStartPatterns) {
    if (pattern.test(textContent)) {
      return false
    }
  }

  // Check for reasonable sentence structure (contains periods)
  const sentenceCount = (textContent.match(/[.!?]+/g) || []).length
  if (sentenceCount < 2) {
    return false
  }

  return true
}

/**
 * Extract PR Newswire article content using precise HTML structural boundaries
 * START: <section class="release-body container "><div class="row"><div class="col-lg-10 col-lg-offset-1">
 * END: <div class="row"><div class="col-sm-10 col-sm-offset-1">
 */
function extractPRNewswireArticleContent(html: string): string | null {
  try {
    // Find the article start boundary
    const startPattern = /<section[^>]*class="[^"]*release-body[^"]*container[^"]*"[^>]*>\s*<div[^>]*class="[^"]*row[^"]*"[^>]*>\s*<div[^>]*class="[^"]*col-lg-10[^"]*col-lg-offset-1[^"]*"[^>]*>/i
    const startMatch = html.match(startPattern)
    
    if (!startMatch) {
      return null // No PR Newswire structure found
    }
    
    const startIndex = startMatch.index! + startMatch[0].length
    
    // Find the article end boundary (after the start position)
    const endPattern = /<div[^>]*class="[^"]*row[^"]*"[^>]*>\s*<div[^>]*class="[^"]*col-sm-10[^"]*col-sm-offset-1[^"]*"[^>]*>/i
    const htmlAfterStart = html.substring(startIndex)
    const endMatch = htmlAfterStart.match(endPattern)
    
    if (!endMatch) {
      // If no end boundary found, extract until end of section
      const sectionEndPattern = /<\/section>/i
      const sectionEndMatch = htmlAfterStart.match(sectionEndPattern)
      const endIndex = sectionEndMatch ? sectionEndMatch.index! : htmlAfterStart.length
      const content = htmlAfterStart.substring(0, endIndex).trim()
      return validateContentQuality(content) ? content : null
    }
    
    // Extract content between start and end boundaries
    const endIndex = endMatch.index!
    const content = htmlAfterStart.substring(0, endIndex).trim()
    
    return validateContentQuality(content) ? content : null
  } catch (error) {
    console.error('Error in precise PR Newswire extraction:', error)
    return null
  }
}
