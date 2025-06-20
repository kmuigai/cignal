"use client"

import { useState, useEffect } from "react"
import { readStatusManager } from "@/lib/supabase/database"

export function useReadStatus() {
  const [readReleases, setReadReleases] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await readStatusManager.getReadReleases()
      setReadReleases(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load read status")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (pressReleaseId: string) => {
    try {
      await readStatusManager.markAsRead(pressReleaseId)
      setReadReleases((prev) => new Set([...prev, pressReleaseId]))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as read")
      throw err
    }
  }

  const markAsUnread = async (pressReleaseId: string) => {
    try {
      await readStatusManager.markAsUnread(pressReleaseId)
      setReadReleases((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pressReleaseId)
        return newSet
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as unread")
      throw err
    }
  }

  const isRead = (pressReleaseId: string) => {
    return readReleases.has(pressReleaseId)
  }

  const getUnreadCount = (releaseIds: string[]) => {
    return releaseIds.filter((id) => !readReleases.has(id)).length
  }

  const clearAllReadStatus = async () => {
    try {
      await readStatusManager.clearAll()
      setReadReleases(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear read status")
      throw err
    }
  }

  useEffect(() => {
    loadReadStatus()
  }, [])

  return {
    readReleases,
    loading,
    error,
    markAsRead,
    markAsUnread,
    isRead,
    getUnreadCount,
    clearAllReadStatus,
    refetch: loadReadStatus,
  }
}
