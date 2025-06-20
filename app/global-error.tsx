"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="text-red-600 dark:text-red-400">
              <h2 className="text-2xl font-semibold mb-2">Application Error</h2>
              <p className="text-sm text-muted-foreground mb-4">
                A critical error occurred. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === "development" && (
                <details className="text-left bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-200 dark:border-red-800 mb-4">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                    {error.message}
                    {error.stack && "\n\nStack trace:\n" + error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className="space-y-2">
              <button
                onClick={reset}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
