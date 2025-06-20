"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SignInPage } from "@/components/auth/sign-in-page"
import { Dashboard } from "@/components/dashboard/dashboard"
import { signOut } from "@/lib/auth"
import { createClientComponentClient, clearAuthState } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { AuthErrorBoundary, AuthErrorFallback } from "@/components/auth/error-boundary"

// Loading component
function LoadingSpinner({ message = "Loading...", progress = null }: { message?: string; progress?: number | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">{message}</p>
        {progress !== null && (
          <div className="w-48 mx-auto mt-2">
            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Error component
function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-red-600 dark:text-red-400">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="mb-4">{error}</p>
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

// Main auth component wrapped in error boundary
function AuthHandler() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingOAuth, setProcessingOAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authAttempts, setAuthAttempts] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Safe parameter extraction
  const getUrlParams = () => {
    try {
      return {
        code: searchParams?.get("code") || null,
        error: searchParams?.get("error") || null,
        error_code: searchParams?.get("error_code") || null,
        error_description: searchParams?.get("error_description") || null,
      }
    } catch (err) {
      console.error("Error reading URL parameters:", err)
      return { 
        code: null, 
        error: null, 
        error_code: null, 
        error_description: null 
      }
    }
  }
  
  // Function to check and refresh session if needed
  const checkAndRefreshSession = async (supabase: ReturnType<typeof createClientComponentClient>) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error("Error checking session:", sessionError)
        return null
      }
      
      if (!session) {
        console.log("No session found")
        return null
      }
      
      // Check if token is about to expire (within 5 minutes)
      const expiresAt = session.expires_at
      const now = Math.floor(Date.now() / 1000)
      const fiveMinutesInSeconds = 5 * 60
      
      if (expiresAt && expiresAt - now < fiveMinutesInSeconds) {
        console.log("Session token expiring soon, refreshing...")
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.error("Error refreshing session:", refreshError)
          return null
        }
        
        return refreshData.session
      }
      
      return session
    } catch (error) {
      console.error("Error in checkAndRefreshSession:", error)
      return null
    }
  }

  // Handle flow state not found error specifically
  useEffect(() => {
    const { error_code } = getUrlParams()
    
    // If we detect the specific flow_state_not_found or bad_oauth_state error
    if (error_code === "flow_state_not_found" || error_code === "bad_oauth_state") {
      console.log(`Detected ${error_code} error, clearing auth state...`)
      
      // Clear the error from the URL after a short delay to allow Supabase to process
      setTimeout(() => {
        router.replace("/")
      }, 100)
      
      // Clear auth state
      clearAuthState()
      
      // Reset error state after clearing
      setTimeout(() => {
        setError(null)
        setLoading(true)
      }, 200)
    }
  }, [searchParams, router])

  // Handle OAuth code and session management
  useEffect(() => {
    let mounted = true
    let retryTimeout: NodeJS.Timeout | null = null;

    const handleAuth = async () => {
      try {
        // Only run on client side
        if (typeof window === "undefined") return

        const supabase = createClientComponentClient()
        const { code, error: errorParam, error_code, error_description } = getUrlParams()

        console.log("Auth handler running:", { 
          code: !!code, 
          error: !!errorParam, 
          error_code, 
          attempt: authAttempts + 1 
        })

        // Handle specific OAuth errors - but don't immediately clear URL
        if (errorParam && error_code !== "flow_state_not_found" && error_code !== "bad_oauth_state") {
          console.error("Auth error:", { error: errorParam, error_code, error_description })
          
          // Handle other errors
          if (mounted) {
            setError("Authentication failed. Please try again.")
            setLoading(false)
          }
          return
        }
        
        // Skip processing if we have flow state errors - let the other useEffect handle them
        if (error_code === "flow_state_not_found" || error_code === "bad_oauth_state") {
          return
        }

        // Handle OAuth code exchange - let Supabase handle this automatically
        if (code) {
          if (mounted) setProcessingOAuth(true)
          console.log("Processing OAuth code...")

          // Don't manually exchange - let Supabase's detectSessionInUrl handle it
          // Just wait for the session to be available
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Get current session (whether from OAuth or existing)
        try {
          const session = await checkAndRefreshSession(supabase)

          if (!session) {
            if (mounted) {
              // Auto-retry for session errors
              if (authAttempts < 2) {
                console.log("No valid session, retrying...")
                setAuthAttempts(prev => prev + 1)
                retryTimeout = setTimeout(() => {
                  if (mounted) handleAuth()
                }, 1500)
                return
              }
              setUser(null)
            }
          } else {
            if (mounted) {
              setUser(session?.user ?? null)
              console.log("User session:", session?.user?.email || "No user")
              
              // Clear URL if we have code and successful auth
              if (code) {
                router.replace("/")
              }
            }
          }
        } catch (sessionErr) {
          console.error("Exception getting session:", sessionErr)
          if (mounted) setUser(null)
        }
      } catch (err) {
        console.error("Error in auth handling:", err)
        if (mounted) {
          setError("An unexpected error occurred. Please try again.")
          setUser(null)
        }
      } finally {
        if (mounted) {
          setProcessingOAuth(false)
          setLoading(false)
        }
      }
    }

    handleAuth()

    return () => {
      mounted = false
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [searchParams, router, authAttempts])

  // Listen for auth state changes
  useEffect(() => {
    if (typeof window === "undefined") return

    let mounted = true

    try {
      const supabase = createClientComponentClient()

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth state changed:", event, session?.user?.email || "No user")

        if (!mounted) return

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          setUser(session?.user ?? null)
        } else if (event === "SIGNED_OUT") {
          setUser(null)
        }

        // Don't set loading to false here if we're processing OAuth
        if (!processingOAuth) {
          setLoading(false)
        }
      })

      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    } catch (err) {
      console.error("Error setting up auth listener:", err)
      if (mounted) {
        setError("Failed to initialize authentication. Please refresh the page.")
        setLoading(false)
      }
    }
  }, [processingOAuth])

  const handleSignOut = async () => {
    try {
      setLoading(true)
      await signOut()
      setUser(null)
    } catch (err) {
      console.error("Error signing out:", err)
      setError("Failed to sign out. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    router.push("/")
  }

  // Show loading state
  if (loading || processingOAuth) {
    const message = processingOAuth 
      ? "Completing sign in..." 
      : authAttempts > 0 
        ? `Authenticating (attempt ${authAttempts + 1})...` 
        : "Loading...";
    
    // Show progress bar for retries
    const progress = authAttempts > 0 ? Math.min(authAttempts * 33, 90) : null;
    
    return <LoadingSpinner message={message} progress={progress} />;
  }

  // Show error state
  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />
  }

  // Show sign-in page if not authenticated
  if (!user) {
    return <SignInPage />
  }

  // Show dashboard if authenticated
  return <Dashboard user={user} onSignOut={handleSignOut} />
}

// Main component with Suspense wrapper and Error Boundary
export default function Home() {
  const [key, setKey] = useState(0)
  
  const handleRetry = () => {
    // Reset the key to remount the component
    setKey(prev => prev + 1)
  }
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthErrorBoundary 
        fallback={<AuthErrorFallback onRetry={handleRetry} />}
      >
        <AuthHandler key={key} />
      </AuthErrorBoundary>
    </Suspense>
  )
}
