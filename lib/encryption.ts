/**
 * Simple encryption utility for storing sensitive data in localStorage
 * Note: This is basic obfuscation, not cryptographically secure
 * For production, consider using a more robust encryption method
 */

class SimpleEncryption {
  private readonly key = "cignal-encrypt-key-2024"

  /**
   * Simple XOR encryption with base64 encoding
   */
  encrypt(text: string): string {
    try {
      let encrypted = ""
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
        encrypted += String.fromCharCode(charCode)
      }
      return btoa(encrypted)
    } catch (error) {
      console.error("Encryption error:", error)
      return ""
    }
  }

  /**
   * Decrypt XOR encrypted base64 string
   */
  decrypt(encryptedText: string): string {
    try {
      const encrypted = atob(encryptedText)
      let decrypted = ""
      for (let i = 0; i < encrypted.length; i++) {
        const charCode = encrypted.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
        decrypted += String.fromCharCode(charCode)
      }
      return decrypted
    } catch (error) {
      console.error("Decryption error:", error)
      return ""
    }
  }
}

export const encryption = new SimpleEncryption()
