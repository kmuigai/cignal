export interface Company {
  id: string
  userId: string
  name: string
  variations: string[]
  website: string
  industry: string
  createdAt: string
  updatedAt: string
}

// RSS Source for company-specific feeds
export interface RSSSource {
  id: string
  companyId: string
  userId: string
  feedUrl: string
  feedName: string
  feedType: 'ir-news' | 'sec-filings' | 'general-news' | 'industry' | 'custom'
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastFetchedAt?: string
  lastError?: string
  articleCount: number
  successRate: number
}

// For creating/updating RSS sources
export interface CreateRSSSource {
  feedUrl: string
  feedName: string
  feedType: RSSSource['feedType']
  enabled?: boolean
}

export interface UpdateRSSSource {
  feedUrl?: string
  feedName?: string
  feedType?: RSSSource['feedType']
  enabled?: boolean
  lastFetchedAt?: string
  lastError?: string
  articleCount?: number
  successRate?: number
}

// RSS validation result
export interface RSSValidationResult {
  valid: boolean
  title?: string
  description?: string
  itemCount?: number
  error?: string
  detectedType?: RSSSource['feedType']
}

// Current in-memory press release (from RSS)
export interface PressRelease {
  id: string
  title: string
  content: string
  summary: string
  sourceUrl: string
  publishedAt: string
  companyId: string
  aiAnalysis?: {
    summary: string
    keyPoints: string[]
  }
  highlights?: Array<{
    type: "financial" | "opportunity" | "risk" | "strategic"
    text: string
    start: number
    end: number
  }>
  createdAt: string
  // Fintech detection fields
  isFintech?: boolean
  fintechCategories?: string[]
  fintechRelevanceScore?: number
}

// Stored press release in database
export interface StoredPressRelease {
  id: string
  userId: string
  companyId: string
  title: string
  content: string
  summary: string
  sourceUrl: string
  publishedAt: string
  contentHash: string
  rssSourceUrl: string
  aiAnalysis?: {
    summary: string
    keyPoints: string[]
  }
  highlights?: Array<{
    type: "financial" | "opportunity" | "risk" | "strategic"
    text: string
    start: number
    end: number
  }>
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

// For creating new stored press releases
export interface CreateStoredPressRelease {
  companyId: string
  title: string
  content: string
  summary: string
  sourceUrl: string
  publishedAt: string
  contentHash: string
  rssSourceUrl: string
  aiAnalysis?: {
    summary: string
    keyPoints: string[]
  }
  highlights?: Array<{
    type: "financial" | "opportunity" | "risk" | "strategic"
    text: string
    start: number
    end: number
  }>
}

// RSS polling job log
export interface RSSPollLog {
  id: string
  userId: string
  companyId: string
  pollStartedAt: string
  pollCompletedAt?: string
  status: 'running' | 'success' | 'error'
  releasesFound: number
  releasesNew: number
  releasesDuplicate: number
  errorMessage?: string
  errorDetails?: any
  createdAt: string
}

// For creating poll logs
export interface CreateRSSPollLog {
  companyId: string
  pollStartedAt: string
  status: 'running' | 'success' | 'error'
  releasesFound?: number
  releasesNew?: number
  releasesDuplicate?: number
  errorMessage?: string
  errorDetails?: any
}

export interface Bookmark {
  userId: string
  pressReleaseId: string
  createdAt: string
}

// Content hash generation options
export interface ContentHashOptions {
  includeTitle: boolean
  includeContent: boolean
  includePublishedAt: boolean
}
