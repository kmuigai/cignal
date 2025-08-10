"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Settings, 
  Trash2, 
  TestTube,
  Loader2,
  WifiOff,
  Wifi,
  Calendar,
  TrendingUp
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { RSSSourceForm } from "./rss-source-form"
import type { RSSSource, UpdateRSSSource, RSSValidationResult } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface RSSSourceItemProps {
  source: RSSSource
  onUpdate: (id: string, updates: UpdateRSSSource) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTest: (id: string) => Promise<RSSValidationResult>
}

const FEED_TYPE_LABELS: Record<RSSSource['feedType'], string> = {
  "ir-news": "IR News",
  "sec-filings": "SEC Filings", 
  "general-news": "General News",
  "industry": "Industry",
  "custom": "Custom"
}

const FEED_TYPE_COLORS: Record<RSSSource['feedType'], string> = {
  "ir-news": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "sec-filings": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "general-news": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
  "industry": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "custom": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
}

export function RSSSourceItem({ source, onUpdate, onDelete, onTest }: RSSSourceItemProps) {
  const [showEditForm, setShowEditForm] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<RSSValidationResult | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleToggleEnabled = async () => {
    setUpdating(true)
    try {
      await onUpdate(source.id, { enabled: !source.enabled })
    } catch (error) {
      console.error('Failed to toggle RSS source:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      const result = await onTest(source.id)
      setTestResult(result)
    } catch (error) {
      console.error('Failed to test RSS source:', error)
      setTestResult({
        valid: false,
        error: error instanceof Error ? error.message : 'Test failed'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleUpdate = async (updates: UpdateRSSSource) => {
    try {
      await onUpdate(source.id, updates)
      setShowEditForm(false)
    } catch (error) {
      console.error('Failed to update RSS source:', error)
      throw error // Let the form handle the error
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${source.feedName}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      await onDelete(source.id)
    } catch (error) {
      console.error('Failed to delete RSS source:', error)
      setDeleting(false)
    }
  }

  const getStatusInfo = () => {
    if (!source.enabled) {
      return {
        icon: <WifiOff className="h-4 w-4 text-gray-400" />,
        text: "Disabled",
        color: "text-gray-500"
      }
    }

    if (source.lastError) {
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        text: "Error",
        color: "text-red-600"
      }
    }

    if (!source.lastFetchedAt) {
      return {
        icon: <Clock className="h-4 w-4 text-orange-500" />,
        text: "Not tested",
        color: "text-orange-600"
      }
    }

    return {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      text: "Active", 
      color: "text-green-600"
    }
  }

  const statusInfo = getStatusInfo()

  if (showEditForm) {
    return (
      <RSSSourceForm
        source={source}
        onSubmit={handleUpdate}
        onCancel={() => setShowEditForm(false)}
        onTestUrl={() => onTest(source.id)}
      />
    )
  }

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      source.enabled 
        ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
        : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 opacity-75"
    }`}>
      <div className="flex items-start justify-between">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-sm truncate">{source.feedName}</h4>
            <Badge 
              variant="secondary" 
              className={`text-xs ${FEED_TYPE_COLORS[source.feedType]} border-0`}
            >
              {FEED_TYPE_LABELS[source.feedType]}
            </Badge>
          </div>

          {/* URL */}
          <div className="flex items-center gap-2 mb-3">
            <a 
              href={source.feedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate flex items-center gap-1"
            >
              <span className="truncate">{source.feedUrl}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>

          {/* Status Row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              {statusInfo.icon}
              <span className={statusInfo.color}>{statusInfo.text}</span>
            </div>

            {source.enabled && source.articleCount > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{source.articleCount} articles</span>
              </div>
            )}

            {source.enabled && source.successRate < 100 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span>{source.successRate.toFixed(1)}% success</span>
              </div>
            )}

            {source.lastFetchedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(source.lastFetchedAt), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {source.lastError && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded text-xs text-red-600 dark:text-red-400">
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">Last Error:</span>
              </div>
              <div className="mt-1 font-mono text-xs">{source.lastError}</div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`mt-2 p-2 rounded text-xs ${
              testResult.valid
                ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400"
                : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
            }`}>
              <div className="flex items-center gap-1">
                {testResult.valid ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                <span className="font-medium">
                  {testResult.valid ? "Test Successful" : "Test Failed"}
                </span>
              </div>
              {testResult.error && (
                <div className="mt-1">{testResult.error}</div>
              )}
              {testResult.itemCount !== undefined && (
                <div className="mt-1">Found {testResult.itemCount} articles</div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Test Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing || updating || deleting}
            className="px-2"
          >
            {testing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <TestTube className="h-3 w-3" />
            )}
          </Button>

          {/* Enable/Disable Toggle */}
          <Button
            size="sm"
            variant={source.enabled ? "outline" : "default"}
            onClick={handleToggleEnabled}
            disabled={updating || testing || deleting}
            className="px-3"
          >
            {updating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : source.enabled ? (
              <WifiOff className="h-3 w-3" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
          </Button>

          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2" disabled={updating || testing || deleting}>
                <Settings className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Source
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 dark:text-red-400"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Source
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}