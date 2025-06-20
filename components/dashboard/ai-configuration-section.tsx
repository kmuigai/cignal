"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Key, CheckCircle, XCircle, Loader2, User } from "lucide-react"
import { claudeAPIKeyManager } from "@/lib/claude-api-key"
import { createClientComponentClient } from "@/lib/supabase/client"

interface AIConfigurationSectionProps {
  onAPIKeyChange?: (hasKey: boolean) => void
}

export function AIConfigurationSection({ onAPIKeyChange }: AIConfigurationSectionProps) {
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null)
  const [saved, setSaved] = useState(false)
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [displayKey, setDisplayKey] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authDebug, setAuthDebug] = useState<any>(null)

  // Debug authentication status
  const checkAuthStatus = async () => {
    try {
      const supabase = createClientComponentClient()
      
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      const debugInfo = {
        hasSession: !!session,
        sessionError: sessionError?.message || null,
        hasUser: !!user,
        userError: userError?.message || null,
        userId: user?.id || null,
        userEmail: user?.email || null,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        isExpired: session?.expires_at ? session.expires_at * 1000 < Date.now() : null,
      }
      
      console.log("Auth Debug Info:", debugInfo)
      setAuthDebug(debugInfo)
      
      return debugInfo
    } catch (error) {
      console.error("Error checking auth status:", error)
      const errorInfo = {
        error: error instanceof Error ? error.message : "Unknown error",
        hasSession: false,
        hasUser: false,
      }
      setAuthDebug(errorInfo)
      return errorInfo
    }
  }

  // Load API key on component mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        // Check auth first
        const authInfo = await checkAuthStatus()
        
        if (!authInfo.hasUser) {
          console.error("No authenticated user found")
          setError("User not authenticated")
          setLoading(false)
          return
        }
        
        const storedKey = await claudeAPIKeyManager.getAPIKey()
        const hasKey = await claudeAPIKeyManager.hasAPIKey()
        
        setApiKey(storedKey || "")
        setHasStoredKey(hasKey)
        
        if (hasKey && storedKey) {
          setDisplayKey(claudeAPIKeyManager.maskAPIKey(storedKey))
        }
        
        onAPIKeyChange?.(hasKey)
      } catch (error) {
        console.error("Error loading API key:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadApiKey()
  }, [onAPIKeyChange])

  const handleSaveKey = async () => {
    try {
      console.log("AI Config: Starting to save API key...")
      
      // Check auth before saving
      const authInfo = await checkAuthStatus()
      if (!authInfo.hasUser) {
        throw new Error("User not authenticated. Please sign in again.")
      }
      
      if ('isExpired' in authInfo && authInfo.isExpired === true) {
        throw new Error("Session expired. Please sign in again.")
      }
      
      await claudeAPIKeyManager.setAPIKey(apiKey)
      console.log("AI Config: API key saved successfully")
      
      setSaved(true)
      const hasKey = await claudeAPIKeyManager.hasAPIKey()
      setHasStoredKey(hasKey)
      onAPIKeyChange?.(hasKey)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error("AI Config: Error saving API key:", error)
      setTestResult({
        valid: false,
        error: error instanceof Error ? error.message : "Failed to save API key",
      })
    }
  }

  const handleTestKey = async () => {
    // Ensure apiKey is a string and not empty
    if (!apiKey) {
      setTestResult({
        valid: false,
        error: "Please enter an API key first",
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/validate-claude-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      })

      const result = await response.json()
      setTestResult(result)

      // If valid, automatically save the key
      if (result.valid) {
        await handleSaveKey()
      }
    } catch (error) {
      setTestResult({
        valid: false,
        error: "Network error: Unable to validate API key",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleClearKey = async () => {
    setApiKey("")
    setDisplayKey("")
    await claudeAPIKeyManager.clearAPIKey()
    setTestResult(null)
    setSaved(false)
    setHasStoredKey(false)
    onAPIKeyChange?.(false)
  }

  // Update display key when apiKey changes
  useEffect(() => {
    if (!apiKey) {
      setDisplayKey("")
    } else if (hasStoredKey && apiKey === "") {
      // If there's a stored key but apiKey state is empty, show masked version
      const loadMaskedKey = async () => {
        const storedKey = await claudeAPIKeyManager.getAPIKey()
        if (storedKey) {
          setDisplayKey(claudeAPIKeyManager.maskAPIKey(storedKey))
        }
      }
      loadMaskedKey()
    } else {
      // Otherwise show the current apiKey value
      setDisplayKey(apiKey)
    }
  }, [apiKey, hasStoredKey])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-4 w-4 text-gray-500" />
        <h3 className="font-medium" data-settings-section>AI Configuration</h3>
      </div>

      {/* Authentication Debug Info - only show in development */}
      {process.env.NODE_ENV === 'development' && authDebug && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <User className="h-3 w-3" />
            Authentication Status
            <Button 
              size="sm" 
              variant="outline" 
              onClick={checkAuthStatus}
              className="ml-auto text-xs h-6 px-2"
            >
              Refresh
            </Button>
          </div>
          <div>User: {authDebug.hasUser ? '✅ Authenticated' : '❌ Not authenticated'}</div>
          {authDebug.userEmail && <div>Email: {authDebug.userEmail}</div>}
          {authDebug.userId && <div>ID: {authDebug.userId}</div>}
          <div>Session: {authDebug.hasSession ? '✅ Active' : '❌ No session'}</div>
          {'isExpired' in authDebug && authDebug.isExpired !== null && (
            <div>Expired: {authDebug.isExpired ? '❌ Yes' : '✅ No'}</div>
          )}
          {authDebug.error && <div className="text-red-600">Error: {authDebug.error}</div>}
          {authDebug.sessionError && <div className="text-red-600">Session Error: {authDebug.sessionError}</div>}
          {authDebug.userError && <div className="text-red-600">User Error: {authDebug.userError}</div>}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="claude-api-key">Claude API Key</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                id="claude-api-key"
                type={showKey ? "text" : "password"}
                value={displayKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleTestKey} disabled={testing || !apiKey} size="sm">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Get your API key from{" "}
            <a
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Anthropic Console
            </a>
          </p>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              testResult.valid
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {testResult.valid ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span>{testResult.valid ? "API key is valid and saved!" : testResult.error}</span>
          </div>
        )}

        {/* Save Success */}
        {saved && !testResult && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span>API key saved successfully!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSaveKey} disabled={!apiKey} size="sm" variant="outline">
            Save Key
          </Button>
          {hasStoredKey && (
            <Button onClick={handleClearKey} size="sm" variant="outline">
              Clear Key
            </Button>
          )}
        </div>

        {/* Current Status */}
        <div className="text-xs text-gray-500">
          Status: {hasStoredKey ? "✅ API key configured" : "❌ No API key configured"}
        </div>
      </div>
    </div>
  )
}
