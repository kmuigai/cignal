"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-red-600 dark:text-red-400">
          <h2 className="text-2xl font-semibold mb-2">Something went wrong!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The application encountered an error. This has been logged for debugging.
          </p>
          {process.env.NODE_ENV === "development" && (
            <details className="text-left bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-200 dark:border-red-800 mb-4">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {error.message}
                {error.stack && "\n\nStack trace:\n" + error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="space-y-2">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")} className="w-full">
            Go to homepage
          </Button>
        </div>
      </div>
    </div>
  )
}
