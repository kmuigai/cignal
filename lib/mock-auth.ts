interface MockUser {
  id: string
  email: string
  name: string
  hasCompletedOnboarding: boolean
}

class MockAuth {
  private storageKey = "cignal-mock-user"

  getCurrentUser(): MockUser | null {
    if (typeof window === "undefined") return null

    const stored = localStorage.getItem(this.storageKey)
    return stored ? JSON.parse(stored) : null
  }

  signIn(email: string): MockUser {
    const user: MockUser = {
      id: "mock-user-" + Date.now(),
      email,
      name: email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      hasCompletedOnboarding: true,
    }

    localStorage.setItem(this.storageKey, JSON.stringify(user))
    return user
  }

  signOut(): void {
    localStorage.removeItem(this.storageKey)
    localStorage.removeItem("cignal-bookmarks")
  }
}

export const mockAuth = new MockAuth()
