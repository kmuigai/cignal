"use client"

import { useState, useEffect } from "react"
import { Header } from "./header"
import { ActivityFeed } from "./activity-feed"
import { PressReleaseDetail } from "./press-release-detail"
import { APIKeyWarningBanner } from "./api-key-warning-banner"
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
  const [hasAPIKey, setHasAPIKey] = useState(false)
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

  useEffect(() => {
    // Load read status and bookmarks
    setReadReleases(readStatusManager.getReadReleases())
    setBookmarkedReleases(bookmarkManager.getBookmarkedReleases())

    // Check API key status
    const checkAPIKey = async () => {
      const hasKey = await claudeAPIKeyManager.hasAPIKey()
      setHasAPIKey(hasKey)
    }
    checkAPIKey()
  }, [])

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
    // Clear API key on sign out for security
    claudeAPIKeyManager.clearAPIKey()
    onSignOut()
  }

  // Mobile back to feed handler
  const handleBackToFeed = () => {
    setMobileView('feed')
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
        {!hasAPIKey && <APIKeyWarningBanner onOpenSettings={() => setSettingsOpen(true)} />}
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
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
        {!hasAPIKey && <APIKeyWarningBanner onOpenSettings={() => setSettingsOpen(true)} />}
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-destructive">Error loading data: {companiesError || rssError}</p>
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

      {!hasAPIKey && <APIKeyWarningBanner onOpenSettings={() => setSettingsOpen(true)} />}

      {/* Responsive Layout Container */}
      <div className={`flex flex-col lg:flex-row ${!hasAPIKey ? "h-[calc(100vh-8rem)]" : "h-[calc(100vh-4rem)]"}`}>
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
      <CompanyManagementModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onAPIKeyChange={setHasAPIKey}
        onCompaniesChange={() => {
          // Force refresh press releases when companies change
          console.log("🔄 Companies changed - refreshing press releases")
          refresh()
        }}
      />
    </div>
  )
}
