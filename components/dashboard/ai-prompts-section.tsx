"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, RotateCcw, TestTube, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getCustomPrompts,
  saveCustomPrompts,
  resetToDefaultPrompts,
  DEFAULT_AI_PROMPTS,
  type AIPrompts,
} from "@/lib/ai-prompts"

interface AIPromptsSectionProps {
  onPromptsChange?: () => void
}

export function AIPromptsSection({ onPromptsChange }: AIPromptsSectionProps) {
  const [prompts, setPrompts] = useState<AIPrompts>(DEFAULT_AI_PROMPTS)
  const [isCustomized, setIsCustomized] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    analysis?: any
  } | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const customPrompts = getCustomPrompts()
    setPrompts(customPrompts)
    setIsCustomized(
      customPrompts.systemPrompt !== DEFAULT_AI_PROMPTS.systemPrompt ||
        customPrompts.userPromptTemplate !== DEFAULT_AI_PROMPTS.userPromptTemplate,
    )
  }, [])

  const handleSave = () => {
    saveCustomPrompts(prompts)
    setIsCustomized(
      prompts.systemPrompt !== DEFAULT_AI_PROMPTS.systemPrompt ||
        prompts.userPromptTemplate !== DEFAULT_AI_PROMPTS.userPromptTemplate,
    )
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
    onPromptsChange?.()
  }

  const handleReset = () => {
    resetToDefaultPrompts()
    setPrompts(DEFAULT_AI_PROMPTS)
    setIsCustomized(false)
    setTestResult(null)
    onPromptsChange?.()
  }

  const handleTestPrompts = async () => {
    setIsTesting(true)
    setTestResult(null)

    const sampleRelease = {
      title: "TechCorp Announces Q4 2024 Financial Results",
      content:
        "TechCorp Inc. today announced financial results for the fourth quarter ended December 31, 2024. Revenue increased 15% year-over-year to $2.1 billion, driven by strong demand for cloud services. Net income was $420 million, up from $365 million in the prior year quarter. The company also announced a new AI initiative expected to launch in Q2 2025.",
      companyName: "TechCorp Inc.",
      date: "2024-12-31",
    }

    try {
      // Get API key
      const { claudeAPIKeyManager } = await import("@/lib/claude-api-key")
      const apiKey = claudeAPIKeyManager.getAPIKey()

      if (!apiKey) {
        setTestResult({
          success: false,
          message: "Please configure your Claude API key first in the AI Configuration section.",
        })
        return
      }

      const response = await fetch("/api/analyze-release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: sampleRelease.content,
          title: sampleRelease.title,
          companyName: sampleRelease.companyName,
          date: sampleRelease.date,
          apiKey,
          customPrompts: prompts,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: "Test successful! Your prompts are working correctly.",
          analysis: data,
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || "Test failed. Please check your prompts and try again.",
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Network error. Please check your connection and try again.",
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">AI Prompts</h3>
          <p className="text-sm text-muted-foreground">Customize how the AI analyzes press releases</p>
        </div>
        {isCustomized && (
          <Badge variant="secondary" className="text-xs">
            Customized
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="system-prompt">System Prompt</Label>
          <p className="text-xs text-muted-foreground mb-2">Defines the AI's role and expertise</p>
          <Textarea
            id="system-prompt"
            value={prompts.systemPrompt}
            onChange={(e) => setPrompts({ ...prompts, systemPrompt: e.target.value })}
            className="min-h-[120px] font-mono text-sm"
            placeholder="Enter system prompt..."
          />
        </div>

        <div>
          <Label htmlFor="user-prompt">User Prompt Template</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Instructions for analyzing each press release. Use template variables:
            <code className="mx-1 px-1 bg-muted rounded text-xs">{"{{COMPANY_NAME}}"}</code>
            <code className="mx-1 px-1 bg-muted rounded text-xs">{"{{CONTENT}}"}</code>
            <code className="mx-1 px-1 bg-muted rounded text-xs">{"{{TITLE}}"}</code>
            <code className="mx-1 px-1 bg-muted rounded text-xs">{"{{DATE}}"}</code>
          </p>
          <Textarea
            id="user-prompt"
            value={prompts.userPromptTemplate}
            onChange={(e) => setPrompts({ ...prompts, userPromptTemplate: e.target.value })}
            className="min-h-[200px] font-mono text-sm"
            placeholder="Enter user prompt template..."
          />
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Template Variables:</strong>
          <br />• <code className="text-xs">{"{{COMPANY_NAME}}"}</code> - The matched company name
          <br />• <code className="text-xs">{"{{CONTENT}}"}</code> - Full press release content
          <br />• <code className="text-xs">{"{{TITLE}}"}</code> - Press release title
          <br />• <code className="text-xs">{"{{DATE}}"}</code> - Publication date
          <br />• Use conditional syntax:{" "}
          <code className="text-xs">{'{{COMPANY_NAME ? "Company: " + COMPANY_NAME : ""}}'}</code>
        </AlertDescription>
      </Alert>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleSave} size="sm">
          Save Prompts
        </Button>
        <Button onClick={handleReset} variant="outline" size="sm" disabled={!isCustomized}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset to Defaults
        </Button>
        <Button onClick={handleTestPrompts} variant="outline" size="sm" disabled={isTesting}>
          {isTesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
          {isTesting ? "Testing..." : "Test Prompts"}
        </Button>
      </div>

      {isSaved && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">AI prompts saved successfully!</AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className={testResult.success ? "text-green-800" : "text-red-800"}>{testResult.message}</p>
              {testResult.success && testResult.analysis && (
                <div className="text-sm text-green-700">
                  <p>
                    <strong>Summary:</strong> {testResult.analysis.summary?.substring(0, 100)}...
                  </p>
                  <p>
                    <strong>Key Points:</strong> {testResult.analysis.keyPoints?.length || 0} points found
                  </p>
                  <p>
                    <strong>Highlights:</strong> {testResult.analysis.highlights?.length || 0} highlights found
                  </p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
