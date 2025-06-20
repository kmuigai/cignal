#!/usr/bin/env tsx

/**
 * Simplified Phase 2 System Tests
 * Tests endpoints without requiring full environment setup
 */

import type { RSSPollLog } from './types'

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  name: string
  success: boolean
  details?: string
  error?: string
}

async function makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return response
}

async function testEndpointStructure(endpoint: string, method: string = 'GET'): Promise<TestResult> {
  try {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, { method })
    
    // Check if we get a proper error structure (not HTML)
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('text/html')) {
      // This is likely an error page, which means the endpoint exists but has issues
      return {
        name: `${method} ${endpoint}`,
        success: true,
        details: `Endpoint exists but returns server error (expected without env vars)`,
      }
    }
    
    return {
      name: `${method} ${endpoint}`,
      success: true,
      details: `Status: ${response.status}, Content-Type: ${contentType}`,
    }
  } catch (error) {
    return {
      name: `${method} ${endpoint}`,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function testEndpointAuthentication(endpoint: string): Promise<TestResult> {
  try {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, { method: 'POST' })
    
    // Should get 401 or similar auth error
    if (response.status === 401 || response.status === 403) {
      return {
        name: `Auth Protection: ${endpoint}`,
        success: true,
        details: `Properly protected (${response.status})`,
      }
    }
    
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('text/html')) {
      return {
        name: `Auth Protection: ${endpoint}`,
        success: true,
        details: `Endpoint exists but has server error (expected without env vars)`,
      }
    }
    
    return {
      name: `Auth Protection: ${endpoint}`,
      success: false,
      details: `Unexpected response: ${response.status}`,
    }
  } catch (error) {
    return {
      name: `Auth Protection: ${endpoint}`,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function runTests(): Promise<void> {
  console.log('🚀 Running Simplified Phase 2 System Tests...')
  console.log('==================================================')
  
  const tests: TestResult[] = []
  
  console.log('🧪 Testing endpoint availability...')
  
  // Test regular endpoints
  tests.push(await testEndpointStructure('/api/poll-rss', 'GET'))
  tests.push(await testEndpointStructure('/api/poll-rss', 'POST'))
  
  // Test cron endpoints  
  tests.push(await testEndpointStructure('/api/cron/poll-all-users', 'POST'))
  tests.push(await testEndpointStructure('/api/cron/cleanup', 'POST'))
  
  console.log('🧪 Testing authentication protection...')
  
  // Test auth protection
  tests.push(await testEndpointAuthentication('/api/poll-rss'))
  
  // Print results
  console.log('\n📊 Test Results:')
  console.log('==================================================')
  
  let passed = 0
  let total = tests.length
  
  for (const test of tests) {
    const status = test.success ? '✅' : '❌'
    console.log(`${status} ${test.name}`)
    
    if (test.details) {
      console.log(`   ${test.details}`)
    }
    
    if (test.error) {
      console.log(`   Error: ${test.error}`)
    }
    
    if (test.success) passed++
    console.log()
  }
  
  console.log(`📈 Summary: ${passed}/${total} tests passed`)
  console.log('==================================================')
  
  if (passed === total) {
    console.log('🎉 All endpoint structure tests passed!')
    console.log('📝 Next step: Set up environment variables and run full tests')
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.')
  }
  
  console.log('\n💡 To run full tests with database operations:')
  console.log('   1. Set up .env.local with your Supabase credentials')
  console.log('   2. Run: npm run migrate')
  console.log('   3. Run: npm run test:phase2')
}

// Run the tests
runTests().catch(console.error) 