import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"

// Create a singleton Supabase client for client-side usage
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClientComponentClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          // Use default storage key - don't override Supabase's state management
          debug: process.env.NODE_ENV === 'development',
        }
      }
    )
  }
  return supabaseClient
}

// Helper to clear all auth state
export function clearAuthState() {
  try {
    // Clear all possible auth-related storage keys
    const keysToRemove = []
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes('cignal'))) {
        keysToRemove.push(key)
      }
    }
    
    // Remove all found keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
    
    // Clear any auth cookies
    document.cookie.split(";").forEach(cookie => {
      const [name] = cookie.trim().split("=")
      if (name && (name.includes('supabase') || name.includes('auth') || name.includes('sb-'))) {
        // Clear for current domain and parent domains
        const domains = ['', `.${window.location.hostname}`, window.location.hostname]
        domains.forEach(domain => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain};`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`
        })
      }
    })
    
    // Reset the client to ensure fresh state
    supabaseClient = null
  } catch (e) {
    console.warn('Failed to clear auth state:', e)
  }
}

// Export the client for direct usage
export const supabase = createClientComponentClient()

// Export types for convenience
export type { Database } from "./types"
