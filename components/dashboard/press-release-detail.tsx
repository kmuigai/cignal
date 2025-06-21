"use client"

import type { PressRelease, Company } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bookmark, BookmarkPlus, ExternalLink, Loader2, ArrowLeft } from "lucide-react"
import { useContentExtraction } from "@/hooks/use-content-extraction"
import { useAIAnalysis } from "@/hooks/use-ai-analysis"
import { useSummaryCollapse } from "@/hooks/use-summary-collapse"
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

  // Summary collapse state management
  const { isCollapsed, toggle: toggleCollapse, isLoaded: collapseStateLoaded } = useSummaryCollapse()

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

    // Enhanced paragraph processing
    const processedContent = processTextStructure(cleanText)

    return processedContent
      .map((paragraph, index) => {
        if (!paragraph.trim()) return null

        // Handle different types of content
        if (isListItem(paragraph)) {
          return (
            <div key={index} className="mb-2">
              {formatListItem(paragraph)}
            </div>
          )
        }

        if (isQuoteText(paragraph)) {
          return (
            <blockquote key={index} className="border-l-4 border-muted pl-4 mb-4 italic text-muted-foreground">
              {formatParagraphLines(paragraph)}
            </blockquote>
          )
        }

        if (isHeadingText(paragraph)) {
          return (
            <h3 key={index} className="font-semibold text-lg mb-3 mt-6 first:mt-0">
              {formatParagraphLines(paragraph)}
            </h3>
          )
        }

        // Regular paragraph
        return (
          <p key={index} className="mb-4 last:mb-0">
            {formatParagraphLines(paragraph)}
          </p>
        )
      })
      .filter(Boolean)
  }

  /**
   * Process text structure to create well-formed paragraphs
   */
  const processTextStructure = (text: string): string[] => {
    // Split by double line breaks first
    let paragraphs = text.split(/\n\s*\n/)

    // Process each paragraph
    paragraphs = paragraphs.map(paragraph => paragraph.trim()).filter(p => p.length > 0)

    // Merge very short paragraphs with subsequent ones (unless they're special elements)
    const processedParagraphs = []
    for (let i = 0; i < paragraphs.length; i++) {
      const current = paragraphs[i]
      const next = paragraphs[i + 1]

      // If current paragraph is very short and not a special element
      if (current.length < 60 && next && !isSpecialElement(current) && !isSpecialElement(next)) {
        // Check if they should be merged based on content
        if (shouldMergeParagraphs(current, next)) {
          processedParagraphs.push(current + " " + next)
          i++ // Skip next paragraph
          continue
        }
      }

      // Split very long paragraphs at natural boundaries
      if (current.length > 800) {
        const splitParas = splitLongParagraphByContent(current)
        processedParagraphs.push(...splitParas)
      } else {
        processedParagraphs.push(current)
      }
    }

    return processedParagraphs
  }

  /**
   * Check if two paragraphs should be merged
   */
  const shouldMergeParagraphs = (current: string, next: string): boolean => {
    // Don't merge if either starts with typical paragraph indicators
    const paragraphStarters = /^(However|Therefore|Moreover|Furthermore|Additionally|In addition|For example|For instance|Meanwhile|Subsequently)/i
    if (paragraphStarters.test(next)) return false

    // Don't merge if current ends with typical paragraph enders
    if (current.endsWith(':') || current.endsWith('--')) return false

    // Don't merge if next starts with a quote or date
    if (next.startsWith('"') || /^\w+,\s+\w+\s+\d+/.test(next)) return false

    return true
  }

  /**
   * Split long paragraphs at natural sentence boundaries
   */
  const splitLongParagraphByContent = (paragraph: string): string[] => {
    // Split into sentences
    const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z])/)
    if (sentences.length < 3) return [paragraph]

    const chunks = []
    let currentChunk = ""

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 400 && currentChunk.length > 100) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks.length > 1 ? chunks : [paragraph]
  }

  /**
   * Check if text is a special element that shouldn't be merged
   */
  const isSpecialElement = (text: string): boolean => {
    return isListItem(text) || isQuoteText(text) || isHeadingText(text) || isDateLine(text)
  }

  /**
   * Check if text is a list item
   */
  const isListItem = (text: string): boolean => {
    const trimmed = text.trim()
    return trimmed.startsWith("•") || 
           trimmed.startsWith("*") || 
           /^\d+\./.test(trimmed) ||
           /^[a-zA-Z]\./.test(trimmed)
  }

  /**
   * Check if text is quoted content
   */
  const isQuoteText = (text: string): boolean => {
    const trimmed = text.trim()
    return (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
           (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
           trimmed.startsWith("> ")
  }

  /**
   * Check if text is a heading
   */
  const isHeadingText = (text: string): boolean => {
    const trimmed = text.trim()
    
    // Short text that ends with colon (likely a section header)
    if (trimmed.length < 100 && trimmed.endsWith(":")) return true
    
    // All caps text (likely emphasis/header)
    if (trimmed === trimmed.toUpperCase() && trimmed.length < 150 && trimmed.length > 5) return true
    
    // Text with markdown-style emphasis
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) return true
    
    return false
  }

  /**
   * Check if text is a dateline
   */
  const isDateLine = (text: string): boolean => {
    const trimmed = text.trim()
    // Look for city/date patterns like "NEW YORK, March 15, 2024"
    return /^[A-Z]{2,}[^,]*,\s*\w+\s+\d+,\s*\d{4}/.test(trimmed)
  }

  /**
   * Format individual paragraph lines with proper line breaks
   */
  const formatParagraphLines = (paragraph: string) => {
    // Split by single line breaks within paragraphs
    const lines = paragraph.split("\n")

    return lines.map((line, lineIndex) => (
      <span key={lineIndex}>
        {line.trim()}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    ))
  }

  /**
   * Format list items with proper styling
   */
  const formatListItem = (item: string) => {
    const trimmed = item.trim()
    
    if (trimmed.startsWith("•") || trimmed.startsWith("*")) {
      return (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground mt-1">•</span>
          <span>{trimmed.substring(1).trim()}</span>
        </div>
      )
    }
    
    if (/^\d+\./.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s*(.*)/)
      if (match) {
        return (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground font-medium">{match[1]}.</span>
            <span>{match[2]}</span>
          </div>
        )
      }
    }
    
    // Fallback for other list formats
    return <span>{trimmed}</span>
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile Layout - Original design */}
      <div className="lg:hidden flex flex-col h-full">
        {/* Header - Fixed */}
        <div className="shrink-0 p-6 border-b border-border bg-background">
          {/* Mobile Back Button */}
          {showBackButton && onBackToFeed && (
            <div className="mb-4">
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

          {/* AI Summary - Mobile (original behavior) */}
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

        {/* Content - Mobile scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6">
            {extractionLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading full content...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {extractionResult && !extractionResult.success && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Full content unavailable.</strong> Showing RSS summary as fallback.
                    </p>
                  </div>
                )}

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

        {/* Legend - Mobile */}
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

      {/* Desktop Layout - New adaptive design */}
      <div className="hidden lg:flex flex-col h-full">
        {/* Header - Desktop minimal header */}
        <div className="shrink-0 p-4 border-b border-border bg-background">
          <div className="flex items-start justify-between mb-3">
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

          <h1 className="text-lg font-semibold mb-2">{release.title}</h1>

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

        {/* Main Content Area - Flexible Layout */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* AI Summary Section - Collapsible on Desktop */}
          {collapseStateLoaded && (
            <div 
              className={`
                shrink-0 border-b border-border bg-background transition-all duration-300 ease-in-out
                ${isCollapsed ? 'h-auto overflow-hidden' : 'max-h-[45vh] overflow-y-auto'}
              `}
            >
              <div className={`${isCollapsed ? 'p-0' : 'p-4'}`}>
                <AIAnalysisSection
                  analysis={analysis}
                  loading={aiLoading}
                  error={aiError}
                  onRetry={retryAnalysis}
                  fromCache={fromCache}
                  cacheAge={cacheAge}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={toggleCollapse}
                  showCollapseControls={true}
                />
              </div>
            </div>
          )}

          {/* Article Content - Takes remaining space */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6">
              {extractionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading full content...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {extractionResult && !extractionResult.success && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Full content unavailable.</strong> Showing RSS summary as fallback.
                      </p>
                    </div>
                  )}

                  {displayContent && (
                    <div className="prose prose-gray prose-lg max-w-none dark:prose-invert">
                      <div className="text-foreground leading-relaxed space-y-4">
                        {renderHighlightedContent(displayContent, release.highlights || [])}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Legend - Desktop */}
          <div className="shrink-0 p-4 border-t border-border bg-muted/30">
            <div className="flex flex-wrap gap-6 text-xs">
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
      </div>
    </div>
  )
}
