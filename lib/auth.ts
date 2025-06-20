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

// Helper to get user avatar URL
export function getUserAvatarUrl(user: User | null): string | null {
  if (!user) return null

  // Try user_metadata first (from OAuth providers like Google)
  if (user.user_metadata?.avatar_url) {
    return user.user_metadata.avatar_url
  }

  if (user.user_metadata?.picture) {
    return user.user_metadata.picture
  }

  return null
}
