import { createClientComponentClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClientComponentClient()

  try {
    // First try to get the session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Error getting session:", sessionError)
      return null
    }

    // If no session, return null (user not authenticated)
    if (!session) {
      return null
    }

    // If we have a session, get the user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error("Error getting user:", userError)
      return null
    }

    return user
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    return null
  }
}

export async function signOut(): Promise<void> {
  const supabase = createClientComponentClient()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Error signing out:", error)
    }
  } catch (error) {
    console.error("Error in signOut:", error)
  }
}

// Helper to get user display name
export function getUserDisplayName(user: User | null): string {
  if (!user) return "User"

  // Try user_metadata first (from OAuth providers like Google)
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }

  if (user.user_metadata?.name) {
    return user.user_metadata.name
  }

  // Fallback to email
  return user.email || "User"
}

// Helper to get user initials
export function getUserInitials(user: User | null): string {
  if (!user) return "U"

  const displayName = getUserDisplayName(user)

  return (
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user.email?.[0]?.toUpperCase() ||
    "U"
  )
}

// Helper to validate if a URL is a valid image URL
function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // Check if it's a valid URL and has a reasonable domain
    return urlObj.protocol === 'https:' || urlObj.protocol === 'http:'
  } catch {
    return false
  }
}

// Helper to get user avatar URL with enhanced validation
export function getUserAvatarUrl(user: User | null): string | null {
  if (!user) return null

  // Try user_metadata first (from OAuth providers like Google)
  let avatarUrl: string | null = null

  if (user.user_metadata?.avatar_url) {
    avatarUrl = user.user_metadata.avatar_url
  } else if (user.user_metadata?.picture) {
    avatarUrl = user.user_metadata.picture
  }

  // Validate the URL before returning it
  if (avatarUrl && isValidImageUrl(avatarUrl)) {
    return avatarUrl
  }

  return null
}

// Helper to preload avatar image for better UX
export function preloadAvatarImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}
