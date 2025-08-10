import { createClientComponentClient } from "@/lib/supabase/client"
import { encryption } from "../encryption"
import type { Company, RSSSource, CreateRSSSource, UpdateRSSSource, RSSValidationResult } from "../types"
import { validateRSSSourceData, testRSSConnectivity } from "../rss-validation"

// Database types
export interface DatabaseCompany {
  id: string
  user_id: string
  name: string
  variations: string[]
  website: string | null
  industry: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseUserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  claude_api_key: string | null
  created_at: string
  updated_at: string
}

export interface DatabaseBookmark {
  id: string
  user_id: string
  press_release_id: string
  created_at: string
}

export interface DatabaseReadStatus {
  id: string
  user_id: string
  press_release_id: string
  created_at: string
}

export interface DatabaseRSSSource {
  id: string
  company_id: string
  user_id: string
  feed_url: string
  feed_name: string
  feed_type: string
  enabled: boolean
  created_at: string
  updated_at: string
  last_fetched_at: string | null
  last_error: string | null
  article_count: number
  success_rate: number
}

// Company Management
export class CompanyManager {
  private supabase = createClientComponentClient()

  async getCompanies(): Promise<Company[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { data, error } = await this.supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (error) throw error

    return data.map(this.mapDatabaseToCompany)
  }

  async createCompany(company: Omit<Company, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Company> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { data, error } = await this.supabase
      .from("companies")
      .insert({
        user_id: user.id,
        name: company.name,
        variations: company.variations,
        website: company.website || null,
        industry: company.industry || null,
      })
      .select()
      .single()

    if (error) throw error

    return this.mapDatabaseToCompany(data)
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { data, error } = await this.supabase
      .from("companies")
      .update({
        name: updates.name,
        variations: updates.variations,
        website: updates.website || null,
        industry: updates.industry || null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throw error

    return this.mapDatabaseToCompany(data)
  }

  async deleteCompany(id: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase.from("companies").delete().eq("id", id).eq("user_id", user.id)

    if (error) throw error
  }

  private mapDatabaseToCompany(dbCompany: DatabaseCompany): Company {
    return {
      id: dbCompany.id,
      userId: dbCompany.user_id,
      name: dbCompany.name,
      variations: dbCompany.variations,
      website: dbCompany.website || "",
      industry: dbCompany.industry || "",
      createdAt: dbCompany.created_at,
      updatedAt: dbCompany.updated_at,
    }
  }
}

// User Profile Management
export class UserProfileManager {
  private supabase = createClientComponentClient()

  async ensureProfileTableExists(): Promise<void> {
    try {
      console.log("UserProfileManager: Checking if user_profiles table exists...")
      
      // Try to query the table to see if it exists
      const { data, error } = await this.supabase
        .from("user_profiles")
        .select("count")
        .limit(1)
      
      if (error) {
        console.error("UserProfileManager: Table check error:", error)
        if (error.message.includes('relation "user_profiles" does not exist')) {
          throw new Error("The user_profiles table does not exist in the database. Please run the database migration.")
        }
        throw error
      }
      
      console.log("UserProfileManager: user_profiles table exists")
    } catch (error) {
      console.error("UserProfileManager: Error checking table:", error)
      throw error
    }
  }

  async getProfile(): Promise<DatabaseUserProfile | null> {
    try {
      await this.ensureProfileTableExists()
    } catch (error) {
      console.error("UserProfileManager: Table check failed:", error)
      throw error
    }
    
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await this.supabase.from("user_profiles").select("*").eq("id", user.id).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  }

  async createOrUpdateProfile(profile: Partial<DatabaseUserProfile>): Promise<DatabaseUserProfile> {
    try {
      console.log("UserProfileManager: Getting current user...")
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      
      if (!user) {
        console.error("UserProfileManager: No authenticated user found")
        throw new Error("User not authenticated")
      }
      
      console.log("UserProfileManager: User authenticated:", user.email)
      
      // Start with required fields only
      const profileData: any = {
        id: user.id,
        email: user.email!,
      }
      
      // Add optional fields only if they're provided
      if (profile.full_name !== undefined) {
        profileData.full_name = profile.full_name || user.user_metadata?.full_name || null
      }
      
      if (profile.avatar_url !== undefined) {
        profileData.avatar_url = profile.avatar_url || user.user_metadata?.avatar_url || null
      }
      
      if (profile.claude_api_key !== undefined) {
        profileData.claude_api_key = profile.claude_api_key || null
      }
      
      console.log("UserProfileManager: Upserting profile data...", profileData)
      const { data, error } = await this.supabase
        .from("user_profiles")
        .upsert(profileData)
        .select()
        .single()

      if (error) {
        console.error("UserProfileManager: Database error:", error)
        throw new Error(`Database error: ${error.message}`)
      }
      
      if (!data) {
        throw new Error("No data returned from profile upsert")
      }
      
      console.log("UserProfileManager: Profile upserted successfully")
      return data
    } catch (error) {
      console.error("UserProfileManager: Error in createOrUpdateProfile:", error)
      throw error
    }
  }

  async setClaudeAPIKey(apiKey: string): Promise<void> {
    try {
      await this.ensureProfileTableExists()
      
      console.log("UserProfileManager: Starting API key encryption...")
      const encryptedKey = encryption.encrypt(apiKey)
      
      if (!encryptedKey) {
        throw new Error("Failed to encrypt API key")
      }
      
      console.log("UserProfileManager: Getting current user...")
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }
      
      console.log("UserProfileManager: Updating API key directly...")
      
      // Try to update existing profile first
      const { data: updateData, error: updateError } = await this.supabase
        .from("user_profiles")
        .update({ claude_api_key: encryptedKey })
        .eq("id", user.id)
        .select()
        .single()
      
      if (updateError && updateError.code === "PGRST116") {
        // Profile doesn't exist, create minimal profile
        console.log("UserProfileManager: Creating new profile...")
        const { data: insertData, error: insertError } = await this.supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            email: user.email!,
            claude_api_key: encryptedKey,
          })
          .select()
          .single()
        
        if (insertError) {
          console.error("UserProfileManager: Insert error:", insertError)
          throw new Error(`Failed to create profile: ${insertError.message}`)
        }
        
        console.log("UserProfileManager: Profile created successfully")
      } else if (updateError) {
        console.error("UserProfileManager: Update error:", updateError)
        throw new Error(`Failed to update profile: ${updateError.message}`)
      } else {
        console.log("UserProfileManager: Profile updated successfully")
      }
    } catch (error) {
      console.error("UserProfileManager: Error in setClaudeAPIKey:", error)
      throw error
    }
  }

  async getClaudeAPIKey(): Promise<string | null> {
    const profile = await this.getProfile()
    if (!profile?.claude_api_key) return null

    try {
      return encryption.decrypt(profile.claude_api_key)
    } catch (error) {
      console.error("Failed to decrypt API key:", error)
      return null
    }
  }

  async clearClaudeAPIKey(): Promise<void> {
    await this.createOrUpdateProfile({ claude_api_key: null })
  }
}

// Bookmark Management
export class BookmarkManager {
  private supabase = createClientComponentClient()

  async getBookmarks(): Promise<Set<string>> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) return new Set()

    const { data, error } = await this.supabase.from("bookmarks").select("press_release_id").eq("user_id", user.id)

    if (error) throw error

    return new Set(data.map((b) => b.press_release_id))
  }

  async addBookmark(pressReleaseId: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase.from("bookmarks").insert({
      user_id: user.id,
      press_release_id: pressReleaseId,
    })

    if (error && error.code !== "23505") throw error // Ignore duplicate key errors
  }

  async removeBookmark(pressReleaseId: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("press_release_id", pressReleaseId)

    if (error) throw error
  }

  async toggleBookmark(pressReleaseId: string): Promise<boolean> {
    const bookmarks = await this.getBookmarks()
    const isBookmarked = bookmarks.has(pressReleaseId)

    if (isBookmarked) {
      await this.removeBookmark(pressReleaseId)
      return false
    } else {
      await this.addBookmark(pressReleaseId)
      return true
    }
  }

  async isBookmarked(pressReleaseId: string): Promise<boolean> {
    const bookmarks = await this.getBookmarks()
    return bookmarks.has(pressReleaseId)
  }

  async getBookmarkCount(): Promise<number> {
    const bookmarks = await this.getBookmarks()
    return bookmarks.size
  }

  async clearAll(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase.from("bookmarks").delete().eq("user_id", user.id)

    if (error) throw error
  }
}

// Read Status Management
export class ReadStatusManager {
  private supabase = createClientComponentClient()

  async getReadReleases(): Promise<Set<string>> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) return new Set()

    const { data, error } = await this.supabase.from("read_status").select("press_release_id").eq("user_id", user.id)

    if (error) throw error

    return new Set(data.map((r) => r.press_release_id))
  }

  async markAsRead(pressReleaseId: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase.from("read_status").insert({
      user_id: user.id,
      press_release_id: pressReleaseId,
    })

    if (error && error.code !== "23505") throw error // Ignore duplicate key errors
  }

  async markAsUnread(pressReleaseId: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase
      .from("read_status")
      .delete()
      .eq("user_id", user.id)
      .eq("press_release_id", pressReleaseId)

    if (error) throw error
  }

  async isRead(pressReleaseId: string): Promise<boolean> {
    const readReleases = await this.getReadReleases()
    return readReleases.has(pressReleaseId)
  }

  async getUnreadCount(releaseIds: string[]): Promise<number> {
    const readReleases = await this.getReadReleases()
    return releaseIds.filter((id) => !readReleases.has(id)).length
  }

  async clearAll(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase.from("read_status").delete().eq("user_id", user.id)

    if (error) throw error
  }
}

// RSS Source Management
export class RSSSourceManager {
  private supabase = createClientComponentClient()

  async getRSSSourcesByCompany(companyId: string): Promise<RSSSource[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { data, error } = await this.supabase
      .from("rss_sources")
      .select("*")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (error) throw error

    return data.map(this.mapDatabaseToRSSSource)
  }

  async getAllRSSSourcesByUser(): Promise<RSSSource[]> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { data, error } = await this.supabase
      .from("rss_sources")
      .select("*")
      .eq("user_id", user.id)
      .eq("enabled", true)
      .order("company_id", { ascending: true })

    if (error) throw error

    return data.map(this.mapDatabaseToRSSSource)
  }

  async createRSSSource(companyId: string, source: CreateRSSSource): Promise<RSSSource> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    // Validate the source data
    const validation = validateRSSSourceData({
      feedUrl: source.feedUrl,
      feedName: source.feedName,
      feedType: source.feedType,
    })

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const { data, error } = await this.supabase
      .from("rss_sources")
      .insert({
        company_id: companyId,
        user_id: user.id,
        feed_url: source.feedUrl,
        feed_name: source.feedName,
        feed_type: source.feedType,
        enabled: source.enabled ?? true,
      })
      .select()
      .single()

    if (error) throw error

    return this.mapDatabaseToRSSSource(data)
  }

  async updateRSSSource(id: string, updates: UpdateRSSSource): Promise<RSSSource> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    // If URL/name/type are being updated, validate them
    if (updates.feedUrl || updates.feedName || updates.feedType) {
      // Get current data to fill in missing validation fields
      const { data: currentData } = await this.supabase
        .from("rss_sources")
        .select("feed_url, feed_name, feed_type")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (currentData) {
        const validation = validateRSSSourceData({
          feedUrl: updates.feedUrl ?? currentData.feed_url,
          feedName: updates.feedName ?? currentData.feed_name,
          feedType: updates.feedType ?? currentData.feed_type,
        })

        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }
      }
    }

    const { data, error } = await this.supabase
      .from("rss_sources")
      .update({
        feed_url: updates.feedUrl,
        feed_name: updates.feedName,
        feed_type: updates.feedType,
        enabled: updates.enabled,
        last_fetched_at: updates.lastFetchedAt,
        last_error: updates.lastError,
        article_count: updates.articleCount,
        success_rate: updates.successRate,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throw error

    return this.mapDatabaseToRSSSource(data)
  }

  async deleteRSSSource(id: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase
      .from("rss_sources")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throw error
  }

  async testRSSFeed(feedUrl: string): Promise<RSSValidationResult> {
    // Use client-side validation for basic testing
    // For production, this should hit a server-side API endpoint
    return await testRSSConnectivity(feedUrl)
  }

  async updateFeedMetrics(id: string, metrics: {
    lastFetchedAt?: string
    lastError?: string
    articleCount?: number
    successRate?: number
  }): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    const { error } = await this.supabase
      .from("rss_sources")
      .update({
        last_fetched_at: metrics.lastFetchedAt,
        last_error: metrics.lastError,
        article_count: metrics.articleCount,
        success_rate: metrics.successRate,
      })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throw error
  }

  private mapDatabaseToRSSSource(dbSource: DatabaseRSSSource): RSSSource {
    return {
      id: dbSource.id,
      companyId: dbSource.company_id,
      userId: dbSource.user_id,
      feedUrl: dbSource.feed_url,
      feedName: dbSource.feed_name,
      feedType: dbSource.feed_type as RSSSource['feedType'],
      enabled: dbSource.enabled,
      createdAt: dbSource.created_at,
      updatedAt: dbSource.updated_at,
      lastFetchedAt: dbSource.last_fetched_at || undefined,
      lastError: dbSource.last_error || undefined,
      articleCount: dbSource.article_count,
      successRate: dbSource.success_rate,
    }
  }
}

// Export singleton instances
export const companyManager = new CompanyManager()
export const userProfileManager = new UserProfileManager()
export const bookmarkManager = new BookmarkManager()
export const readStatusManager = new ReadStatusManager()
export const rssSourceManager = new RSSSourceManager()
