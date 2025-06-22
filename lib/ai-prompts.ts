export interface AIPrompts {
  systemPrompt: string
  userPromptTemplate: string
}

export const DEFAULT_AI_PROMPTS: AIPrompts = {
  systemPrompt: `You are an expert financial analyst with deep knowledge of corporate communications, market dynamics, and business strategy. Your role is to analyze press releases and provide actionable insights for investors and business professionals.

Key capabilities:
- Identify financial metrics, revenue impacts, and valuation implications
- Spot growth opportunities, market expansion signals, and competitive advantages
- Recognize potential risks, challenges, and regulatory concerns
- Understand strategic moves, partnerships, and leadership changes

Always provide precise, evidence-based analysis with specific references to the source material.`,

  userPromptTemplate: `Analyze this press release and provide:

1. A concise executive summary (2-3 sentences)
2. Key highlights categorized as:
   - FINANCIAL: Revenue, earnings, valuations, funding amounts, financial metrics
   - OPPORTUNITY: Growth prospects, market expansion, new products/services, partnerships
   - RISK: Challenges, threats, regulatory issues, market headwinds
   - STRATEGIC: Acquisitions, leadership changes, strategic initiatives, competitive moves

For highlights, provide the exact text from the press release and specify which category it belongs to.

{{COMPANY_NAME ? "Company: " + COMPANY_NAME : ""}}
{{DATE ? "Date: " + DATE : ""}}

Press Release Title: {{TITLE}}

Press Release Content: {{CONTENT}}

Please respond in this exact JSON format:
{
  "summary": "Your 2-3 sentence executive summary here",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "highlights": [
    {
      "type": "financial|opportunity|risk|strategic",
      "text": "exact text from press release",
      "reasoning": "why this is significant"
    }
  ]
}

Important: Only include highlights for text that actually appears in the press release content. Be precise with the text matching.`,
}

/**
 * Process prompt template with variables
 * Enhanced with error handling and logging
 */
export function processPromptTemplate(
  template: string,
  variables: {
    companyName?: string
    content: string
    title: string
    date?: string
  },
): string {
  try {
    if (!template) {
      console.error("❌ processPromptTemplate: Template is empty or undefined")
      return ""
    }

    if (!variables.content || !variables.title) {
      console.error("❌ processPromptTemplate: Required variables (content, title) are missing")
      throw new Error("Content and title are required for template processing")
    }

    let processed = template

    console.log("🔧 Processing template with variables:", {
      hasCompanyName: !!variables.companyName,
      hasContent: !!variables.content,
      hasTitle: !!variables.title,
      hasDate: !!variables.date,
      contentLength: variables.content?.length || 0,
      titleLength: variables.title?.length || 0
    })

    // Replace conditional template variables (with ternary operators)
    processed = processed.replace(
      /\{\{COMPANY_NAME\s*\?\s*"([^"]*?)"\s*\+\s*COMPANY_NAME\s*:\s*"([^"]*?)"\}\}/g, 
      variables.companyName ? `$1${variables.companyName}` : '$2'
    )
    
    processed = processed.replace(
      /\{\{DATE\s*\?\s*"([^"]*?)"\s*\+\s*DATE\s*:\s*"([^"]*?)"\}\}/g, 
      variables.date ? `$1${variables.date}` : '$2'
    )

    // Replace simple template variables
    processed = processed.replace(/\{\{CONTENT\}\}/g, variables.content || '')
    processed = processed.replace(/\{\{TITLE\}\}/g, variables.title || '')
    processed = processed.replace(/\{\{COMPANY_NAME\}\}/g, variables.companyName || '')
    processed = processed.replace(/\{\{DATE\}\}/g, variables.date || '')

    // Check for any remaining unprocessed template variables
    const remainingVariables = processed.match(/\{\{[^}]+\}\}/g)
    if (remainingVariables) {
      console.warn("⚠️ Unprocessed template variables found:", remainingVariables)
    }

    console.log("✅ Template processing complete. Processed length:", processed.length)
    
    return processed

  } catch (error) {
    console.error("❌ Error in processPromptTemplate:", error)
    throw new Error(`Template processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Legacy exports for compatibility
export const DEFAULT_SYSTEM_PROMPT = DEFAULT_AI_PROMPTS.systemPrompt
export const DEFAULT_USER_PROMPT = DEFAULT_AI_PROMPTS.userPromptTemplate
