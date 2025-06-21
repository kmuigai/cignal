"use client"

import { useState, useEffect } from "react"

const STORAGE_KEY = "cignal-ai-summary-collapsed"

export function useSummaryCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setIsCollapsed(JSON.parse(stored))
      }
    } catch (error) {
      console.warn("Failed to load summary collapse state:", error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
      } catch (error) {
        console.warn("Failed to save summary collapse state:", error)
      }
    }
  }, [isCollapsed, isLoaded])

  const toggle = () => {
    setIsCollapsed(!isCollapsed)
  }

  return {
    isCollapsed,
    toggle,
    isLoaded,
  }
} 