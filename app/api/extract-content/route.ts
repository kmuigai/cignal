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
    // Common PR Newswire content selectors (in order of preference)
    const contentSelectors = [
      // Main content areas
      ".release-body",
      ".news-release-content",
      ".content-body",
      ".press-release-content",
      ".release-content",

      // Article content
      "article .content",
      ".article-content",
      ".story-content",

      // Generic content areas
      ".main-content",
      "#main-content",
      ".content",

      // Fallback to common HTML5 elements
      "main",
      "article",
    ]

    // Try each selector until we find content
    for (const selector of contentSelectors) {
      const content = extractContentBySelector(html, selector)
      if (content && content.length > 100) {
        // Minimum content length
        return content
      }
    }

    // If no specific selectors work, try to extract from common patterns
    const fallbackContent = extractFallbackContent(html)
    if (fallbackContent && fallbackContent.length > 100) {
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
      return cleanHtmlContent(match[1])
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
        if (cleaned.length > 200) {
          return cleaned
        }
      }
    }

    return null
  } catch (error) {
    console.error("Fallback extraction error:", error)
    return null
  }
}

function cleanHtmlContent(html: string): string {
  if (!html) return ""

  const cleaned = html
    // Remove script and style tags completely
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<style[^>]*>.*?<\/style>/gis, "")

    // Remove HTML comments
    .replace(/<!--.*?-->/gs, "")

    // Convert common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")

    // Convert paragraph tags to double line breaks
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")

    // Convert line breaks
    .replace(/<br[^>]*>/gi, "\n")

    // Convert div tags to line breaks
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "\n")

    // Remove all other HTML tags
    .replace(/<[^>]*>/g, "")

    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Multiple line breaks to double
    .replace(/[ \t]+/g, " ") // Multiple spaces to single
    .replace(/^\s+|\s+$/gm, "") // Trim lines
    .trim()

  return cleaned
}
