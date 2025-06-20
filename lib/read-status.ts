class ReadStatusManager {
  private readonly STORAGE_KEY = "cignal-read-releases"

  /**
   * Get all read release IDs
   */
  getReadReleases(): Set<string> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return new Set()
      }
      const readIds: string[] = JSON.parse(stored)
      return new Set(readIds)
    } catch (error) {
      console.error("Error reading read status:", error)
      return new Set()
    }
  }

  /**
   * Mark a release as read
   */
  markAsRead(releaseId: string): void {
    try {
      const readReleases = this.getReadReleases()
      readReleases.add(releaseId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...readReleases]))
    } catch (error) {
      console.error("Error marking release as read:", error)
    }
  }

  /**
   * Mark a release as unread
   */
  markAsUnread(releaseId: string): void {
    try {
      const readReleases = this.getReadReleases()
      readReleases.delete(releaseId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...readReleases]))
    } catch (error) {
      console.error("Error marking release as unread:", error)
    }
  }

  /**
   * Check if a release is read
   */
  isRead(releaseId: string): boolean {
    const readReleases = this.getReadReleases()
    return readReleases.has(releaseId)
  }

  /**
   * Get count of unread releases from a list
   */
  getUnreadCount(releaseIds: string[]): number {
    const readReleases = this.getReadReleases()
    return releaseIds.filter((id) => !readReleases.has(id)).length
  }

  /**
   * Clear all read status
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.error("Error clearing read status:", error)
    }
  }
}

export const readStatusManager = new ReadStatusManager()
