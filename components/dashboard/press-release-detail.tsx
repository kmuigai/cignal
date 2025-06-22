"use client"

import type { PressRelease, Company } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bookmark, BookmarkPlus, ExternalLink, Loader2, ArrowLeft } from "lucide-react"
import { useContentExtraction, getBestContent } from "@/hooks/use-content-extraction"
import { useAIAnalysis } from "@/hooks/use-ai-analysis"
import { useAISummaryCollapse } from "@/hooks/use-ai-summary-collapse"
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



  // AI Summary collapse state management (desktop-only)
  const { isCollapsed, toggle: toggleAICollapse, isLoaded: aiCollapseLoaded } = useAISummaryCollapse()

  // Get the best available content (HTML or text)
  const contentInfo = getBestContent(extractionResult)

  // Determine which content to display for AI analysis (always use text for AI)
  const getTextForAI = (): string => {
    if (extractionLoading) {
      return release.content // Use fallback while loading
    }

    if (extractionResult?.success) {
      // Prefer text content for AI, fallback to stripped HTML
      if (extractionResult.textContent) {
        return extractionResult.textContent
      }
      if (extractionResult.htmlContent) {
        return stripHtmlTags(extractionResult.htmlContent)
      }
      if (extractionResult.content) {
        return stripHtmlTags(extractionResult.content)
      }
    }

    // Final fallback to RSS content
    return release.content
  }

  // Get AI analysis for the content
  const {
    analysis,
    loading: aiLoading,
    error: aiError,
    retry: retryAnalysis,
    fromCache,
    cacheAge,
  } = useAIAnalysis(release.title, getTextForAI())

  // Helper function to strip HTML tags for AI analysis
  const stripHtmlTags = (html: string): string => {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
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

  // New HTML-based content rendering
  const renderContent = () => {
    if (extractionLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Loading full article...</span>
        </div>
      )
    }



    if (!contentInfo.hasContent) {
      // Fallback to RSS content as text
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderTextContent(release.content)}
        </div>
      )
    }

    if (contentInfo.isHTML) {
      // Render HTML content with highlighting
      return renderHTMLContent(contentInfo.content)
    } else {
      // Render text content with basic formatting
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderTextContent(contentInfo.content)}
        </div>
      )
    }
  }

  // Render HTML content safely
  const renderHTMLContent = (htmlContent: string) => {
    // Apply AI highlights to HTML if available
    let processedHTML = htmlContent

    if (analysis?.highlights && analysis.highlights.length > 0) {
      processedHTML = applyHighlightsToHTML(htmlContent, analysis.highlights)
    }

    return (
      <div 
        className="prose prose-sm max-w-none dark:prose-invert article-content"
        dangerouslySetInnerHTML={{ __html: processedHTML }}
      />
    )
  }

  // Apply highlights to HTML content
  const applyHighlightsToHTML = (html: string, highlights: any[]): string => {
    let highlighted = html

    // Apply financial highlights
    highlighted = highlighted.replace(
      /(\$[\d,]+(?:\.\d{2})?\s*(?:million|billion|trillion|thousand)?)/gi,
      '<mark class="highlight-financial">$1</mark>'
    )

    // Apply percentage highlights
    highlighted = highlighted.replace(
      /(\d+(?:\.\d+)?%\s*(?:growth|increase|rise|up|down|decline|decrease))/gi,
      '<mark class="highlight-percentage">$1</mark>'
    )

    return highlighted
  }

  // Render text content with basic paragraph formatting
  const renderTextContent = (textContent: string) => {
    if (!textContent) return null

    const paragraphs = textContent.split(/\n\s*\n/).filter(p => p.trim().length > 0)

    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim()
      
      // Check for headings (all caps or ends with colon)
      if (trimmed.length < 100 && (trimmed === trimmed.toUpperCase() || trimmed.endsWith(':'))) {
        return (
          <h3 key={index} className="font-semibold text-lg mb-3 mt-6 first:mt-0">
            {trimmed}
          </h3>
        )
      }

      // Regular paragraph
      return (
        <p key={index} className="mb-4 last:mb-0">
          {trimmed}
        </p>
      )
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none border-b bg-background px-4 py-1 sm:px-6 sm:py-2">
        <div className="flex items-center justify-between mb-2">
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={onBackToFeed} className="lg:hidden">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleBookmark}
              className="text-muted-foreground hover:text-foreground"
            >
              {isBookmarked ? (
                <Bookmark className="h-4 w-4 fill-current" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(release.sourceUrl, "_blank")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            {company && (
              <Badge variant="secondary" className="flex-none">
                {company.name}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground flex-none">
              {formatDate(release.publishedAt)}
            </span>
          </div>
          
          <h1 className="text-xl font-semibold leading-tight">{release.title}</h1>
          
          {/* AI Analysis Section - Moved to top with desktop collapse functionality */}
          <div className={`${!isCollapsed ? 'border-t pt-2' : 'pt-1'}`}>
            <AIAnalysisSection
              analysis={analysis}
              loading={aiLoading}
              error={aiError}
              onRetry={retryAnalysis}
              fromCache={fromCache}
              cacheAge={cacheAge}
              isCollapsed={isCollapsed}
              onToggleCollapse={toggleAICollapse}
              showCollapseControls={aiCollapseLoaded}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 pt-2 pb-4 sm:px-6 sm:pt-3 sm:pb-6 space-y-3 sm:space-y-4">
          {/* Main article content */}
          <div className="space-y-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
