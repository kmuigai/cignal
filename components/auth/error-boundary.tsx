"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class AuthErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Auth Error Boundary caught an error:", error)
    console.error("Component stack:", errorInfo.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

export function AuthErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-red-600 dark:text-red-400">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="mb-4">Failed to complete sign in. Please try again.</p>
        </div>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
} 