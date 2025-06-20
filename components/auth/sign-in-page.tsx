"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClientComponentClient, clearAuthState } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Handle OAuth errors
  useEffect(() => {
    const errorParam = searchParams?.get("error")
    const errorCode = searchParams?.get("error_code")
    
    if (errorParam && errorCode) {
      console.error("OAuth error detected:", { error: errorParam, code: errorCode })
      
      // Clear error from URL
      router.replace("/")
      
      // Show appropriate error message
      if (errorCode === "bad_oauth_state" || errorCode === "flow_state_not_found") {
        setError("Authentication session expired. Please try again.")
      } else {
        setError("Authentication failed. Please try again.")
      }
    }
  }, [searchParams, router])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)

      // Only run on client side
      if (typeof window === "undefined") {
        throw new Error("Sign in must be initiated from the browser")
      }

      // Clear browser completely before starting a new auth flow
      clearAuthState()
      
      // Wait a bit for the clear to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const supabase = createClientComponentClient()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}`,
          // Remove custom state and queryParams - let Supabase handle this
          queryParams: {
            prompt: "select_account",
          },
        },
      })

      if (error) {
        console.error("Error signing in with Google:", error)
        setError("Failed to sign in with Google. Please try again.")
        setLoading(false)
      }
      // If successful, user will be redirected to Google OAuth
    } catch (error) {
      console.error("Error in handleGoogleSignIn:", error)
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div>
            <h1 className="text-3xl font-bricolage font-semibold tracking-tight">CIGNAL</h1>
            <p className="text-sm text-muted-foreground mt-2">Competitive Intelligence</p>
          </div>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-[#4285f4] hover:bg-[#3367d6] text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
