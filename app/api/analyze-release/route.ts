import { NextResponse } from "next/server"
import { aiPromptsManager, type AIPrompts } from "@/lib/ai-prompts"

interface AnalyzeReleaseRequest {
  content: string
  title: string
  apiKey: string
  customPrompts?: AIPrompts
  companyName?: string
  date?: string
}

interface Highlight {
  type: "financial" | "opportunity" | "risk" | "strategic"
  text: string
  start: number
  end: number
}

interface AnalysisResponse {
  success: boolean
  summary?: string
  keyPoints?: string[]
  highlights?: Highlight[]
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export async function POST(request: Request) {
  try {
    const { content, title, apiKey, customPrompts, companyName, date }: AnalyzeReleaseRequest = await request.json()

    if (!content || !title || !apiKey) {
      return NextResponse.json({
        success: false,
        error: "Content, title, and API key are required",
      })
    }

    console.log(`🤖 Analyzing press release: ${title.substring(0, 50)}...`)
    console.log("🔍 API Key (first 20 chars):", apiKey.substring(0, 20))
    console.log("🔍 API Key length:", apiKey.length)

    // Get prompts (custom or defaults)
    const prompts = customPrompts || aiPromptsManager.getPrompts()

    // Process the user prompt template with variables
    const processedUserPrompt = aiPromptsManager.processTemplate(prompts.userPromptTemplate, {
      companyName,
      content,
      title,
      date,
    })

    console.log("📝 Using system prompt:", prompts.systemPrompt.substring(0, 100) + "...")
    console.log("📝 Processed user prompt:", processedUserPrompt.substring(0, 200) + "...")

    // Call Claude API with custom prompts
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.3,
        system: prompts.systemPrompt,
        messages: [
          {
            role: "user",
            content: processedUserPrompt,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json().catch(() => ({}))
      console.error("❌ Claude API error:", claudeResponse.status, errorData)

      let errorMessage = "Analysis failed"
      if (claudeResponse.status === 401) {
        errorMessage = "Invalid API key"
      } else if (claudeResponse.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again in a moment."
      } else if (claudeResponse.status === 400) {
        errorMessage = "Invalid request format"
      } else if (claudeResponse.status >= 500) {
        errorMessage = "Claude API temporarily unavailable"
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
      })
    }

    const claudeResult = await claudeResponse.json()
    const analysisText = claudeResult.content[0]?.text

    if (!analysisText) {
      throw new Error("No analysis content received from Claude")
    }

    console.log("🔍 Raw Claude response:", analysisText.substring(0, 200) + "...")

    // Parse the JSON response from Claude
    let parsedAnalysis
    try {
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response")
      }

      parsedAnalysis = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("❌ Failed to parse Claude JSON:", parseError)
      console.error("Raw response:", analysisText)

      // Fallback: try to extract summary manually
      const summaryMatch = analysisText.match(/summary['"]\s*:\s*['"]([^'"]+)['"]/i)
      const summary = summaryMatch ? summaryMatch[1] : "Analysis completed but formatting error occurred"

      return NextResponse.json({
        success: true,
        summary,
        keyPoints: ["Analysis completed with formatting issues"],
        highlights: [],
      })
    }

    // Process highlights to find their positions in the content
    const processedHighlights: Highlight[] = []

    if (parsedAnalysis.highlights && Array.isArray(parsedAnalysis.highlights)) {
      for (const highlight of parsedAnalysis.highlights) {
        if (!highlight.text || !highlight.type) continue

        // Find the position of this text in the content
        const searchText = highlight.text.trim()
        const contentLower = content.toLowerCase()
        const searchLower = searchText.toLowerCase()

        let startIndex = contentLower.indexOf(searchLower)

        // If exact match not found, try partial matching
        if (startIndex === -1) {
          // Try to find a substantial portion of the text
          const words = searchText.split(/\s+/)
          if (words.length > 3) {
            const partialText = words.slice(0, Math.ceil(words.length * 0.7)).join(" ")
            startIndex = contentLower.indexOf(partialText.toLowerCase())
          }
        }

        if (startIndex !== -1) {
          // Use the original case from content
          const actualText = content.substring(startIndex, startIndex + searchText.length)

          processedHighlights.push({
            type: highlight.type as any,
            text: actualText,
            start: startIndex,
            end: startIndex + searchText.length,
          })
        } else {
          console.warn(`⚠️ Could not find highlight text in content: "${searchText.substring(0, 50)}..."`)
        }
      }
    }

    const result: AnalysisResponse = {
      success: true,
      summary: parsedAnalysis.summary || "Analysis completed",
      keyPoints: parsedAnalysis.keyPoints || [],
      highlights: processedHighlights,
      usage: {
        inputTokens: claudeResult.usage?.input_tokens || 0,
        outputTokens: claudeResult.usage?.output_tokens || 0,
      },
    }

    console.log(`✅ Analysis complete: ${result.highlights?.length || 0} highlights found`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error in press release analysis:", error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed due to unexpected error",
    })
  }
}
