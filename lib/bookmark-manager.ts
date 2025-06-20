class BookmarkManager {
  private readonly STORAGE_KEY = "cignal-bookmarks"

  /**
   * Get all bookmarked release IDs
   */
  getBookmarkedReleases(): Set<string> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return new Set()
      }
      const bookmarkedIds: string[] = JSON.parse(stored)
      return new Set(bookmarkedIds)
    } catch (error) {
      console.error("Error reading bookmarks:", error)
      return new Set()
    }
  }

  /**
   * Add a release to bookmarks
   */
  addBookmark(releaseId: string): void {
    try {
      const bookmarks = this.getBookmarkedReleases()
      bookmarks.add(releaseId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...bookmarks]))
    } catch (error) {
      console.error("Error adding bookmark:", error)
    }
  }

  /**
   * Remove a release from bookmarks
   */
  removeBookmark(releaseId: string): void {
    try {
      const bookmarks = this.getBookmarkedReleases()
      bookmarks.delete(releaseId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...bookmarks]))
    } catch (error) {
      console.error("Error removing bookmark:", error)
    }
  }

  /**
   * Toggle bookmark status
   */
  toggleBookmark(releaseId: string): boolean {
    const isBookmarked = this.isBookmarked(releaseId)
    if (isBookmarked) {
      this.removeBookmark(releaseId)
      return false
    } else {
      this.addBookmark(releaseId)
      return true
    }
  }

  /**
   * Check if a release is bookmarked
   */
  isBookmarked(releaseId: string): boolean {
    const bookmarks = this.getBookmarkedReleases()
    return bookmarks.has(releaseId)
  }

  /**
   * Get count of bookmarked releases
   */
  getBookmarkCount(): number {
    return this.getBookmarkedReleases().size
  }

  /**
   * Clear all bookmarks
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.error("Error clearing bookmarks:", error)
    }
  }
}

export const bookmarkManager = new BookmarkManager()
