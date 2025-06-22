export interface RSSFeed {
  type: "ir-news" | "sec-filings" | "all-news" | "financial"
  url: string
  displayName: string
}

export interface RSSSource {
  name: string
  feeds: RSSFeed[]
}

export const RSS_SOURCES: Record<string, RSSSource> = {
  general: {
    name: "PR Newswire",
    feeds: [
      {
        type: "all-news",
        url: "https://www.prnewswire.com/rss/news-releases-list.rss",
        displayName: "PR Newswire Main",
      },
    ],
  },

}

// Helper function to get all feeds for specific companies
export function getFeedsForCompanies(companyNames: string[]): Array<RSSFeed & { sourceName: string }> {
  const feeds: Array<RSSFeed & { sourceName: string }> = []

  // Always include general feeds
  RSS_SOURCES.general.feeds.forEach((feed) => {
    feeds.push({ ...feed, sourceName: "general" })
  })



  // Note: Company-specific IR feeds have been temporarily removed due to 404 errors
  // They can be re-added once we find working RSS feed URLs

  return feeds
}

// Helper function to get display name for a feed source
export function getFeedDisplayName(sourceName: string, feedType: string): string {
  const source = RSS_SOURCES[sourceName]
  if (!source) return `${sourceName} - ${feedType}`

  const feed = source.feeds.find((f) => f.type === feedType)
  return feed?.displayName || `${source.name} - ${feedType}`
}

// Placeholder for future company-specific feeds once we find working URLs
export const POTENTIAL_COMPANY_FEEDS = {
  blackstone: {
    name: "Blackstone",
    // These URLs need to be verified and updated when working feeds are found
    potentialFeeds: ["https://ir.blackstone.com/news-releases", "https://www.blackstone.com/news/press-releases/"],
  },
  apollo: {
    name: "Apollo",
    // These URLs need to be verified and updated when working feeds are found
    potentialFeeds: ["https://ir.apollo.com/news-releases", "https://www.apollo.com/news-insights/press-releases"],
  },
}
