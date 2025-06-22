import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for cron jobs (server-to-server)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CronResult {
  totalUsers: number
  successfulPolls: number
  failedPolls: number
  errors: string[]
  startTime: string
  endTime: string
  duration: number
}

/**
 * Cron endpoint to poll RSS feeds for all users
 * This should be called every 15-30 minutes by your cron service
 */
export async function POST(request: NextRequest) {
  const startTime = new Date().toISOString()
  const startTimestamp = Date.now()
  
  console.log('🕐 Starting cron job: RSS polling for all users')
  
  try {
    // Verify cron authorization (simple approach)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron attempt')
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }
    
    // Get all users who have companies (fixed for TEXT user_id)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('companies')
      .select('user_id')
      .not('user_id', 'is', null)
      .neq('user_id', '')
    
    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`)
    }
    
    // Get unique user IDs
    const uniqueUserIds = [...new Set(users?.map((u: any) => u.user_id) || [])]
    console.log(`📋 Found ${uniqueUserIds.length} users with companies`)
    
    if (uniqueUserIds.length === 0) {
      console.log('⚠️ No users with companies found')
      return NextResponse.json({
        message: 'No users with companies found',
        result: {
          totalUsers: 0,
          successfulPolls: 0,
          failedPolls: 0,
          errors: [],
          startTime,
          endTime: new Date().toISOString(),
          duration: Date.now() - startTimestamp
        }
      })
    }
    
    const result: CronResult = {
      totalUsers: uniqueUserIds.length,
      successfulPolls: 0,
      failedPolls: 0,
      errors: [],
      startTime,
      endTime: '',
      duration: 0
    }
    
    // Poll RSS for each user
    for (const userId of uniqueUserIds) {
      try {
        console.log(`🔄 Polling RSS for user: ${userId}`)
        
        // Call the poll-rss endpoint for this user
        const pollResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3006'}/api/poll-rss`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`, // Internal auth
            'X-User-ID': String(userId), // Pass user ID in header for cron context
          },
          body: JSON.stringify({ forceRefresh: false })
        })
        
        if (pollResponse.ok) {
          const pollResult = await pollResponse.json()
          console.log(`✅ Successfully polled for user ${userId}: ${pollResult.summary?.totalNew || 0} new releases`)
          result.successfulPolls++
        } else {
          const errorText = await pollResponse.text()
          console.error(`❌ Failed to poll for user ${userId}: ${pollResponse.status} ${errorText}`)
          result.failedPolls++
          result.errors.push(`User ${userId}: ${pollResponse.status} ${errorText}`)
        }
        
        // Add delay between users to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`💥 Error polling for user ${userId}:`, error)
        result.failedPolls++
        result.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    const endTime = new Date().toISOString()
    const duration = Date.now() - startTimestamp
    
    result.endTime = endTime
    result.duration = duration
    
    console.log(`🎉 Cron job completed in ${duration}ms`)
    console.log(`📊 Results: ${result.successfulPolls} successful, ${result.failedPolls} failed`)
    
    return NextResponse.json({
      message: 'Cron job completed',
      result
    })
    
  } catch (error) {
    const endTime = new Date().toISOString()
    const duration = Date.now() - startTimestamp
    
    console.error('💥 Cron job failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        result: {
          totalUsers: 0,
          successfulPolls: 0,
          failedPolls: 1,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          startTime,
          endTime,
          duration
        }
      }, 
      { status: 500 }
    )
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    message: 'Cron endpoint is healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  })
} 