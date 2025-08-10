"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { PressRelease, Company } from "@/lib/types"
import { formatRelativeTime } from "@/lib/date-utils"
import { RefreshCw } from "lucide-react"

const cleanHtmlTags = (text: string): string => {
  return text.replace(/<[^>]*>/g, "").trim()
}

interface ActivityFeedProps {
  releases: PressRelease[]
  companies: Company[]
  selectedCompany: string
  onCompanyChange: (company: string) => void
  selectedReleaseId?: string
  onReleaseSelect: (release: PressRelease) => void
  readReleases: Set<string>
  lastUpdated: number | null
  onRefresh: () => void
  refreshing: boolean
  isBackgroundRefreshing?: boolean
}

export function ActivityFeed({
  releases = [],
  companies = [],
  selectedCompany,
  onCompanyChange,
  selectedReleaseId,
  onReleaseSelect,
  readReleases = new Set(),
  lastUpdated,
  onRefresh,
  refreshing,
  isBackgroundRefreshing = false,
}: ActivityFeedProps) {
  // Safe array operations with null checks
  const safeCompanies = Array.isArray(companies) ? companies : []
  const safeReleases = Array.isArray(releases) ? releases : []
  const safeReadReleases = readReleases instanceof Set ? readReleases : new Set()

  // Add Fintech News as a special filter option
  const companyOptions = ["All", "Fintech News", ...safeCompanies.map((c) => c.name)]

  const formatLastUpdated = (timestamp: number | null) => {
    if (!timestamp) return "Never"

    const now = Date.now()
    const diffInMs = now - timestamp
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes === 1) return "1 minute ago"
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours === 1) return "1 hour ago"
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "1 day ago"
    return `${diffInDays} days ago`
  }

  // Show loading state if companies are still loading
  if (!companies && !Array.isArray(companies)) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background mobile-layout-fix">
      {/* Filter Tabs */}
      <div className="p-4 sm:p-4 border-b border-border relative">
        {/* Background refresh indicator */}
        {isBackgroundRefreshing && (
          <div className="absolute top-2 right-2 z-10">
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground opacity-50" />
          </div>
        )}
        
        {/* Company Filter Buttons - Responsive mobile-optimized tags */}
        <div className="mb-3">
          <ScrollArea className="w-full">
            <div className="flex gap-1 xs:gap-1.5 sm:gap-2 pb-2 min-w-max">
              {companyOptions.map((company) => (
                <Button
                  key={company}
                  variant={selectedCompany === company ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCompanyChange(company)}
                  className={cn(
                    // Responsive text sizing - smaller on mobile, larger on desktop
                    "text-[10px] xs:text-[11px] sm:text-xs",
                    // Responsive padding - tighter on mobile
                    "px-1.5 xs:px-2 sm:px-3",
                    // Responsive height while maintaining touch targets
                    "h-8 sm:h-9",
                    // Core styling
                    "shrink-0 min-w-fit font-medium",
                    // Mobile touch optimization
                    "mobile-touch-target touch-manipulation",
                    // Ensure readability with proper contrast
                    "transition-all duration-200"
                  )}
                >
                  {company}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Last Updated and Refresh */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">Last updated: {formatLastUpdated(lastUpdated)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-6 w-6 p-0 shrink-0 ml-2 mobile-touch-target"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Press Release List */}
      <ScrollArea className="flex-1">
        <div className="p-4 sm:p-4 space-y-4 mobile-container-fix">
          {safeReleases.map((release) => {
            const company = safeCompanies.find((c) => c.id === release.companyId)
            const isSelected = selectedReleaseId === release.id
            const isUnread = !safeReadReleases.has(release.id)

            return (
              <div
                key={release.id}
                className={cn(
                  "mobile-press-release-card",
                  isSelected && "bg-accent border-accent-foreground/20 shadow-sm",
                )}
                onClick={() => onReleaseSelect(release)}
              >
                {/* Mobile-optimized header with improved spacing */}
                <div className="mobile-press-release-header">
                  {/* Left side - Badge and unread indicator */}
                  <div className="mobile-badge-container mobile-force-visible">
                    <Badge 
                      variant="secondary" 
                      className="mobile-optimized-badge"
                      title={company?.name || "Unknown Company"} // Accessibility tooltip
                    >
                      {company?.name || "Unknown Company"}
                    </Badge>
                    {isUnread && (
                      <div className="w-2 h-2 bg-primary rounded-full shrink-0 animate-pulse mobile-force-visible"></div>
                    )}
                  </div>
                  
                  {/* Right side - Timestamp */}
                  <span className="mobile-timestamp">
                    {formatRelativeTime(release.publishedAt)}
                  </span>
                </div>

                {/* Title with improved mobile spacing */}
                <h3 className="font-medium text-sm mb-3 line-clamp-2 leading-relaxed text-foreground">
                  {release.title}
                </h3>

                {/* Summary with improved mobile readability */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {cleanHtmlTags(release.summary)}
                </p>
              </div>
            )
          })}

          {safeReleases.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm mb-2">No press releases found</p>
              <p className="text-xs">Try adjusting your company filters or refresh the data</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
