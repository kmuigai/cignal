import { NextResponse } from "next/server"

// Test endpoint to verify RSS parsing with sample data
export async function GET() {
  const sampleRSSXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PR Newswire: News Releases</title>
    <description>Latest news releases from PR Newswire</description>
    <item>
      <title><![CDATA[Blackstone Announces Record Q4 2024 Results]]></title>
      <description><![CDATA[NEW YORK, Jan 15, 2025 - Blackstone Inc. (NYSE: BX) today announced record results for Q4 2024, with assets under management reaching $1.3 trillion.]]></description>
      <pubDate>Mon, 15 Jan 2025 14:00:00 GMT</pubDate>
      <link>https://www.prnewswire.com/news-releases/blackstone-announces-record-q4-2024-results-302345678.html</link>
    </item>
    <item>
      <title><![CDATA[Apollo Global Management Completes Infrastructure Fund]]></title>
      <description><![CDATA[Apollo Global Management announced the successful closing of its infrastructure fund at $25 billion.]]></description>
      <pubDate>Fri, 12 Jan 2025 16:30:00 GMT</pubDate>
      <link>https://www.prnewswire.com/news-releases/apollo-infrastructure-fund-302345679.html</link>
    </item>
    <item>
      <title><![CDATA[Tech Startup Raises Series A Funding]]></title>
      <description><![CDATA[A technology startup announced $10 million in Series A funding to expand operations.]]></description>
      <pubDate>Thu, 11 Jan 2025 10:00:00 GMT</pubDate>
      <link>https://www.prnewswire.com/news-releases/tech-startup-series-a-302345680.html</link>
    </item>
  </channel>
</rss>`

  try {
    // Import the parsing function from the main route
    const { parseRSSXML, extractCompanyMentions } = await import("./route")

    // This is a simplified version for testing
    const items = []
    const itemMatches = sampleRSSXML.match(/<item>([\s\S]*?)<\/item>/g)

    if (itemMatches) {
      for (const itemXML of itemMatches) {
        const titleMatch = itemXML.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
        const descMatch = itemXML.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)
        const pubDateMatch = itemXML.match(/<pubDate>(.*?)<\/pubDate>/)
        const linkMatch = itemXML.match(/<link>(.*?)<\/link>/)

        const title = titleMatch ? titleMatch[1].trim() : ""
        const description = descMatch ? descMatch[1].trim() : ""
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : ""
        const link = linkMatch ? linkMatch[1].trim() : ""

        // Simple company mention detection for test
        const companyMentions = []
        const text = `${title} ${description}`.toLowerCase()
        if (text.includes("blackstone")) companyMentions.push("Blackstone")
        if (text.includes("apollo")) companyMentions.push("Apollo")

        items.push({
          title,
          description,
          pubDate,
          link,
          companyMentions,
        })
      }
    }

    return NextResponse.json({
      message: "RSS parsing test successful",
      sampleData: {
        items,
        fetchedAt: new Date().toISOString(),
        totalItems: items.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
