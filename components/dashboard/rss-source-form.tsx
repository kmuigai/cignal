"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, Loader2, TestTube, ExternalLink, Rss } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { CreateRSSSource, RSSSource, RSSValidationResult } from "@/lib/types"

interface RSSSourceFormProps {
  source?: RSSSource // For editing existing source
  onSubmit: (data: CreateRSSSource) => Promise<void>
  onCancel: () => void
  onTestUrl: (url: string) => Promise<RSSValidationResult>
}

const FEED_TYPES = [
  { value: "ir-news", label: "Investor Relations", description: "Company IR news and announcements" },
  { value: "sec-filings", label: "SEC Filings", description: "Regulatory filings and documents" },
  { value: "general-news", label: "General News", description: "News articles and press releases" },
  { value: "industry", label: "Industry News", description: "Sector-specific news and analysis" },
  { value: "custom", label: "Custom", description: "Other specialized feeds" }
]

const FEED_TEMPLATES = [
  {
    name: "Yahoo Finance Headlines",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline",
    type: "general-news",
    description: "General financial news headlines"
  },
  {
    name: "Reuters Business News",
    url: "https://feeds.reuters.com/reuters/businessNews",
    type: "general-news", 
    description: "Reuters business news feed"
  },
  {
    name: "MarketWatch Top Stories",
    url: "https://feeds.marketwatch.com/marketwatch/topstories",
    type: "general-news",
    description: "MarketWatch top business stories"
  }
]

export function RSSSourceForm({ source, onSubmit, onCancel, onTestUrl }: RSSSourceFormProps) {
  const [formData, setFormData] = useState<CreateRSSSource>({
    feedUrl: source?.feedUrl || "",
    feedName: source?.feedName || "",
    feedType: source?.feedType || "custom",
    enabled: source?.enabled ?? true
  })
  
  const [validationResult, setValidationResult] = useState<RSSValidationResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [urlTested, setUrlTested] = useState(false)

  const isEditing = !!source

  useEffect(() => {
    // Auto-suggest name and type when URL changes
    if (formData.feedUrl && !formData.feedName && !isEditing) {
      const suggestion = suggestFromUrl(formData.feedUrl)
      if (suggestion.name || suggestion.type !== "custom") {
        setFormData(prev => ({
          ...prev,
          feedName: prev.feedName || suggestion.name,
          feedType: suggestion.type
        }))
      }
    }
  }, [formData.feedUrl, isEditing])

  const suggestFromUrl = (url: string) => {
    const lowerUrl = url.toLowerCase()
    
    // Try to extract domain name for default name
    let suggestedName = ""
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "")
      suggestedName = domain.split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ') + " Feed"
    } catch {
      // Invalid URL, ignore
    }

    // Detect feed type based on URL patterns
    let suggestedType: RSSSource['feedType'] = "custom"
    
    if (lowerUrl.includes('investor') || lowerUrl.includes('/ir/') || lowerUrl.includes('press')) {
      suggestedType = "ir-news"
    } else if (lowerUrl.includes('sec.gov') || lowerUrl.includes('edgar') || lowerUrl.includes('filing')) {
      suggestedType = "sec-filings"
    } else if (lowerUrl.includes('yahoo') || lowerUrl.includes('reuters') || lowerUrl.includes('bloomberg') || lowerUrl.includes('cnbc')) {
      suggestedType = "general-news"
    } else if (lowerUrl.includes('fintech') || lowerUrl.includes('finance') || lowerUrl.includes('banking')) {
      suggestedType = "industry"
    }

    return { name: suggestedName, type: suggestedType }
  }

  const handleTestFeed = async () => {
    if (!formData.feedUrl.trim()) {
      setError("Please enter a URL to test")
      return
    }

    setTesting(true)
    setError("")
    setValidationResult(null)

    try {
      const result = await onTestUrl(formData.feedUrl.trim())
      setValidationResult(result)
      setUrlTested(true)
      
      // Auto-fill form if validation suggests improvements
      if (result.valid && result.title && !formData.feedName) {
        setFormData(prev => ({ ...prev, feedName: result.title }))
      }
      
      if (result.detectedType && formData.feedType === "custom") {
        setFormData(prev => ({ ...prev, feedType: result.detectedType! }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test RSS feed")
      setValidationResult({ valid: false, error: "Test failed" })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.feedUrl.trim() || !formData.feedName.trim()) {
      setError("URL and name are required")
      return
    }

    // Encourage testing for new sources
    if (!isEditing && !urlTested) {
      setError("Please test the RSS feed before saving")
      return
    }

    setSaving(true)
    setError("")

    try {
      await onSubmit({
        ...formData,
        feedUrl: formData.feedUrl.trim(),
        feedName: formData.feedName.trim()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save RSS source")
      setSaving(false)
    }
  }

  const handleTemplateSelect = (template: typeof FEED_TEMPLATES[0]) => {
    setFormData({
      feedUrl: template.url,
      feedName: template.name,
      feedType: template.type as RSSSource['feedType'],
      enabled: true
    })
    setValidationResult(null)
    setUrlTested(false)
    setError("")
  }

  const selectedFeedType = FEED_TYPES.find(ft => ft.value === formData.feedType)

  return (
    <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center gap-2 mb-4">
        <Rss className="h-5 w-5 text-blue-500" />
        <h4 className="font-medium">{isEditing ? "Edit RSS Source" : "Add RSS Source"}</h4>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Quick Templates */}
      {!isEditing && (
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Quick Start Templates</Label>
          <div className="grid grid-cols-1 gap-2">
            {FEED_TEMPLATES.map((template) => (
              <Button
                key={template.url}
                variant="outline"
                className="justify-start text-left h-auto p-3"
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex items-center gap-3 w-full">
                  <Rss className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-500 truncate">{template.description}</div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </div>
              </Button>
            ))}
          </div>
          <div className="text-center my-4">
            <div className="text-sm text-gray-500">or configure a custom RSS source</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* RSS URL */}
        <div>
          <Label htmlFor="feedUrl" className="text-sm font-medium mb-2 block">RSS Feed URL *</Label>
          <div className="flex gap-2">
            <Input
              id="feedUrl"
              type="url"
              value={formData.feedUrl}
              onChange={(e) => {
                setFormData({ ...formData, feedUrl: e.target.value })
                setValidationResult(null)
                setUrlTested(false)
              }}
              placeholder="https://example.com/rss"
              required
              disabled={saving}
            />
            <Button
              type="button"
              onClick={handleTestFeed}
              disabled={testing || !formData.feedUrl.trim() || saving}
              variant="outline"
              className="px-3"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Validation Result */}
          {validationResult && (
            <div className={`mt-2 p-3 rounded-lg text-sm ${
              validationResult.valid 
                ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <div className="flex-1">
                  {validationResult.valid ? (
                    <div>
                      <div className="font-medium">✓ RSS feed is accessible</div>
                      {validationResult.title && (
                        <div>Feed title: {validationResult.title}</div>
                      )}
                      {validationResult.itemCount !== undefined && (
                        <div>Found {validationResult.itemCount} articles</div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">⚠ Feed test failed</div>
                      <div>{validationResult.error}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feed Name */}
        <div>
          <Label htmlFor="feedName" className="text-sm font-medium mb-2 block">Feed Name *</Label>
          <Input
            id="feedName"
            value={formData.feedName}
            onChange={(e) => setFormData({ ...formData, feedName: e.target.value })}
            placeholder="e.g., Company News, SEC Filings, Industry Updates"
            required
            disabled={saving}
          />
        </div>

        {/* Feed Type */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Feed Type</Label>
          <Select value={formData.feedType} onValueChange={(value: RSSSource['feedType']) => setFormData({ ...formData, feedType: value })}>
            <SelectTrigger disabled={saving} className="w-full text-left">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {FEED_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-left">
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFeedType && (
            <p className="text-xs text-gray-500 mt-1">{selectedFeedType.description}</p>
          )}
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
          <div>
            <div className="font-medium text-sm">Enable this RSS source</div>
            <div className="text-xs text-gray-500">
              {formData.enabled ? "This feed will be included in news fetching" : "This feed will be temporarily disabled"}
            </div>
          </div>
          <Button
            type="button"
            variant={formData.enabled ? "default" : "outline"}
            size="sm"
            onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
            disabled={saving}
          >
            {formData.enabled ? "Enabled" : "Disabled"}
          </Button>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Updating..." : "Adding..."}
              </>
            ) : (
              isEditing ? "Update Source" : "Add Source"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}