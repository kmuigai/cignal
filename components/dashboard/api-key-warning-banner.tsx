"use client"

import { AlertTriangle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

interface APIKeyWarningBannerProps {
  onOpenSettings: () => void
}

export function APIKeyWarningBanner({ onOpenSettings }: APIKeyWarningBannerProps) {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/50 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Claude API Key Required</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Configure your Claude API key in settings to enable AI-powered analysis and summaries.
            </p>
          </div>
        </div>
        <Button
          onClick={onOpenSettings}
          size="sm"
          variant="outline"
          className="border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900"
        >
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
      </div>
    </div>
  )
}
