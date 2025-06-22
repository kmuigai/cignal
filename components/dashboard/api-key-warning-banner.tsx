"use client"

import { AlertTriangle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

interface APIKeyWarningBannerProps {
  onOpenSettings: () => void
}

interface APIKeyBannerSkeletonProps {
  show: boolean
}

// Skeleton component for the banner area during loading
export function APIKeyBannerSkeleton({ show }: APIKeyBannerSkeletonProps) {
  if (!show) return null;
  
  return (
    <div className="bg-gray-50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800 px-6 py-3 transition-all duration-300 ease-in-out">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-64 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  )
}

export function APIKeyWarningBanner({ onOpenSettings }: APIKeyWarningBannerProps) {
  return (
    <div 
      className="bg-yellow-50 dark:bg-yellow-950/50 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3 transition-all duration-300 ease-in-out transform"
      style={{
        animation: "slideDown 0.3s ease-out"
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 transition-colors duration-200" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 transition-colors duration-200">
              Claude API Key Required
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 transition-colors duration-200">
              Configure your Claude API key in settings to enable AI-powered analysis and summaries.
            </p>
          </div>
        </div>
        <Button
          onClick={onOpenSettings}
          variant="outline"
          size="sm"
          className="border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900 transition-all duration-200 transform hover:scale-105"
        >
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
      </div>
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-100%);
          }
        }
      `}</style>
    </div>
  )
}

// Enhanced wrapper component that handles the loading states
interface APIKeyBannerWrapperProps {
  hasAPIKey: boolean | null; // null = loading, true = has key, false = no key
  onOpenSettings: () => void
}

export function APIKeyBannerWrapper({ hasAPIKey, onOpenSettings }: APIKeyBannerWrapperProps) {
  // Show skeleton during loading
  if (hasAPIKey === null) {
    return <APIKeyBannerSkeleton show={true} />
  }
  
  // Show banner only when we know there's no API key
  if (hasAPIKey === false) {
    return <APIKeyWarningBanner onOpenSettings={onOpenSettings} />
  }
  
  // Don't render anything when API key exists
  return null
}
