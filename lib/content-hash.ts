import crypto from 'crypto'
import type { ContentHashOptions } from './types'

/**
 * Generate a consistent hash for press release content to detect duplicates
 */
export function generateContentHash(
  title: string,
  content: string,
  publishedAt: string,
  options: ContentHashOptions = {
    includeTitle: true,
    includeContent: true,
    includePublishedAt: true,
  }
): string {
  // Normalize text by removing extra whitespace and converting to lowercase
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Build the content string based on options
  const parts: string[] = []
  
  if (options.includeTitle) {
    parts.push(`title:${normalizeText(title)}`)
  }
  
  if (options.includeContent) {
    // For content, also remove HTML tags if present
    const cleanContent = content.replace(/<[^>]*>/g, '')
    parts.push(`content:${normalizeText(cleanContent)}`)
  }
  
  if (options.includePublishedAt) {
    // Normalize the date to ISO string to handle different date formats
    const normalizedDate = new Date(publishedAt).toISOString()
    parts.push(`published:${normalizedDate}`)
  }

  // Create hash from the combined content
  const contentString = parts.join('|')
  return crypto
    .createHash('sha256')
    .update(contentString, 'utf8')
    .digest('hex')
}

/**
 * Check if two press releases are likely duplicates based on content similarity
 */
export function areDuplicates(
  release1: { title: string; content: string; publishedAt: string },
  release2: { title: string; content: string; publishedAt: string },
  options?: ContentHashOptions
): boolean {
  const hash1 = generateContentHash(release1.title, release1.content, release1.publishedAt, options)
  const hash2 = generateContentHash(release2.title, release2.content, release2.publishedAt, options)
  
  return hash1 === hash2
}

/**
 * Generate multiple hashes with different strategies for fuzzy duplicate detection
 */
export function generateFuzzyHashes(
  title: string,
  content: string,
  publishedAt: string
): {
  exact: string
  titleOnly: string
  contentOnly: string
  titleAndDate: string
} {
  return {
    exact: generateContentHash(title, content, publishedAt),
    titleOnly: generateContentHash(title, content, publishedAt, {
      includeTitle: true,
      includeContent: false,
      includePublishedAt: false,
    }),
    contentOnly: generateContentHash(title, content, publishedAt, {
      includeTitle: false,
      includeContent: true,
      includePublishedAt: false,
    }),
    titleAndDate: generateContentHash(title, content, publishedAt, {
      includeTitle: true,
      includeContent: false,
      includePublishedAt: true,
    }),
  }
}

/**
 * Extract key content indicators for additional duplicate detection
 */
export function extractContentFingerprint(content: string): {
  wordCount: number
  firstWords: string
  lastWords: string
  keyNumbers: string[]
} {
  // Clean and normalize content
  const cleanContent = content
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleanContent.split(' ')
  
  // Extract numbers that might be important (dollar amounts, percentages, etc.)
  const numbers = cleanContent.match(/\$?[\d,]+\.?\d*%?/g) || []

  return {
    wordCount: words.length,
    firstWords: words.slice(0, 10).join(' '),
    lastWords: words.slice(-10).join(' '),
    keyNumbers: numbers.slice(0, 5), // Keep top 5 numbers
  }
} 