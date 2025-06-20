import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { pressReleasesService } from '@/lib/supabase/press-releases-service'
import { companyManager } from '@/lib/supabase/database'
import { processRSSFeed } from '@/lib/rss-to-stored-release'
import { getFeedsForCompanies } from '@/lib/rss-sources'

interface PollResult {
  companyId: string
  companyName: string
  success: boolean
  releasesFound: number
  releasesNew: number
  releasesDuplicate: number
  error?: string
}

interface PollSummary {
  userId: string
  startTime: string
  endTime: string
  companiesProcessed: number
  totalReleases: number
  totalNew: number
  totalDuplicates: number
  errors: number
  results: PollResult[]
}

/**
 * Poll RSS feeds for a specific user's companies and store new releases
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null
  const startTime = new Date().toISOString()
  
  try {
    // Check if this is a cron call (has X-User-ID header)
    const cronUserId = request.headers.get('X-User-ID')
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'
    
    if (cronUserId && authHeader === `Bearer ${cronSecret}`) {
      // This is a cron call, use the provided user ID
      userId = cronUserId
      console.log(`🤖 Cron call for user: ${userId}`)
    } else {
      // Regular user call, check auth
      const supabase = createRouteHandlerClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        )
      }
      
      userId = user.id
    }
    
    // Parse request body (optional filtering)
    const body = await request.json().catch(() => ({}))
    const { companyId, forceRefresh = false } = body
    
    console.log(`🔄 Starting RSS poll for user ${userId}${companyId ? ` (company: ${companyId})` : ''}`)
    
    // Get user's companies
    const companies = await companyManager.getCompanies()
    
    if (!companies || companies.length === 0) {
      return NextResponse.json({
        message: 'No companies found for user',
        summary: {
          userId,
          startTime,
          endTime: new Date().toISOString(),
          companiesProcessed: 0,
          totalReleases: 0,
          totalNew: 0,
          totalDuplicates: 0,
          errors: 0,
          results: []
        }
      })
    }
    
    // Filter companies if specific companyId requested
    const companiesToProcess = companyId 
      ? companies.filter(c => c.id === companyId)
      : companies
    
    if (companyId && companiesToProcess.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' }, 
        { status: 404 }
      )
    }
    
    console.log(`📋 Processing ${companiesToProcess.length} companies`)
    
    // Process each company
    const results: PollResult[] = []
    let totalReleases = 0
    let totalNew = 0
    let totalDuplicates = 0
    let errors = 0
    
    for (const company of companiesToProcess) {
      const pollResult = await pollCompanyRSS(userId, company, forceRefresh)
      results.push(pollResult)
      
      if (pollResult.success) {
        totalReleases += pollResult.releasesFound
        totalNew += pollResult.releasesNew
        totalDuplicates += pollResult.releasesDuplicate
      } else {
        errors++
      }
      
      // Add small delay between companies to be respectful to RSS servers
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    const endTime = new Date().toISOString()
    const summary: PollSummary = {
      userId,
      startTime,
      endTime,
      companiesProcessed: companiesToProcess.length,
      totalReleases,
      totalNew,
      totalDuplicates,
      errors,
      results
    }
    
    console.log(`✅ RSS poll completed: ${totalNew} new releases, ${totalDuplicates} duplicates, ${errors} errors`)
    
    return NextResponse.json({
      message: 'RSS poll completed',
      summary
    })
    
  } catch (error) {
    console.error('💥 RSS poll failed:', error)
    
    return NextResponse.json(
      { 
        error: 'RSS poll failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        summary: {
          userId,
          startTime,
          endTime: new Date().toISOString(),
          companiesProcessed: 0,
          totalReleases: 0,
          totalNew: 0,
          totalDuplicates: 0,
          errors: 1,
          results: []
        }
      }, 
      { status: 500 }
    )
  }
}

/**
 * Poll RSS feed for a single company
 */
async function pollCompanyRSS(
  userId: string, 
  company: any, 
  forceRefresh: boolean = false
): Promise<PollResult> {
  const pollStartTime = new Date().toISOString()
  
  // Create poll log entry
  const pollLog = await pressReleasesService.createPollLog(userId, {
    companyId: company.id,
    pollStartedAt: pollStartTime,
    status: 'running'
  })
  
  try {
    console.log(`🔍 Polling RSS for company: ${company.name}`)
    
    // Build search terms from company name and variations
    const searchTerms = [company.name, ...company.variations]
    const companiesData = [{ name: company.name, variations: company.variations }]
    
    // Fetch RSS data using existing API
    const companiesParam = encodeURIComponent(JSON.stringify(companiesData))
    const rssResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/fetch-releases?companies=${companiesParam}`)
    
    if (!rssResponse.ok) {
      throw new Error(`RSS fetch failed: ${rssResponse.status}`)
    }
    
    const rssData = await rssResponse.json()
    
    if (!rssData.items || !Array.isArray(rssData.items)) {
      throw new Error('Invalid RSS response format')
    }
    
    console.log(`📦 Found ${rssData.items.length} RSS items for ${company.name}`)
    
    // Process RSS items and convert to stored releases
    const { validReleases, skippedCount } = processRSSFeed(
      rssData.items,
      company.id,
      'https://www.prnewswire.com/rss/news-releases-list.rss' // Primary RSS source
    )
    
    console.log(`✅ Processed ${validReleases.length} valid releases, skipped ${skippedCount}`)
    
    // Store releases in database
    const { created, duplicates } = await pressReleasesService.batchCreatePressReleases(
      userId,
      validReleases
    )
    
    console.log(`💾 Stored ${created} new releases, ${duplicates} duplicates for ${company.name}`)
    
    // Update poll log with success
    if (pollLog) {
      await pressReleasesService.updatePollLog(pollLog.id, {
        status: 'success',
        pollCompletedAt: new Date().toISOString(),
        releasesFound: validReleases.length,
        releasesNew: created,
        releasesDuplicate: duplicates
      })
    }
    
    return {
      companyId: company.id,
      companyName: company.name,
      success: true,
      releasesFound: validReleases.length,
      releasesNew: created,
      releasesDuplicate: duplicates
    }
    
  } catch (error) {
    console.error(`❌ Failed to poll RSS for ${company.name}:`, error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Update poll log with error
    if (pollLog) {
      await pressReleasesService.updatePollLog(pollLog.id, {
        status: 'error',
        pollCompletedAt: new Date().toISOString(),
        errorMessage,
        errorDetails: error instanceof Error ? { stack: error.stack } : { error }
      })
    }
    
    return {
      companyId: company.id,
      companyName: company.name,
      success: false,
      releasesFound: 0,
      releasesNew: 0,
      releasesDuplicate: 0,
      error: errorMessage
    }
  }
}

/**
 * GET method for checking poll status or getting recent polls
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }
    
    // Get recent poll logs for this user
    const recentPolls = await pressReleasesService.getRecentPollLogs(user.id, 10)
    
    return NextResponse.json({
      message: 'Recent RSS polls',
      polls: recentPolls
    })
    
  } catch (error) {
    console.error('Error fetching poll logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch poll logs' }, 
      { status: 500 }
    )
  }
} 