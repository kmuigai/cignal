import { userProfileManager } from "./supabase/database"

// Client-side cache for API key status
interface APIKeyCache {
  hasKey: boolean | null;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class ClaudeAPIKeyManager {
  private cache: APIKeyCache | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private checkingPromise: Promise<boolean> | null = null;

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
      
      // Update cache
      this.cache = {
        hasKey: true,
        timestamp: Date.now(),
        expiresIn: this.CACHE_DURATION
      };
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
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.timestamp < this.cache.expiresIn;
  }

  /**
   * Get cached API key status if available and valid
   */
  getCachedAPIKeyStatus(): boolean | null {
    if (this.isCacheValid() && this.cache) {
      return this.cache.hasKey;
    }
    return null;
  }

  /**
   * Check if API key is configured with caching and deduplication
   */
  async hasAPIKey(): Promise<boolean> {
    // Return cached result if valid
    const cachedResult = this.getCachedAPIKeyStatus();
    if (cachedResult !== null) {
      return cachedResult;
    }

    // If already checking, return the same promise to avoid duplicate requests
    if (this.checkingPromise) {
      return this.checkingPromise;
    }

    // Create new check promise
    this.checkingPromise = this.performAPIKeyCheck();
    
    try {
      const result = await this.checkingPromise;
      return result;
    } finally {
      // Clear the promise after completion
      this.checkingPromise = null;
    }
  }

  /**
   * Perform the actual API key check
   */
  private async performAPIKeyCheck(): Promise<boolean> {
    try {
      const key = await this.getAPIKey();
      const hasKey = key !== null && key.length > 0;
      
      // Update cache
      this.cache = {
        hasKey,
        timestamp: Date.now(),
        expiresIn: this.CACHE_DURATION
      };
      
      return hasKey;
    } catch (error) {
      console.error("Error checking API key:", error);
      // Don't cache errors, return false
      return false;
    }
  }

  /**
   * Clear stored API key and cache
   */
  async clearAPIKey(): Promise<void> {
    try {
      await userProfileManager.clearClaudeAPIKey()
      // Clear cache
      this.cache = {
        hasKey: false,
        timestamp: Date.now(),
        expiresIn: this.CACHE_DURATION
      };
    } catch (error) {
      console.error("Error clearing API key:", error)
    }
  }

  /**
   * Invalidate cache (useful when user signs out)
   */
  invalidateCache(): void {
    this.cache = null;
    this.checkingPromise = null;
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
