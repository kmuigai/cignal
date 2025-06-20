"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, AlertCircle, Brain, Clock, Settings } from "lucide-react"

interface AIAnalysisSectionProps {
  analysis: {
    summary: string
    keyPoints: string[]
    usage?: {
      inputTokens: number
      outputTokens: number
    }
  } | null
  loading: boolean
  error: string | null
  onRetry: () => void
  fromCache: boolean
  cacheAge?: string
}

export function AIAnalysisSection({ 
  analysis, 
  loading, 
  error, 
  onRetry, 
  fromCache, 
  cacheAge 
}: AIAnalysisSectionProps) {
  if (loading) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">AI Summary</h2>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        </div>
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-3 bg-muted rounded w-full mb-2"></div>
            <div className="h-3 bg-muted rounded w-4/5 mb-2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
          <p className="text-xs text-muted-foreground">Analyzing with Claude AI...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isAPIKeyError = error.includes("API key") || error.includes("Configure")
    
    return (
      <div className={`${isAPIKeyError ? 'bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800' : 'bg-destructive/10 border border-destructive/20'} rounded-lg p-4 mb-4`}>
        <div className="flex items-center gap-2 mb-2">
          {isAPIKeyError ? (
            <Settings className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <h2 className={`text-sm font-medium ${isAPIKeyError ? 'text-yellow-800 dark:text-yellow-200' : 'text-destructive'}`}>
            {isAPIKeyError ? 'API Key Required' : 'AI Analysis Failed'}
          </h2>
        </div>
        <p className={`text-sm mb-3 ${isAPIKeyError ? 'text-yellow-700 dark:text-yellow-300' : 'text-destructive/80'}`}>
          {error}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className={isAPIKeyError 
              ? "border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
              : "border-destructive/30 text-destructive hover:bg-destructive/10"
            }
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry Analysis
          </Button>
          {isAPIKeyError && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                // Scroll to settings section or show settings
                const settingsSection = document.querySelector('[data-settings-section]')
                if (settingsSection) {
                  settingsSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              <Settings className="h-3 w-3 mr-1" />
              Configure API Key
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">AI Summary</h2>
        </div>
        <p className="text-sm text-muted-foreground">No AI analysis available</p>
      </div>
    )
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">AI Summary</h2>
          {fromCache && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {cacheAge || 'Cached'}
            </Badge>
          )}
        </div>
        <Button 
          onClick={onRetry} 
          size="sm" 
          variant="ghost" 
          className="h-6 w-6 p-0" 
          title={fromCache ? "Generate fresh analysis" : "Refresh analysis"}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>

        {analysis.keyPoints && analysis.keyPoints.length > 0 && (
          <div>
            <h3 className="text-xs font-medium mb-2">Key Points</h3>
            <ul className="space-y-1">
              {analysis.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="w-1 h-1 bg-primary rounded-full mt-1.5 shrink-0"></span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.usage && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Tokens: {analysis.usage.inputTokens + analysis.usage.outputTokens} total</span>
            {fromCache && (
              <span className="text-green-600 dark:text-green-400">
                ✓ From cache
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
