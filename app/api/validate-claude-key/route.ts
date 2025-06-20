import { NextResponse } from "next/server"

interface ValidateKeyRequest {
  apiKey: string
}

interface ValidateKeyResponse {
  valid: boolean
  error?: string
}

export async function POST(request: Request) {
  try {
    const { apiKey }: ValidateKeyRequest = await request.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({
        valid: false,
        error: "API key is required",
      })
    }

    // Basic format validation
    if (!apiKey.startsWith("sk-ant-") || apiKey.length < 50) {
      return NextResponse.json({
        valid: false,
        error: "Invalid API key format. Claude API keys should start with 'sk-ant-'",
      })
    }

    console.log("🔑 Validating Claude API key...")
    console.log("🔍 API Key (first 20 chars):", apiKey.substring(0, 20))
    console.log("🔍 API Key length:", apiKey.length)

    // Test the API key with a simple request to Claude
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
      }),
    })

    if (claudeResponse.ok) {
      console.log("✅ Claude API key is valid")
      return NextResponse.json({
        valid: true,
      })
    } else {
      const errorData = await claudeResponse.json().catch(() => ({}))
      console.log("❌ Claude API key validation failed:", claudeResponse.status, errorData)

      let errorMessage = "Invalid API key"

      if (claudeResponse.status === 401) {
        errorMessage = "Invalid API key or insufficient permissions"
      } else if (claudeResponse.status === 429) {
        errorMessage = "API key is valid but rate limited"
        // Rate limit is actually a success case for validation
        return NextResponse.json({
          valid: true,
        })
      } else if (claudeResponse.status === 400) {
        errorMessage = errorData.error?.message || "Invalid request format"
      } else if (claudeResponse.status >= 500) {
        errorMessage = "Claude API service temporarily unavailable"
      }

      return NextResponse.json({
        valid: false,
        error: errorMessage,
      })
    }
  } catch (error) {
    console.error("❌ Error validating Claude API key:", error)

    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json({
        valid: false,
        error: "Network error: Unable to connect to Claude API",
      })
    }

    return NextResponse.json({
      valid: false,
      error: "Validation failed: " + (error instanceof Error ? error.message : "Unknown error"),
    })
  }
}
