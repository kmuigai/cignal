import type { PressRelease } from "./types"

interface RSSItem {
  title: string
  description: string
  pubDate: string
  link: string
  companyMentions: string[]
  matchedCompany?: string
}

export function convertRSSItemToPressRelease(item: RSSItem, companyId: string, index: number): PressRelease {
  // Generate a unique ID based on the link
  const id = `rss-${btoa(item.link)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 10)}-${index}`

  // Convert RSS pubDate to ISO string
  let publishedAt: string
  try {
    publishedAt = new Date(item.pubDate).toISOString()
  } catch {
    publishedAt = new Date().toISOString()
  }

  // Clean HTML tags from description before using as content and summary
  const cleanDescription = item.description.replace(/<[^>]*>/g, "").trim()

  // Generate mock AI analysis for real RSS items
  const mockAnalysis = {
    summary: `AI analysis: ${cleanDescription.substring(0, 150)}...`,
    keyPoints: extractKeyPoints(item.title, cleanDescription),
  }

  // Generate mock highlights based on content
  const highlights = generateMockHighlights(item.description)

  return {
    id,
    title: item.title,
    content: cleanDescription, // Use cleaned description
    summary: cleanDescription.substring(0, 200) + (cleanDescription.length > 200 ? "..." : ""),
    sourceUrl: item.link,
    publishedAt,
    companyId,
    aiAnalysis: mockAnalysis,
    highlights,
    createdAt: publishedAt,
  }
}

function extractKeyPoints(title: string, description: string): string[] {
  const keyPoints: string[] = []
  const text = `${title} ${description}`.toLowerCase()

  // Look for financial indicators
  if (text.match(/\$[\d,]+\s*(million|billion|trillion)/)) {
    keyPoints.push("Financial announcement")
  }

  // Look for strategic moves
  if (text.includes("acquisition") || text.includes("merger") || text.includes("partnership")) {
    keyPoints.push("Strategic transaction")
  }

  // Look for funding
  if (text.includes("funding") || text.includes("investment") || text.includes("capital")) {
    keyPoints.push("Funding activity")
  }

  // Look for product launches
  if (text.includes("launch") || text.includes("unveil") || text.includes("introduce")) {
    keyPoints.push("Product/service launch")
  }

  return keyPoints.length > 0 ? keyPoints : ["Company announcement"]
}

function generateMockHighlights(content: string) {
  const highlights = []

  // Look for financial data
  const financialRegex = /\$[\d,]+\s*(million|billion|trillion|thousand)/gi
  let match
  while ((match = financialRegex.exec(content)) !== null) {
    highlights.push({
      type: "financial" as const,
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  // Look for percentage growth
  const percentageRegex = /\d+%\s*(growth|increase|rise|up)/gi
  while ((match = percentageRegex.exec(content)) !== null) {
    highlights.push({
      type: "opportunity" as const,
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return highlights
}
