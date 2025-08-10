"use client"

import { useState, useEffect } from "react"
import { Header } from "./header"
import { ActivityFeed } from "./activity-feed"
import { PressReleaseDetail } from "./press-release-detail"
import { APIKeyBannerWrapper } from "./api-key-warning-banner"
import type { PressRelease } from "@/lib/types"
import { CompanyManagementModal } from "./company-management-modal"
import { useEnhancedPressReleases } from "@/hooks/use-enhanced-press-releases"
import { convertRSSItemToPressRelease } from "@/lib/rss-to-press-release"
import { readStatusManager } from "@/lib/read-status"
import { bookmarkManager } from "@/lib/bookmark-manager"
import { claudeAPIKeyManager } from "@/lib/claude-api-key"
import { useCompanies } from "@/hooks/use-companies"

interface DashboardProps {
  user: any
  onSignOut: () => void
}

export function Dashboard({ user, onSignOut }: DashboardProps) {
  const [selectedRelease, setSelectedRelease] = useState<PressRelease | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<string>("All")
  const [readReleases, setReadReleases] = useState<Set<string>>(new Set())
  const [bookmarkedReleases, setBookmarkedReleases] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  // Tri-state API key management: null = loading, true = has key, false = no key
  const [hasAPIKey, setHasAPIKey] = useState<boolean | null>(null)
  const [apiKeyCheckError, setApiKeyCheckError] = useState<string | null>(null)
  
  // Mobile state management
  const [mobileView, setMobileView] = useState<'feed' | 'detail'>('feed')

  // Use the companies hook with proper error handling
  const { companies, loading: companiesLoading, error: companiesError } = useCompanies()

  // Use the enhanced hook with caching - pass safe companies array
  const {
    data: rssData,
    loading: rssLoading,
    error: rssError,
    lastUpdated,
    refresh,
  } = useEnhancedPressReleases(Array.isArray(companies) ? companies : [])

  // Optimized API key check with caching and error handling
  useEffect(() => {
    const checkAPIKeyStatus = async () => {
      try {
        // First check if we have a cached result
        const cachedResult = claudeAPIKeyManager.getCachedAPIKeyStatus()
        if (cachedResult !== null) {
          setHasAPIKey(cachedResult)
          setApiKeyCheckError(null)
          return
        }

        // No cache available, perform async check
        const hasKey = await claudeAPIKeyManager.hasAPIKey()
        setHasAPIKey(hasKey)
        setApiKeyCheckError(null)
      } catch (error) {
        console.error("Error checking API key status:", error)
        setApiKeyCheckError(error instanceof Error ? error.message : "Failed to check API key")
        // On error, assume no API key to be safe
        setHasAPIKey(false)
      }
    }

    // Load read status and bookmarks
    setReadReleases(readStatusManager.getReadReleases())
    setBookmarkedReleases(bookmarkManager.getBookmarkedReleases())

    // Check API key status immediately
    checkAPIKeyStatus()
  }, [])

  // Handle API key changes from settings
  const handleAPIKeyChange = (newHasAPIKey: boolean) => {
    setHasAPIKey(newHasAPIKey)
    setApiKeyCheckError(null)
  }

  // Convert enhanced items to PressRelease format with safe array handling
  const pressReleases: PressRelease[] =
    rssData?.items?.map((item, index) => {
      // Enhanced hook already returns items in the right format, just need to convert to PressRelease
      const matchedCompany = Array.isArray(companies) ? companies.find((c) => c.name === item.matchedCompany) : null
      const companyId = matchedCompany?.id || item.companyId || "unknown"

      return {
        id: item.id,
        title: item.title,
        content: item.content,
        summary: item.summary,
        sourceUrl: item.sourceUrl,
        publishedAt: item.publishedAt,
        companyId: companyId,
        // Preserve fintech detection fields
        isFintech: item.isFintech,
        fintechCategories: item.fintechCategories,
        fintechRelevanceScore: item.fintechRelevanceScore,
        createdAt: item.createdAt
      }
    }) || []

  // Set first release as selected when data loads
  useEffect(() => {
    if (pressReleases.length > 0 && !selectedRelease) {
      setSelectedRelease(pressReleases[0])
    }
  }, [pressReleases, selectedRelease])

  const filteredReleases =
    selectedCompany === "All"
      ? pressReleases
      : selectedCompany === "Fintech News"
      ? pressReleases
          .filter((release) => release.isFintech === true)
          .sort((a, b) => {
            // Sort by fintech relevance score (higher scores first)
            const scoreA = a.fintechRelevanceScore || 0
            const scoreB = b.fintechRelevanceScore || 0
            if (scoreA !== scoreB) {
              return scoreB - scoreA
            }
            // If scores are equal, sort by date (newest first)
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          })
      : pressReleases.filter((release) => {
          const company = Array.isArray(companies) ? companies.find((c) => c.id === release.companyId) : null
          return company?.name === selectedCompany
        })

  const handleReleaseSelect = (release: PressRelease) => {
    setSelectedRelease(release)
    // Switch to detail view on mobile when a release is selected
    setMobileView('detail')

    // Mark as read
    if (!readReleases.has(release.id)) {
      readStatusManager.markAsRead(release.id)
      setReadReleases(readStatusManager.getReadReleases())
    }
  }

  const toggleBookmark = (releaseId: string) => {
    const newBookmarkState = bookmarkManager.toggleBookmark(releaseId)
    setBookmarkedReleases(bookmarkManager.getBookmarkedReleases())
    return newBookmarkState
  }

  const handleSignOut = () => {
    // Clear API key and cache on sign out for security
    claudeAPIKeyManager.invalidateCache()
    onSignOut()
  }

  // Mobile back to feed handler
  const handleBackToFeed = () => {
    setMobileView('feed')
  }

  // Calculate layout height considering banner state
  const getLayoutHeight = () => {
    if (hasAPIKey === null) {
      // Loading state - reserve space for potential banner
      return "h-[calc(100vh-8rem)]"
    } else if (hasAPIKey === false) {
      // No API key - banner is shown
      return "h-[calc(100vh-8rem)]"
    } else {
      // Has API key - no banner
      return "h-[calc(100vh-4rem)]"
    }
  }

  // Show loading state while companies are loading
  if (companiesLoading || rssLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          user={user}
          onSignOut={handleSignOut}
          onOpenSettings={() => setSettingsOpen(true)}
          bookmarkCount={bookmarkedReleases.size}
        />
        <APIKeyBannerWrapper 
          hasAPIKey={hasAPIKey} 
          onOpenSettings={() => setSettingsOpen(true)} 
        />
        <div className={`flex ${getLayoutHeight()} items-center justify-center`}>
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if there's an error loading companies
  if (companiesError || rssError) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          user={user}
          onSignOut={handleSignOut}
          onOpenSettings={() => setSettingsOpen(true)}
          bookmarkCount={bookmarkedReleases.size}
        />
        <APIKeyBannerWrapper 
          hasAPIKey={hasAPIKey} 
          onOpenSettings={() => setSettingsOpen(true)} 
        />
        <div className={`flex ${getLayoutHeight()} items-center justify-center`}>
          <div className="text-center space-y-4">
            <p className="text-destructive">Error loading data: {companiesError || rssError}</p>
            {apiKeyCheckError && (
              <p className="text-sm text-muted-foreground">API Key check error: {apiKeyCheckError}</p>
            )}
            <button
              onClick={refresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setSettingsOpen(true)}
        bookmarkCount={bookmarkedReleases.size}
      />

      <APIKeyBannerWrapper 
        hasAPIKey={hasAPIKey} 
        onOpenSettings={() => setSettingsOpen(true)} 
      />

      {/* Responsive Layout Container */}
      <div className={`flex flex-col lg:flex-row ${getLayoutHeight()}`}>
        {/* Left Panel - Activity Feed */}
        <div className={`
          w-full lg:w-2/5 
          ${mobileView === 'feed' ? 'flex' : 'hidden'} lg:flex 
          border-r-0 lg:border-r border-border flex-col
        `}>
          <ActivityFeed
            releases={filteredReleases}
            companies={companies} // Now guaranteed to be an array
            selectedCompany={selectedCompany}
            onCompanyChange={setSelectedCompany}
            selectedReleaseId={selectedRelease?.id}
            onReleaseSelect={handleReleaseSelect}
            readReleases={readReleases}
            lastUpdated={lastUpdated}
            onRefresh={refresh}
            refreshing={rssLoading}
          />
        </div>

        {/* Right Panel - Press Release Detail */}
        <div className={`
          w-full lg:w-3/5 
          ${mobileView === 'detail' ? 'flex' : 'hidden'} lg:flex 
          flex-col
        `}>
          {selectedRelease ? (
            <PressReleaseDetail
              release={selectedRelease}
              company={Array.isArray(companies) ? companies.find((c) => c.id === selectedRelease.companyId) : undefined}
              isBookmarked={bookmarkedReleases.has(selectedRelease.id)}
              onToggleBookmark={() => toggleBookmark(selectedRelease.id)}
              onBackToFeed={handleBackToFeed}
              showBackButton={true}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a press release to view details
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <CompanyManagementModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onAPIKeyChange={handleAPIKeyChange}
        onCompaniesChange={() => {
          // Force refresh press releases when companies change
          console.log("🔄 Companies changed - refreshing press releases")
          refresh()
        }}
      />
    </div>
  )
}
