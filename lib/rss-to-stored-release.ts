import type { CreateStoredPressRelease } from './types'
import { generateContentHash } from './content-hash'

interface RSSItem {
  title: string
  description: string
  pubDate: string
  link: string
  companyMentions: string[]
  matchedCompany?: string
}

/**
 * Convert RSS feed item to stored press release format
 */
export function convertRSSItemToStoredRelease(
  item: RSSItem,
  companyId: string,
  rssSourceUrl: string
): CreateStoredPressRelease {
  // Clean up the content from RSS feed
  const cleanTitle = item.title.trim()
  const cleanContent = item.description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  // Generate a summary (first 200 chars of content)
  const summary = cleanContent.length > 200 
    ? cleanContent.substring(0, 197) + '...'
    : cleanContent
  
  // Generate content hash for deduplication
  const contentHash = generateContentHash(cleanTitle, cleanContent, item.pubDate)
  
  // Normalize the published date
  const publishedAt = new Date(item.pubDate).toISOString()

  return {
    companyId,
    title: cleanTitle,
    content: cleanContent,
    summary,
    sourceUrl: item.link,
    publishedAt,
    contentHash,
    rssSourceUrl,
  }
}

/**
 * Batch convert multiple RSS items to stored releases
 */
export function convertRSSItemsToStoredReleases(
  items: RSSItem[],
  companyId: string,
  rssSourceUrl: string
): CreateStoredPressRelease[] {
  return items.map(item => convertRSSItemToStoredRelease(item, companyId, rssSourceUrl))
}

/**
 * Validate RSS item has required fields
 */
export function isValidRSSItem(item: any): item is RSSItem {
  return (
    item &&
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    typeof item.pubDate === 'string' &&
    typeof item.link === 'string' &&
    item.title.length > 0 &&
    item.description.length > 0
  )
}

/**
 * Filter and convert RSS items, skipping invalid ones
 */
export function processRSSFeed(
  items: any[],
  companyId: string,
  rssSourceUrl: string
): {
  validReleases: CreateStoredPressRelease[]
  skippedCount: number
} {
  const validItems = items.filter(isValidRSSItem)
  const skippedCount = items.length - validItems.length
  
  if (skippedCount > 0) {
    console.warn(`⚠️ Skipped ${skippedCount} invalid RSS items from ${rssSourceUrl}`)
  }
  
  const validReleases = convertRSSItemsToStoredReleases(validItems, companyId, rssSourceUrl)
  
  return {
    validReleases,
    skippedCount
  }
} 