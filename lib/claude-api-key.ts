import { userProfileManager } from "./supabase/database"

class ClaudeAPIKeyManager {
  /**
   * Store encrypted API key in Supabase
   */
  async setAPIKey(apiKey: string): Promise<void> {
    try {
      if (!apiKey || apiKey.trim().length === 0) {
        await this.clearAPIKey()
        return
      }

      console.log("Attempting to store API key...")
      await userProfileManager.setClaudeAPIKey(apiKey.trim())
      console.log("API key stored successfully")
    } catch (error) {
      console.error("Error storing API key:", error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('auth')) {
          throw new Error("Authentication required. Please sign in and try again.")
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          throw new Error("Permission denied. Please check your account permissions.")
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error("Network error. Please check your connection and try again.")
        } else {
          throw new Error(`Failed to store API key: ${error.message}`)
        }
      }
      
      throw new Error("Failed to store API key")
    }
  }

  /**
   * Retrieve and decrypt API key from Supabase
   */
  async getAPIKey(): Promise<string | null> {
    try {
      return await userProfileManager.getClaudeAPIKey()
    } catch (error) {
      console.error("Error retrieving API key:", error)
      return null
    }
  }

  /**
   * Check if API key is configured
   */
  async hasAPIKey(): Promise<boolean> {
    const key = await this.getAPIKey()
    return key !== null && key.length > 0
  }

  /**
   * Clear stored API key
   */
  async clearAPIKey(): Promise<void> {
    try {
      await userProfileManager.clearClaudeAPIKey()
    } catch (error) {
      console.error("Error clearing API key:", error)
    }
  }

  /**
   * Validate API key format (basic check)
   */
  isValidKeyFormat(apiKey: string): boolean {
    // Claude API keys typically start with 'sk-ant-' and are around 100+ characters
    return apiKey.startsWith("sk-ant-") && apiKey.length > 50
  }

  /**
   * Mask API key for display (show first 8 and last 4 characters)
   */
  maskAPIKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 12) {
      return "••••••••••••"
    }

    const start = apiKey.substring(0, 8)
    const end = apiKey.substring(apiKey.length - 4)
    const middle = "•".repeat(Math.min(apiKey.length - 12, 20))

    return `${start}${middle}${end}`
  }
}

export const claudeAPIKeyManager = new ClaudeAPIKeyManager()

// Server-side function for API routes
export async function getClaudeAPIKey(): Promise<string | null> {
  return await claudeAPIKeyManager.getAPIKey()
}
