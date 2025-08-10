import { NextResponse } from "next/server"
import { getFeedsForCompanies, getFeedDisplayName } from "@/lib/rss-sources"
import { detectFintechContent } from "@/lib/fintech-detector"

interface RSSItem {
  title: string
  description: string
  pubDate: string
  link: string
  guid?: string
  companyMentions: string[]
  matchedCompany?: string
  relevanceScore?: number
  feedSource: string
  feedType: "ir-news" | "sec-filings" | "all-news" | "financial"
  sourceName: string
  // Fintech detection fields
  isFintech?: boolean
  fintechCategories?: string[]
  fintechRelevanceScore?: number
}

interface FeedResult {
  feedName: string
  feedUrl: string
  feedType: string
  sourceName: string
  success: boolean
  items: RSSItem[]
  error?: string
}

interface ParsedRSSData {
  items: RSSItem[]
  fetchedAt: string
  totalItems: number
  filteredItems: number
  userCompanies: string[]
  feedResults: FeedResult[]
  metrics: {
    totalItemsAllFeeds: number
    itemsPerFeed: Record<string, number>
    duplicatesRemoved: number
    companyMatches: number
    feedsByType: Record<string, number>
  }
}

// Common company names and variations to look for
const COMPANY_PATTERNS = [
  // Private Equity
  {
    name: "Blackstone",
    patterns: ["blackstone", "bx", "blackstone group", "blackstone inc", "blackstone real estate"],
  },
  { name: "Apollo", patterns: ["apollo", "apo", "apollo global", "apollo management", "apollo global management"] },
  { name: "KKR", patterns: ["kkr", "kohlberg kravis roberts", "kkr & co"] },
  { name: "Carlyle", patterns: ["carlyle", "carlyle group", "the carlyle group"] },

  // Tech/FinTech
  { name: "CAIS", patterns: ["cais", "cais group", "cais holdings"] },
  { name: "Addepar", patterns: ["addepar"] },
  { name: "Subscribe", patterns: ["subscribe technologies", "subscribe inc"] },

  // Major Tech
  { name: "Microsoft", patterns: ["microsoft", "msft"] },
  { name: "Apple", patterns: ["apple", "aapl"] },
  { name: "Google", patterns: ["google", "alphabet", "googl"] },
  { name: "Amazon", patterns: ["amazon", "amzn"] },
]

// Common non-English words/patterns to filter out
const NON_ENGLISH_PATTERNS = [
  // Spanish
  /\b(el|la|los|las|de|del|en|con|por|para|que|una|uno|esta|este|son|muy|más|año|años)\b/gi,
  // French
  /\b(le|la|les|de|du|des|et|avec|pour|que|une|un|cette|ce|sont|très|plus|année|années)\b/gi,
  // German
  /\b(der|die|das|den|dem|des|und|mit|für|dass|eine|ein|diese|dieser|sind|sehr|mehr|jahr|jahre)\b/gi,
  // Portuguese
  /\b(o|a|os|as|de|do|da|dos|das|em|com|por|para|que|uma|um|esta|este|são|muito|mais|ano|anos)\b/gi,
  // Italian
  /\b(il|la|lo|gli|le|di|del|della|dei|delle|e|con|per|che|una|un|questa|questo|sono|molto|più|anno|anni)\b/gi,
]

// Common English words that indicate English content
const ENGLISH_INDICATORS = [
  /\b(the|and|or|but|in|on|at|to|for|of|with|by|from|about|into|through|during|before|after|above|below|up|down|out|off|over|under|again|further|then|once)\b/gi,
  /\b(company|corporation|inc|llc|ltd|announces|reports|launches|releases|introduces|expands|acquires|partners|invests)\b/gi,
]

function isEnglishContent(text: string): boolean {
  const lowerText = text.toLowerCase()

  // Check for non-English patterns
  let nonEnglishMatches = 0
  for (const pattern of NON_ENGLISH_PATTERNS) {
    const matches = lowerText.match(pattern)
    if (matches) {
      nonEnglishMatches += matches.length
    }
  }

  // Check for English indicators
  let englishMatches = 0
  for (const pattern of ENGLISH_INDICATORS) {
    const matches = lowerText.match(pattern)
    if (matches) {
      englishMatches += matches.length
    }
  }

  // Consider it English if:
  // 1. No non-English patterns found, OR
  // 2. English indicators significantly outweigh non-English patterns
  return nonEnglishMatches === 0 || englishMatches > nonEnglishMatches * 2
}

function extractCompanyMentions(text: string): string[] {
  const mentions: string[] = []
  const lowerText = text.toLowerCase()

  for (const company of COMPANY_PATTERNS) {
    for (const pattern of company.patterns) {
      if (lowerText.includes(pattern)) {
        if (!mentions.includes(company.name)) {
          mentions.push(company.name)
        }
        break // Found this company, move to next
      }
    }
  }

  return mentions
}

function parseRSSXML(xmlText: string, feedSource: string, feedType: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = []

  try {
    // Simple XML parsing - in production, consider using a proper XML parser
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g)

    if (!itemMatches) {
      return items
    }

    for (const itemXML of itemMatches) {
      try {
        // Extract title
        const titleMatch =
          itemXML.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXML.match(/<title>(.*?)<\/title>/)
        const title = titleMatch ? titleMatch[1].trim() : ""

        // Extract description
        const descMatch =
          itemXML.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
          itemXML.match(/<description>(.*?)<\/description>/)
        const description = descMatch ? descMatch[1].trim() : ""

        // Extract publication date
        const pubDateMatch = itemXML.match(/<pubDate>(.*?)<\/pubDate>/)
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : ""

        // Extract link
        const linkMatch = itemXML.match(/<link>(.*?)<\/link>/)
        const link = linkMatch ? linkMatch[1].trim() : ""

        // Extract GUID (for duplicate detection)
        const guidMatch = itemXML.match(/<guid[^>]*>(.*?)<\/guid>/)
        const guid = guidMatch ? guidMatch[1].trim() : ""

        // Skip if missing essential data
        if (!title || !link) {
          continue
        }

        // Filter out non-English content for general feeds
        const fullText = `${title} ${description}`
        if (feedType === "all-news" && !isEnglishContent(fullText)) {
          continue
        }

        // Extract company mentions from title and description
        const companyMentions = extractCompanyMentions(fullText)



        // Clean HTML from description for better processing
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim()

        // Detect fintech content
        const fintechDetection = detectFintechContent(title, cleanDescription)

        const item: RSSItem = {
          title,
          description: cleanDescription,
          pubDate,
          link,
          guid,
          companyMentions,
          feedSource,
          feedType: feedType as "ir-news" | "sec-filings" | "all-news" | "financial",
          sourceName,
          // Add fintech detection results
          isFintech: fintechDetection.isFintech,
          fintechCategories: fintechDetection.categories,
          fintechRelevanceScore: fintechDetection.relevanceScore
        }

        items.push(item)
      } catch (error) {
        console.warn("Error parsing RSS item:", error)
        continue
      }
    }
  } catch (error) {
    console.error("Error parsing RSS XML:", error)
    throw new Error(`Failed to parse RSS XML from ${feedSource}`)
  }

  return items
}

async function fetchSingleFeed(feed: any): Promise<FeedResult> {
  const displayName = getFeedDisplayName(feed.sourceName, feed.type)

  try {
    console.log(`Fetching ${displayName}...`)

    const response = await fetch(feed.url, {
      headers: {
        "User-Agent": "CIGNAL/1.0 (Competitive Intelligence Tool)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      redirect: "follow", // Follow redirects automatically
      signal: AbortSignal.timeout(15000), // 15 second timeout per feed
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlText = await response.text()

    if (!xmlText || xmlText.trim().length === 0) {
      throw new Error("Empty RSS feed received")
    }

    // Check if response is actually XML/RSS
    if (!xmlText.includes("<rss") && !xmlText.includes("<feed")) {
      throw new Error("Response is not a valid RSS/XML feed")
    }

    const items = parseRSSXML(xmlText, `${feed.sourceName}-${feed.type}`, feed.type, feed.sourceName)
    console.log(`✅ ${displayName}: ${items.length} items`)

    return {
      feedName: `${feed.sourceName}-${feed.type}`,
      feedUrl: feed.url,
      feedType: feed.type,
      sourceName: feed.sourceName,
      success: true,
      items,
    }
  } catch (error) {
    console.error(`❌ ${displayName} failed:`, error)
    return {
      feedName: `${feed.sourceName}-${feed.type}`,
      feedUrl: feed.url,
      feedType: feed.type,
      sourceName: feed.sourceName,
      success: false,
      items: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

function removeDuplicates(items: RSSItem[]): { items: RSSItem[]; duplicatesRemoved: number } {
  const seen = new Set<string>()
  const uniqueItems: RSSItem[] = []
  let duplicatesRemoved = 0

  for (const item of items) {
    // Use GUID if available, otherwise use link as unique identifier
    const identifier = item.guid || item.link

    if (!seen.has(identifier)) {
      seen.add(identifier)
      uniqueItems.push(item)
    } else {
      duplicatesRemoved++
    }
  }

  return { items: uniqueItems, duplicatesRemoved }
}

function calculateRelevanceScore(
  item: RSSItem,
  userCompanies: Array<{ name: string; variations: string[] }>,
): { score: number; matchedCompany: string | null } {
  let maxScore = 0
  let matchedCompany: string | null = null

  // IR feeds get automatic high relevance for their company
  if (item.feedType === "ir-news" || item.feedType === "sec-filings") {
    const companyFromSource = userCompanies.find((c) => c.name.toLowerCase() === item.sourceName.toLowerCase())
    if (companyFromSource) {
      return { score: 200, matchedCompany: companyFromSource.name }
    }
  }

  for (const company of userCompanies) {
    let companyScore = 0

    // Check exact company name match in title (highest priority)
    if (item.title.toLowerCase().includes(company.name.toLowerCase())) {
      companyScore += 100
    }

    // Check exact company name match in description
    if (item.description.toLowerCase().includes(company.name.toLowerCase())) {
      companyScore += 50
    }

    // Check variations
    for (const variation of company.variations) {
      const variationLower = variation.toLowerCase()

      // Title matches for variations
      if (item.title.toLowerCase().includes(variationLower)) {
        companyScore += 80
      }

      // Description matches for variations
      if (item.description.toLowerCase().includes(variationLower)) {
        companyScore += 40
      }
    }

    // Bonus for multiple mentions
    const titleMentions = (item.title.toLowerCase().match(new RegExp(company.name.toLowerCase(), "g")) || []).length
    const descMentions = (item.description.toLowerCase().match(new RegExp(company.name.toLowerCase(), "g")) || [])
      .length
    companyScore += (titleMentions + descMentions - 1) * 10

    if (companyScore > maxScore) {
      maxScore = companyScore
      matchedCompany = company.name
    }
  }

  return { score: maxScore, matchedCompany }
}

function sortByRelevanceAndDate(items: RSSItem[]): RSSItem[] {
  return items.sort((a, b) => {
    // First sort by relevance score (higher is better)
    const scoreA = a.relevanceScore || 0
    const scoreB = b.relevanceScore || 0

    if (scoreA !== scoreB) {
      return scoreB - scoreA
    }

    // Then sort by date (newer is better)
    try {
      const dateA = new Date(a.pubDate).getTime()
      const dateB = new Date(b.pubDate).getTime()
      return dateB - dateA
    } catch {
      return 0
    }
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companiesParam = searchParams.get("companies")

    // Parse companies from query parameter
    let userCompanies: Array<{ name: string; variations: string[] }> = []
    if (companiesParam) {
      try {
        userCompanies = JSON.parse(companiesParam)
      } catch (parseError) {
        console.error("Error parsing companies parameter:", parseError)
      }
    }

    console.log("🚀 Fetching RSS feeds...")
    console.log(`📊 User companies: ${userCompanies.map((c) => c.name).join(", ")}`)

    // Get feeds based on tracked companies (currently only general feeds)
    const companyNames = userCompanies.map((c) => c.name)
    const feedsToFetch = getFeedsForCompanies(companyNames)

    console.log(`📡 Fetching ${feedsToFetch.length} feeds:`)
    feedsToFetch.forEach((feed) => {
      console.log(`  - ${getFeedDisplayName(feed.sourceName, feed.type)}`)
    })

    // Fetch all feeds in parallel
    const feedResults = await Promise.all(feedsToFetch.map((feed) => fetchSingleFeed(feed)))

    // Combine all items from successful feeds
    const allItems: RSSItem[] = []
    const itemsPerFeed: Record<string, number> = {}
    const feedsByType: Record<string, number> = {}

    for (const result of feedResults) {
      itemsPerFeed[result.feedName] = result.items.length
      feedsByType[result.feedType] = (feedsByType[result.feedType] || 0) + result.items.length
      allItems.push(...result.items)
    }

    const totalItemsAllFeeds = allItems.length
    console.log(`📥 Total items from all feeds: ${totalItemsAllFeeds}`)

    // Remove duplicates
    const { items: uniqueItems, duplicatesRemoved } = removeDuplicates(allItems)
    console.log(`🔄 Removed ${duplicatesRemoved} duplicates, ${uniqueItems.length} unique items remaining`)

    // Calculate relevance scores and filter items based on user companies
    let filteredItems = uniqueItems
    let companyMatches = 0

    if (userCompanies.length > 0) {
      filteredItems = uniqueItems
        .map((item) => {
          const { score, matchedCompany } = calculateRelevanceScore(item, userCompanies)
          return {
            ...item,
            relevanceScore: score,
            matchedCompany: matchedCompany || undefined,
          }
        })
        .filter((item) => {
          if (item.relevanceScore && item.relevanceScore > 0) {
            companyMatches++
            return true
          }
          return false
        })
    }

    // Sort by relevance score first, then by date
    const sortedItems = sortByRelevanceAndDate(filteredItems)

    // Log successful and failed feeds
    const successfulFeeds = feedResults.filter((r) => r.success)
    const failedFeeds = feedResults.filter((r) => !r.success)

    console.log(
      `✅ Successful feeds: ${successfulFeeds.map((f) => getFeedDisplayName(f.sourceName, f.feedType)).join(", ")}`,
    )
    if (failedFeeds.length > 0) {
      console.log(
        `❌ Failed feeds: ${failedFeeds.map((f) => `${getFeedDisplayName(f.sourceName, f.feedType)} (${f.error})`).join(", ")}`,
      )
    }

    const result: ParsedRSSData = {
      items: sortedItems,
      fetchedAt: new Date().toISOString(),
      totalItems: uniqueItems.length,
      filteredItems: sortedItems.length,
      userCompanies: userCompanies.map((c) => c.name),
      feedResults,
      metrics: {
        totalItemsAllFeeds,
        itemsPerFeed,
        duplicatesRemoved,
        companyMatches,
        feedsByType,
      },
    }

    console.log(`🎯 Final results: ${result.filteredItems} relevant items from ${result.totalItems} unique items`)

    // Log top matches for debugging
    if (sortedItems.length > 0) {
      console.log("🏆 Top matches:")
      sortedItems.slice(0, 5).forEach((item, index) => {
        console.log(
          `${index + 1}. ${item.matchedCompany} [${item.feedSource}] (score: ${item.relevanceScore}): ${item.title.substring(0, 60)}...`,
        )
      })
    }

    // Log feed performance by type
    console.log("📊 Feed performance by type:")
    Object.entries(feedsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} items`)
    })

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ Error in RSS fetching:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch RSS feeds",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
