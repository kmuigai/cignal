"use client"

import type { PressRelease, Company } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bookmark, BookmarkPlus, ExternalLink, Loader2, ArrowLeft } from "lucide-react"
import { useContentExtraction } from "@/hooks/use-content-extraction"
import { useAIAnalysis } from "@/hooks/use-ai-analysis"
import { AIAnalysisSection } from "./ai-analysis-section"

interface PressReleaseDetailProps {
  release: PressRelease
  company?: Company
  isBookmarked: boolean
  onToggleBookmark: () => void
  onBackToFeed?: () => void
  showBackButton?: boolean
}

export function PressReleaseDetail({ release, company, isBookmarked, onToggleBookmark, onBackToFeed, showBackButton }: PressReleaseDetailProps) {
  // Extract full content from the source URL
  const { data: extractionResult, loading: extractionLoading } = useContentExtraction(release.sourceUrl)

  // Determine which content to display
  const getDisplayContent = () => {
    if (extractionLoading) {
      return null // Will show loading spinner
    }

    if (extractionResult?.success && extractionResult.content) {
      return extractionResult.content
    }

    // Fallback to RSS summary/content
    return release.content
  }

  const displayContent = getDisplayContent()

  // Get AI analysis for the content
  const {
    analysis,
    loading: aiLoading,
    error: aiError,
    retry: retryAnalysis,
    fromCache,
    cacheAge,
  } = useAIAnalysis(release.title, displayContent || release.content)

  // Add this helper function at the top of the component
  const cleanHtmlTags = (text: string): string => {
    // Remove HTML tags but preserve the content
    return text.replace(/<[^>]*>/g, "").trim()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderHighlightedContent = (content: string, highlights: any[]) => {
    // First, clean HTML tags and normalize line breaks
    const cleanContent = cleanHtmlTags(content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim())

    // Use AI-generated highlights if available, otherwise fall back to mock highlights
    const highlightsToUse =
      analysis?.highlights && analysis.highlights.length > 0 ? analysis.highlights : highlights || []

    if (!highlightsToUse || highlightsToUse.length === 0) {
      return <div className="prose prose-sm max-w-none dark:prose-invert">{formatContentWithBreaks(cleanContent)}</div>
    }

    // Sort highlights by start position
    const sortedHighlights = [...highlightsToUse].sort((a, b) => a.start - b.start)

    let lastIndex = 0
    const elements: any[] = []

    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        const textBefore = cleanContent.slice(lastIndex, highlight.start)
        elements.push(<span key={`text-${index}`}>{formatContentWithBreaks(textBefore)}</span>)
      }

      // Add highlighted text with improved styling for dark mode
      const highlightClasses = {
        financial: "bg-blue-100/70 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-1 py-0.5 rounded",
        opportunity: "bg-green-100/70 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-1 py-0.5 rounded",
        risk: "bg-red-100/70 dark:bg-red-900/30 text-red-900 dark:text-red-100 px-1 py-0.5 rounded",
        strategic: "bg-yellow-100/70 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 px-1 py-0.5 rounded",
      }
      const highlightClass = (highlightClasses as any)[highlight.type] || "bg-muted/70 px-1 py-0.5 rounded"

      elements.push(
        <span key={`highlight-${index}`} className={highlightClass}>
          {highlight.text}
        </span>,
      )

      lastIndex = highlight.end
    })

    // Add remaining text
    if (lastIndex < cleanContent.length) {
      const remainingText = cleanContent.slice(lastIndex)
      elements.push(<span key="text-end">{formatContentWithBreaks(remainingText)}</span>)
    }

    return <div className="prose prose-sm max-w-none dark:prose-invert">{elements}</div>
  }

  const formatContentWithBreaks = (text: string) => {
    if (!text) return null

    // Clean HTML tags first
    const cleanText = cleanHtmlTags(text)

    // Split by double line breaks to create paragraphs
    const paragraphs = cleanText.split(/\n\s*\n/)

    return paragraphs
      .map((paragraph, index) => {
        if (!paragraph.trim()) return null

        // Split by single line breaks within paragraphs
        const lines = paragraph.split("\n")

        return (
          <p key={index} className="mb-4 last:mb-0">
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line.trim()}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })
      .filter(Boolean)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Fixed */}
      <div className="shrink-0 p-6 border-b border-border bg-background">
        {/* Mobile Back Button */}
        {showBackButton && onBackToFeed && (
          <div className="mb-4 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToFeed}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
          </div>
        )}
        
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{company?.name}</Badge>
            <span className="text-sm text-muted-foreground">{formatDate(release.publishedAt)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleBookmark}
            className="text-muted-foreground hover:text-foreground"
          >
            {isBookmarked ? <Bookmark className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />}
          </Button>
        </div>

        <h1 className="text-xl font-semibold mb-4">{release.title}</h1>

        {/* AI Summary - Now powered by real Claude analysis */}
        <AIAnalysisSection
          analysis={analysis}
          loading={aiLoading}
          error={aiError}
          onRetry={retryAnalysis}
          fromCache={fromCache}
          cacheAge={cacheAge}
        />

        {/* Source Link */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Source:</span>
          <a
            href={release.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 flex items-center gap-1"
          >
            PR Newswire
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-6">
          {extractionLoading ? (
            // Loading state
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading full content...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Content status indicator */}
              {extractionResult && !extractionResult.success && (
                <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Full content unavailable.</strong> Showing RSS summary as fallback.
                  </p>
                </div>
              )}

              {/* Main Content with AI-powered highlighting */}
              {displayContent && (
                <div className="prose prose-gray prose-sm max-w-none dark:prose-invert">
                  <div className="text-foreground leading-relaxed space-y-4">
                    {renderHighlightedContent(displayContent, release.highlights || [])}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend - Fixed */}
      <div className="shrink-0 p-4 border-t border-border bg-muted/30">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/50 rounded"></div>
            <span>Financial Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 rounded"></div>
            <span>Opportunities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 dark:bg-red-900/50 rounded"></div>
            <span>Risks/Threats</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/50 rounded"></div>
            <span>Strategic Moves</span>
          </div>
        </div>
      </div>
    </div>
  )
}
