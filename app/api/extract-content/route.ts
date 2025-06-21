import { NextResponse } from "next/server"

interface ExtractContentResponse {
  success: boolean
  content: string
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
    const extractedContent = extractPRNewswireContent(html)

    if (!extractedContent || extractedContent.trim().length === 0) {
      throw new Error("Could not extract content from HTML")
    }

    console.log(`✅ Successfully extracted ${extractedContent.length} characters`)

    return NextResponse.json({
      success: true,
      content: extractedContent,
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
    // Simple regex-based extraction (in production, consider using a proper HTML parser)
    let pattern: RegExp

    if (selector.startsWith(".")) {
      // Class selector
      const className = selector.substring(1)
      pattern = new RegExp(`<[^>]*class="[^"]*${className}[^"]*"[^>]*>(.*?)<\/[^>]+>`, "gis")
    } else if (selector.startsWith("#")) {
      // ID selector
      const id = selector.substring(1)
      pattern = new RegExp(`<[^>]*id="${id}"[^>]*>(.*?)<\/[^>]+>`, "gis")
    } else {
      // Tag selector
      pattern = new RegExp(`<${selector}[^>]*>(.*?)<\/${selector}>`, "gis")
    }

    const match = pattern.exec(html)
    if (match && match[1]) {
      const cleanedContent = cleanHtmlContent(match[1])
      const filteredContent = filterUnwantedContent(cleanedContent)
      return validateContentQuality(filteredContent) ? filteredContent : null
    }

    return null
  } catch (error) {
    console.error(`Error extracting with selector ${selector}:`, error)
    return null
  }
}

function extractFallbackContent(html: string): string | null {
  try {
    // Look for common press release patterns
    const patterns = [
      // Look for content between common press release markers
      /(?:NEW YORK|LONDON|SAN FRANCISCO|CHICAGO|LOS ANGELES|BOSTON|WASHINGTON)[^<]*?--[^<]*?--(.*?)(?:<\/|$)/gis,

      // Look for content after dateline patterns
      /\b[A-Z]{2,}[^<]*?,\s*[^<]*?\d{4}[^<]*?--(.*?)(?:<\/|$)/gis,

      // Look for paragraphs with substantial content
      /<p[^>]*>([^<]{100,}.*?)<\/p>/gis,
    ]

    for (const pattern of patterns) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        const content = matches.join("\n\n")
        const cleaned = cleanHtmlContent(content)
        const filtered = filterUnwantedContent(cleaned)
        if (validateContentQuality(filtered)) {
          return filtered
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
 * Enhanced content filtering to remove unwanted elements
 */
function filterUnwantedContent(content: string): string {
  if (!content) return ""

  let filtered = content

  // Social Media and Sharing Text Patterns
  const socialMediaPatterns = [
    // Sharing phrases
    /share\s+this\s+article[^\n]*/gi,
    /share\s+on\s+(x|twitter|facebook|linkedin|instagram)[^\n]*/gi,
    /share\s+to[x|facebook|linkedin|instagram][^\n]*/gi,
    /share\s+via\s+(email|link)[^\n]*/gi,
    
    // Social media follow patterns
    /follow\s+us\s+on[^\n]*/gi,
    /connect\s+with\s+us[^\n]*/gi,
    /find\s+us\s+on[^\n]*/gi,
    
    // Social media platform mentions in sharing context
    /like\s+us\s+on\s+facebook[^\n]*/gi,
    /follow\s+@\w+[^\n]*/gi,
    
    // Subscribe patterns
    /subscribe\s+to\s+(our\s+)?(newsletter|updates|feed)[^\n]*/gi,
    /sign\s+up\s+for[^\n]*/gi,
  ]

  // Navigation and UI Element Patterns
  const navigationPatterns = [
    // Breadcrumb navigation
    /home\s*>\s*news\s*>[^\n]*/gi,
    /home\s*»\s*news\s*»[^\n]*/gi,
    /you\s+are\s+here:[^\n]*/gi,
    
    // Previous/Next navigation
    /previous\s+(article|story|news)[^\n]*/gi,
    /next\s+(article|story|news)[^\n]*/gi,
    /related\s+(articles|stories|news)[^\n]*/gi,
    
    // Read more links
    /read\s+more\s+at[^\n]*/gi,
    /continue\s+reading[^\n]*/gi,
    /full\s+story\s+at[^\n]*/gi,
  ]

  // Advertisement and Promotional Patterns
  const adPatterns = [
    /advertisement\s*$/gi,
    /sponsored\s+content[^\n]*/gi,
    /promotional\s+content[^\n]*/gi,
    /learn\s+more\s+at\s+\S+[^\n]*/gi,
    /visit\s+us\s+at\s+\S+[^\n]*/gi,
    /for\s+more\s+information[^\n]*/gi,
  ]

  // Footer and Contact Information Patterns
  const footerPatterns = [
    // Copyright notices
    /©\s*\d{4}[^\n]*/gi,
    /copyright\s+\d{4}[^\n]*/gi,
    /all\s+rights\s+reserved[^\n]*/gi,
    
    // Contact information blocks
    /contact\s+(us|information)[^\n]*/gi,
    /for\s+media\s+inquiries[^\n]*/gi,
    /press\s+contact[^\n]*/gi,
    /media\s+contact[^\n]*/gi,
    
    // Company boilerplate
    /about\s+the\s+company[^\n]*/gi,
    /about\s+\w+(\s+\w+)*\s*:?\s*$/gi,
  ]

  // Website and Email Pattern Cleanup
  const webPatterns = [
    // Remove standalone URLs at end of sentences
    /\s+https?:\/\/\S+$/gi,
    /\s+www\.\S+$/gi,
    
    // Remove email addresses in contact context
    /email:\s*\S+@\S+/gi,
    /contact:\s*\S+@\S+/gi,
  ]

  // Apply all filters
  const allPatterns = [
    ...socialMediaPatterns,
    ...navigationPatterns,
    ...adPatterns,
    ...footerPatterns,
    ...webPatterns,
  ]

  allPatterns.forEach(pattern => {
    filtered = filtered.replace(pattern, "")
  })

  // Clean up extra whitespace created by filtering
  filtered = filtered
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Multiple line breaks to double
    .replace(/[ \t]+/g, " ") // Multiple spaces to single
    .replace(/^\s+|\s+$/gm, "") // Trim lines
    .trim()

  return filtered
}

/**
 * Validate content quality after extraction and filtering
 */
function validateContentQuality(content: string): boolean {
  if (!content || content.trim().length < 50) {
    return false
  }

  // Check for minimum word count
  const words = content.trim().split(/\s+/)
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
    if (pattern.test(content.trim())) {
      return false
    }
  }

  // Check for reasonable sentence structure (contains periods)
  const sentenceCount = (content.match(/[.!?]+/g) || []).length
  if (sentenceCount < 2) {
    return false
  }

  return true
}

function cleanHtmlContent(html: string): string {
  if (!html) return ""

  const cleaned = html
    // Remove script and style tags completely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")

    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")

    // Remove common unwanted HTML elements
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "") // Navigation
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "") // Footer
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "") // Sidebar content
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "") // Header content
    
    // Remove social media and share buttons
    .replace(/<[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, "")
    .replace(/<[^>]*class="[^"]*social[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, "")

    // Convert common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")

    // Enhanced paragraph handling - preserve structure better
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")

    // Convert line breaks
    .replace(/<br[^>]*>/gi, "\n")

    // Handle div tags more intelligently
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n")

    // Handle lists
    .replace(/<\/li>\s*<li[^>]*>/gi, "\n")
    .replace(/<[\/]?[uo]l[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")

    // Remove all other HTML tags
    .replace(/<[^>]*>/g, "")

    // Enhanced whitespace cleanup
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Multiple line breaks to double
    .replace(/[ \t]+/g, " ") // Multiple spaces to single
    .replace(/^\s+|\s+$/gm, "") // Trim lines
    .trim()

  return cleaned
}
