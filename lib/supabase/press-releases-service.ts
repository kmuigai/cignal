import { createClientComponentClient } from './client'
import type { 
  StoredPressRelease, 
  CreateStoredPressRelease, 
  RSSPollLog, 
  CreateRSSPollLog 
} from '../types'
import { generateContentHash } from '../content-hash'

class PressReleasesService {
  private supabase = createClientComponentClient()

  /**
   * Store a new press release, checking for duplicates
   */
  async createPressRelease(
    userId: string, 
    data: CreateStoredPressRelease
  ): Promise<StoredPressRelease | null> {
    try {
      // Check if this press release already exists
      const existingRelease = await this.findDuplicate(userId, data.companyId, data.contentHash)
      
      if (existingRelease) {
        console.log('📦 Duplicate press release found, skipping:', data.title)
        return existingRelease
      }

      const { data: newRelease, error } = await this.supabase
        .from('press_releases')
        .insert({
          user_id: userId,
          company_id: data.companyId,
          title: data.title,
          content: data.content,
          summary: data.summary,
          source_url: data.sourceUrl,
          published_at: data.publishedAt,
          content_hash: data.contentHash,
          rss_source_url: data.rssSourceUrl,
          ai_analysis: data.aiAnalysis,
          highlights: data.highlights,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating press release:', error)
        return null
      }

      return this.mapDbToStoredRelease(newRelease)
    } catch (error) {
      console.error('Error in createPressRelease:', error)
      return null
    }
  }

  /**
   * Find duplicate press release by content hash
   */
  async findDuplicate(
    userId: string, 
    companyId: string, 
    contentHash: string
  ): Promise<StoredPressRelease | null> {
    try {
      const { data, error } = await this.supabase
        .from('press_releases')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('content_hash', contentHash)
        .eq('is_deleted', false)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapDbToStoredRelease(data)
    } catch (error) {
      return null
    }
  }

  /**
   * Get press releases for a user, optionally filtered by company
   */
  async getPressReleases(
    userId: string,
    options: {
      companyId?: string
      limit?: number
      offset?: number
      since?: string
      orderBy?: 'published_at' | 'created_at'
      order?: 'asc' | 'desc'
    } = {}
  ): Promise<StoredPressRelease[]> {
    try {
      let query = this.supabase
        .from('press_releases')
        .select(`
          *,
          companies (
            name,
            variations
          )
        `)
        .eq('user_id', userId)
        .eq('is_deleted', false)

      if (options.companyId) {
        query = query.eq('company_id', options.companyId)
      }

      if (options.since) {
        query = query.gte('published_at', options.since)
      }

      // Set ordering
      const orderBy = options.orderBy || 'published_at'
      const order = options.order || 'desc'
      query = query.order(orderBy, { ascending: order === 'asc' })

      // Set pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching press releases:', error)
        return []
      }

      return (data || []).map(this.mapDbToStoredRelease)
    } catch (error) {
      console.error('Error in getPressReleases:', error)
      return []
    }
  }

  /**
   * Get press releases for last 30 days
   */
  async getRecentPressReleases(
    userId: string,
    companyId?: string
  ): Promise<StoredPressRelease[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return this.getPressReleases(userId, {
      companyId,
      since: thirtyDaysAgo.toISOString(),
      orderBy: 'published_at',
      order: 'desc',
    })
  }

  /**
   * Soft delete old press releases (beyond 30 days)
   */
  async cleanupOldReleases(userId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await this.supabase
        .from('press_releases')
        .update({ is_deleted: true })
        .eq('user_id', userId)
        .lt('published_at', thirtyDaysAgo.toISOString())
        .eq('is_deleted', false)
        .select('id')

      if (error) {
        console.error('Error cleaning up old releases:', error)
        return 0
      }

      const deletedCount = data?.length || 0
      console.log(`🧹 Cleaned up ${deletedCount} old press releases for user ${userId}`)
      return deletedCount
    } catch (error) {
      console.error('Error in cleanupOldReleases:', error)
      return 0
    }
  }

  /**
   * Create RSS poll log entry
   */
  async createPollLog(
    userId: string,
    data: CreateRSSPollLog
  ): Promise<RSSPollLog | null> {
    try {
      const { data: newLog, error } = await this.supabase
        .from('rss_poll_logs')
        .insert({
          user_id: userId,
          company_id: data.companyId,
          poll_started_at: data.pollStartedAt,
          status: data.status,
          releases_found: data.releasesFound || 0,
          releases_new: data.releasesNew || 0,
          releases_duplicate: data.releasesDuplicate || 0,
          error_message: data.errorMessage,
          error_details: data.errorDetails,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating poll log:', error)
        return null
      }

      return this.mapDbToPollLog(newLog)
    } catch (error) {
      console.error('Error in createPollLog:', error)
      return null
    }
  }

  /**
   * Update poll log when completed
   */
  async updatePollLog(
    logId: string,
    updates: {
      status: 'success' | 'error'
      pollCompletedAt: string
      releasesFound?: number
      releasesNew?: number
      releasesDuplicate?: number
      errorMessage?: string
      errorDetails?: any
    }
  ): Promise<RSSPollLog | null> {
    try {
      const { data, error } = await this.supabase
        .from('rss_poll_logs')
        .update({
          status: updates.status,
          poll_completed_at: updates.pollCompletedAt,
          releases_found: updates.releasesFound,
          releases_new: updates.releasesNew,
          releases_duplicate: updates.releasesDuplicate,
          error_message: updates.errorMessage,
          error_details: updates.errorDetails,
        })
        .eq('id', logId)
        .select()
        .single()

      if (error) {
        console.error('Error updating poll log:', error)
        return null
      }

      return this.mapDbToPollLog(data)
    } catch (error) {
      console.error('Error in updatePollLog:', error)
      return null
    }
  }

  /**
   * Get recent poll logs for monitoring
   */
  async getRecentPollLogs(
    userId: string,
    limit: number = 50
  ): Promise<RSSPollLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('rss_poll_logs')
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching poll logs:', error)
        return []
      }

      return (data || []).map(this.mapDbToPollLog)
    } catch (error) {
      console.error('Error in getRecentPollLogs:', error)
      return []
    }
  }

  /**
   * Batch store multiple press releases
   */
  async batchCreatePressReleases(
    userId: string,
    releases: CreateStoredPressRelease[]
  ): Promise<{ created: number; duplicates: number }> {
    let created = 0
    let duplicates = 0

    for (const release of releases) {
      const result = await this.createPressRelease(userId, release)
      if (result) {
        // Check if it was actually created or was a duplicate
        const existingRelease = await this.findDuplicate(userId, release.companyId, release.contentHash)
        if (existingRelease && existingRelease.createdAt !== result.createdAt) {
          duplicates++
        } else {
          created++
        }
      }
    }

    return { created, duplicates }
  }

  /**
   * Map database row to StoredPressRelease
   */
  private mapDbToStoredRelease(data: any): StoredPressRelease {
    return {
      id: data.id,
      userId: data.user_id,
      companyId: data.company_id,
      title: data.title,
      content: data.content,
      summary: data.summary,
      sourceUrl: data.source_url,
      publishedAt: data.published_at,
      contentHash: data.content_hash,
      rssSourceUrl: data.rss_source_url,
      aiAnalysis: data.ai_analysis,
      highlights: data.highlights,
      isDeleted: data.is_deleted,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  /**
   * Map database row to RSSPollLog
   */
  private mapDbToPollLog(data: any): RSSPollLog {
    return {
      id: data.id,
      userId: data.user_id,
      companyId: data.company_id,
      pollStartedAt: data.poll_started_at,
      pollCompletedAt: data.poll_completed_at,
      status: data.status,
      releasesFound: data.releases_found,
      releasesNew: data.releases_new,
      releasesDuplicate: data.releases_duplicate,
      errorMessage: data.error_message,
      errorDetails: data.error_details,
      createdAt: data.created_at,
    }
  }
}

// Export singleton instance
export const pressReleasesService = new PressReleasesService() 