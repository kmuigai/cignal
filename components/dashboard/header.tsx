"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogOut, Settings, Bookmark } from "lucide-react"
import { getUserDisplayName, getUserInitials } from "@/lib/auth"
import type { User } from "@supabase/supabase-js"

interface HeaderProps {
  user: User | null
  onSignOut: () => void
  onOpenSettings: () => void
  bookmarkCount?: number
}

export function Header({ user, onSignOut, onOpenSettings, bookmarkCount = 0 }: HeaderProps) {
  const displayName = getUserDisplayName(user)
  const initials = getUserInitials(user)

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bricolage font-semibold tracking-tight">CIGNAL</h1>
        {bookmarkCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Bookmark className="h-4 w-4" />
            <Badge variant="secondary" className="text-xs">
              {bookmarkCount} bookmarked
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
