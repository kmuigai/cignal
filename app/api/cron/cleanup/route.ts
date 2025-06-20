import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pressReleasesService } from '@/lib/supabase/press-releases-service'

// Use service role key for cron jobs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CleanupResult {
  totalUsers: number
  totalReleasesCleaned: number
  errors: string[]
  startTime: string
  endTime: string
  duration: number
}

/**
 * Cleanup endpoint to remove old press releases (30+ days)
 * Should be called daily
 */
export async function POST(request: NextRequest) {
  const startTime = new Date().toISOString()
  const startTimestamp = Date.now()
  
  console.log('🧹 Starting cleanup job: removing old press releases')
  
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cleanup attempt')
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }
    
    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
    
    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`)
    }
    
    console.log(`📋 Found ${users?.length || 0} users to clean up`)
    
    const result: CleanupResult = {
      totalUsers: users?.length || 0,
      totalReleasesCleaned: 0,
      errors: [],
      startTime,
      endTime: '',
      duration: 0
    }
    
    // Clean up old releases for each user
    for (const user of users || []) {
      try {
        console.log(`🧹 Cleaning up releases for user: ${user.id}`)
        
        const cleanedCount = await pressReleasesService.cleanupOldReleases(user.id)
        result.totalReleasesCleaned += cleanedCount
        
        console.log(`✅ Cleaned ${cleanedCount} releases for user ${user.id}`)
        
      } catch (error) {
        console.error(`💥 Error cleaning up for user ${user.id}:`, error)
        result.errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    const endTime = new Date().toISOString()
    const duration = Date.now() - startTimestamp
    
    result.endTime = endTime
    result.duration = duration
    
    console.log(`🎉 Cleanup job completed in ${duration}ms`)
    console.log(`📊 Cleaned ${result.totalReleasesCleaned} total releases`)
    
    return NextResponse.json({
      message: 'Cleanup job completed',
      result
    })
    
  } catch (error) {
    const endTime = new Date().toISOString()
    const duration = Date.now() - startTimestamp
    
    console.error('💥 Cleanup job failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Cleanup job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        result: {
          totalUsers: 0,
          totalReleasesCleaned: 0,
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
    message: 'Cleanup endpoint is healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  })
} 