/**
 * Phase 2 Test: Background Processing System
 * This file tests the RSS polling and cron job functionality
 */

interface TestResult {
  test: string
  success: boolean
  message: string
  data?: any
  error?: string
}

/**
 * Test the RSS polling endpoint directly
 */
export async function testRSSPollingEndpoint(baseUrl: string = 'http://localhost:3000'): Promise<TestResult> {
  try {
    console.log('🧪 Testing RSS polling endpoint...')
    
    // This would normally require authentication, so we'll test the health check instead
    const response = await fetch(`${baseUrl}/api/poll-rss`, {
      method: 'GET'
    })
    
    if (response.status === 401) {
      return {
        test: 'RSS Polling Endpoint',
        success: true,
        message: 'Endpoint is properly protected (401 Unauthorized as expected)',
        data: { status: response.status }
      }
    }
    
    const data = await response.json()
    
    return {
      test: 'RSS Polling Endpoint',
      success: response.ok,
      message: response.ok ? 'Endpoint is accessible' : 'Endpoint returned error',
      data
    }
    
  } catch (error) {
    return {
      test: 'RSS Polling Endpoint',
      success: false,
      message: 'Failed to connect to endpoint',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test the cron polling endpoint
 */
export async function testCronPollingEndpoint(baseUrl: string = 'http://localhost:3000'): Promise<TestResult> {
  try {
    console.log('🧪 Testing cron polling endpoint...')
    
    // Test health check first
    const healthResponse = await fetch(`${baseUrl}/api/cron/poll-all-users`, {
      method: 'GET'
    })
    
    const healthData = await healthResponse.json()
    
    if (!healthResponse.ok) {
      return {
        test: 'Cron Polling Endpoint',
        success: false,
        message: 'Health check failed',
        error: healthData.error || 'Unknown error'
      }
    }
    
    // Test protected endpoint (should be unauthorized without proper secret)
    const protectedResponse = await fetch(`${baseUrl}/api/cron/poll-all-users`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer wrong-secret'
      }
    })
    
    if (protectedResponse.status === 401) {
      return {
        test: 'Cron Polling Endpoint',
        success: true,
        message: 'Endpoint is properly protected and health check works',
        data: { health: healthData, protectedStatus: protectedResponse.status }
      }
    }
    
    return {
      test: 'Cron Polling Endpoint',
      success: false,
      message: 'Endpoint security is not working properly',
      data: { protectedStatus: protectedResponse.status }
    }
    
  } catch (error) {
    return {
      test: 'Cron Polling Endpoint',
      success: false,
      message: 'Failed to connect to endpoint',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test the cleanup endpoint
 */
export async function testCleanupEndpoint(baseUrl: string = 'http://localhost:3000'): Promise<TestResult> {
  try {
    console.log('🧪 Testing cleanup endpoint...')
    
    // Test health check
    const healthResponse = await fetch(`${baseUrl}/api/cron/cleanup`, {
      method: 'GET'
    })
    
    const healthData = await healthResponse.json()
    
    if (!healthResponse.ok) {
      return {
        test: 'Cleanup Endpoint',
        success: false,
        message: 'Health check failed',
        error: healthData.error || 'Unknown error'
      }
    }
    
    // Test protected endpoint (should be unauthorized)
    const protectedResponse = await fetch(`${baseUrl}/api/cron/cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer wrong-secret'
      }
    })
    
    if (protectedResponse.status === 401) {
      return {
        test: 'Cleanup Endpoint',
        success: true,
        message: 'Endpoint is properly protected and health check works',
        data: { health: healthData, protectedStatus: protectedResponse.status }
      }
    }
    
    return {
      test: 'Cleanup Endpoint',
      success: false,
      message: 'Endpoint security is not working properly',
      data: { protectedStatus: protectedResponse.status }
    }
    
  } catch (error) {
    return {
      test: 'Cleanup Endpoint',
      success: false,
      message: 'Failed to connect to endpoint',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Test database connection and services
 */
export async function testDatabaseServices(): Promise<TestResult> {
  try {
    console.log('🧪 Testing database services...')
    
    // This would require importing and testing the actual services
    // For now, we'll just check that the imports work
    const { pressReleasesService } = await import('@/lib/supabase/press-releases-service')
    
    if (!pressReleasesService) {
      throw new Error('Press releases service not available')
    }
    
    return {
      test: 'Database Services',
      success: true,
      message: 'All database services imported successfully',
      data: { 
        services: ['pressReleasesService']
      }
    }
    
  } catch (error) {
    return {
      test: 'Database Services',
      success: false,
      message: 'Failed to import database services',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Run all Phase 2 tests
 */
export async function testPhase2System(baseUrl?: string): Promise<{
  success: boolean
  totalTests: number
  passedTests: number
  failedTests: number
  results: TestResult[]
}> {
  console.log('🚀 Running Phase 2 System Tests...')
  console.log('=' .repeat(50))
  
  const results: TestResult[] = []
  
  // Run all tests
  const tests = [
    () => testDatabaseServices(),
    () => testRSSPollingEndpoint(baseUrl),
    () => testCronPollingEndpoint(baseUrl),
    () => testCleanupEndpoint(baseUrl),
  ]
  
  for (const test of tests) {
    try {
      const result = await test()
      results.push(result)
      
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${result.test}: ${result.message}`)
      
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      
    } catch (error) {
      results.push({
        test: 'Unknown Test',
        success: false,
        message: 'Test execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  const passedTests = results.filter(r => r.success).length
  const failedTests = results.filter(r => !r.success).length
  const totalTests = results.length
  
  console.log('')
  console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`)
  console.log('=' .repeat(50))
  
  return {
    success: passedTests === totalTests,
    totalTests,
    passedTests,
    failedTests,
    results
  }
}

// Auto-run test if this file is executed directly
if (require.main === module) {
  testPhase2System()
    .then(result => {
      console.log('🎉 Phase 2 testing completed!')
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      console.error('💥 Phase 2 testing failed:', error)
      process.exit(1)
    })
} 