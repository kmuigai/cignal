import { NextResponse } from "next/server"
import { resolveGoogleNewsUrl, isGoogleNewsUrl } from "@/lib/google-news-resolver"
import { extractContentFromUrl } from "@/lib/enhanced-content-extractor"
import { logGoogleNewsExtraction } from "@/lib/google-news-monitor"

interface GoogleNewsExtractionResult {
  success: boolean
  originalUrl: string
  resolvedUrl?: string
  redirectChain?: string[]
  content?: string
  htmlContent?: string
  textContent?: string
  extractedBy?: string
  confidence?: number
  cached?: boolean
  error?: string
  timing: {
    redirectResolution: number
    contentExtraction: number
    total: number
  }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "URL parameter is required",
        },
        { status: 400 }
      )
    }

    console.log(`🔍 Processing Google News URL: ${url.substring(0, 100)}...`)

    const result: GoogleNewsExtractionResult = {
      success: false,
      originalUrl: url,
      timing: {
        redirectResolution: 0,
        contentExtraction: 0,
        total: 0
      }
    }

    // Step 1: Resolve Google News redirect if necessary
    const redirectStart = Date.now()
    let finalUrl = url

    if (isGoogleNewsUrl(url)) {
      console.log(`🔄 Resolving Google News redirect...`)
      const redirectResult = await resolveGoogleNewsUrl(url)
      result.timing.redirectResolution = Date.now() - redirectStart

      if (!redirectResult.success) {
        result.error = `Redirect resolution failed: ${redirectResult.error}`
        result.timing.total = Date.now() - startTime
        return NextResponse.json(result, { status: 500 })
      }

      finalUrl = redirectResult.finalUrl!
      result.resolvedUrl = finalUrl
      result.redirectChain = redirectResult.redirectChain
      result.cached = redirectResult.cached

      console.log(`✅ Resolved to: ${finalUrl}`)
    } else {
      console.log(`ℹ️ Direct URL, no redirect resolution needed`)
      result.timing.redirectResolution = Date.now() - redirectStart
      result.resolvedUrl = url
    }

    // Step 2: Extract content from the final URL
    const extractionStart = Date.now()
    console.log(`📄 Extracting content from resolved URL...`)
    
    const extractionResult = await extractContentFromUrl(finalUrl, {
      timeout: 20000, // Longer timeout for complex pages
      retries: 3,
    })
    
    result.timing.contentExtraction = Date.now() - extractionStart
    result.timing.total = Date.now() - startTime

    if (!extractionResult.success) {
      result.error = `Content extraction failed: ${extractionResult.error}`
      return NextResponse.json(result, { status: 500 })
    }

    // Step 3: Return successful result
    result.success = true
    result.content = extractionResult.content
    result.htmlContent = extractionResult.htmlContent
    result.textContent = extractionResult.textContent
    result.extractedBy = extractionResult.extractedBy
    result.confidence = extractionResult.confidence

    console.log(`✅ Google News extraction complete:`)
    console.log(`   - Redirect resolution: ${result.timing.redirectResolution}ms`)
    console.log(`   - Content extraction: ${result.timing.contentExtraction}ms`)
    console.log(`   - Total time: ${result.timing.total}ms`)
    console.log(`   - Content length: ${result.content?.length || 0} chars`)
    console.log(`   - Extracted by: ${result.extractedBy}`)

    // Log successful extraction for monitoring
    logGoogleNewsExtraction({
      success: true,
      originalUrl: url,
      resolvedUrl: result.resolvedUrl,
      timing: result.timing,
      cached: result.cached,
      extractedBy: result.extractedBy,
      confidence: result.confidence
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error("❌ Google News extraction failed:", error)

    const result: GoogleNewsExtractionResult = {
      success: false,
      originalUrl: request.url,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timing: {
        redirectResolution: 0,
        contentExtraction: 0,
        total: Date.now() - startTime
      }
    }

    // Log failed extraction for monitoring
    logGoogleNewsExtraction({
      success: false,
      originalUrl: request.url,
      timing: result.timing,
      error: result.error
    })

    return NextResponse.json(result, { status: 500 })
  }
}

/**
 * POST endpoint for batch processing multiple Google News URLs
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { urls, options = {} } = body

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        {
          success: false,
          error: "URLs array is required",
        },
        { status: 400 }
      )
    }

    if (urls.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          totalTime: 0
        }
      })
    }

    if (urls.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum 50 URLs allowed per batch",
        },
        { status: 400 }
      )
    }

    console.log(`🔄 Batch processing ${urls.length} Google News URLs...`)

    // Process URLs with controlled concurrency
    const { concurrency = 3, timeout = 20000 } = options
    const results: GoogleNewsExtractionResult[] = []
    
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async (url: string) => {
        const urlStartTime = Date.now()
        
        try {
          // Resolve redirect
          const redirectStart = Date.now()
          let finalUrl = url
          let redirectResult = null

          if (isGoogleNewsUrl(url)) {
            redirectResult = await resolveGoogleNewsUrl(url)
            if (!redirectResult.success) {
              throw new Error(`Redirect failed: ${redirectResult.error}`)
            }
            finalUrl = redirectResult.finalUrl!
          }

          const redirectTime = Date.now() - redirectStart

          // Extract content
          const extractionStart = Date.now()
          const extractionResult = await extractContentFromUrl(finalUrl, { timeout })
          const extractionTime = Date.now() - extractionStart

          if (!extractionResult.success) {
            throw new Error(`Extraction failed: ${extractionResult.error}`)
          }

          return {
            success: true,
            originalUrl: url,
            resolvedUrl: finalUrl,
            redirectChain: redirectResult?.redirectChain,
            content: extractionResult.content,
            htmlContent: extractionResult.htmlContent,
            textContent: extractionResult.textContent,
            extractedBy: extractionResult.extractedBy,
            confidence: extractionResult.confidence,
            cached: redirectResult?.cached,
            timing: {
              redirectResolution: redirectTime,
              contentExtraction: extractionTime,
              total: Date.now() - urlStartTime
            }
          }

        } catch (error) {
          return {
            success: false,
            originalUrl: url,
            error: error instanceof Error ? error.message : 'Unknown error',
            timing: {
              redirectResolution: 0,
              contentExtraction: 0,
              total: Date.now() - urlStartTime
            }
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add delay between batches to be respectful
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.length - successful
    const totalTime = Date.now() - startTime

    console.log(`✅ Batch processing complete: ${successful}/${results.length} successful in ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        totalTime
      }
    })

  } catch (error) {
    console.error("❌ Batch Google News extraction failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
          totalTime: Date.now() - startTime
        }
      },
      { status: 500 }
    )
  }
} 