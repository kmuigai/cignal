"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogOut, Settings, Bookmark } from "lucide-react"
import { getUserDisplayName, getUserInitials, getUserAvatarUrl, preloadAvatarImage } from "@/lib/auth"
import type { User } from "@supabase/supabase-js"
import { useState, useEffect } from "react"

interface HeaderProps {
  user: User | null
  onSignOut: () => void
  onOpenSettings: () => void
  bookmarkCount?: number
}

export function Header({ user, onSignOut, onOpenSettings, bookmarkCount = 0 }: HeaderProps) {
  const displayName = getUserDisplayName(user)
  const initials = getUserInitials(user)
  const avatarUrl = getUserAvatarUrl(user)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Reset image states when avatar URL changes
  useEffect(() => {
    if (avatarUrl) {
      setImageError(false)
      setImageLoading(true)
      
      // Preload the image for better UX
      preloadAvatarImage(avatarUrl).then((success) => {
        if (!success) {
          setImageError(true)
        }
        setImageLoading(false)
      })
    } else {
      setImageLoading(false)
      setImageError(false)
    }
  }, [avatarUrl])

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  // Handle image load error
  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-background">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <h1 className="text-xl sm:text-2xl font-bricolage font-semibold tracking-tight">CIGNAL</h1>
        {bookmarkCount > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
            <Bookmark className="h-4 w-4" />
            <Badge variant="secondary" className="text-xs">
              {bookmarkCount} bookmarked
            </Badge>
          </div>
        )}
        {/* Mobile bookmark indicator - just show count */}
        {bookmarkCount > 0 && (
          <div className="sm:hidden">
            <Badge variant="secondary" className="text-xs">
              {bookmarkCount}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-8 w-8 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`${displayName}'s profile menu`}
            >
              <Avatar className="h-8 w-8">
                {avatarUrl && !imageError && (
                  <AvatarImage
                    src={avatarUrl}
                    alt={`${displayName}'s profile picture`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    className={`transition-opacity duration-300 ${
                      imageLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                )}
                <AvatarFallback 
                  className={`text-xs transition-all duration-300 ${
                    avatarUrl && !imageError && !imageLoading 
                      ? 'opacity-0 scale-95' 
                      : 'opacity-100 scale-100'
                  }`}
                >
                  {imageLoading && avatarUrl ? (
                    <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50" />
                  ) : (
                    initials
                  )}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem className="flex-col items-start">
              <div className="text-sm font-medium">{displayName}</div>
              <div className="text-xs text-muted-foreground">{user?.email || "No email"}</div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
