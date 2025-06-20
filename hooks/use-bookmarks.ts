"use client"

import { useState, useEffect } from "react"
import { bookmarkManager } from "@/lib/supabase/database"

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBookmarks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await bookmarkManager.getBookmarks()
      setBookmarks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks")
    } finally {
      setLoading(false)
    }
  }

  const toggleBookmark = async (pressReleaseId: string) => {
    try {
      const isBookmarked = await bookmarkManager.toggleBookmark(pressReleaseId)
      setBookmarks((prev) => {
        const newBookmarksSet = new Set(prev)
        if (isBookmarked) {
          newBookmarksSet.add(pressReleaseId)
        } else {
          newBookmarksSet.delete(pressReleaseId)
        }
        return newBookmarksSet
      })
      return isBookmarked
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle bookmark")
      throw err
    }
  }

  const isBookmarked = (pressReleaseId: string) => {
    return bookmarks.has(pressReleaseId)
  }

  const getBookmarkCount = () => {
    return bookmarks.size
  }

  const clearAllBookmarks = async () => {
    try {
      await bookmarkManager.clearAll()
      setBookmarks(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear bookmarks")
      throw err
    }
  }

  useEffect(() => {
    loadBookmarks()
  }, [])

  return {
    bookmarks,
    loading,
    error,
    toggleBookmark,
    isBookmarked,
    getBookmarkCount,
    clearAllBookmarks,
    refetch: loadBookmarks,
  }
}
