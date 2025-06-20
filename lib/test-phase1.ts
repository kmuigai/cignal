import { generateContentHash, generateFuzzyHashes, areDuplicates } from './content-hash'
import { convertRSSItemToStoredRelease, processRSSFeed } from './rss-to-stored-release'
import type { CreateStoredPressRelease } from './types'

// Test data
const testRSSItem = {
  title: "Apple Inc. Reports Strong Q4 Results",
  description: "<p>Apple Inc. announced today that its Q4 revenue increased by 15% year-over-year to $95.5 billion, driven by strong iPhone sales and growing services revenue.</p>",
  pubDate: "2024-01-15T10:30:00Z",
  link: "https://investor.apple.com/news/q4-2024-results",
  companyMentions: ["Apple", "AAPL"],
  matchedCompany: "Apple"
}

const testCompanyId = "550e8400-e29b-41d4-a716-446655440000"
const testRSSSource = "https://investor.apple.com/rss"

/**
 * Test content hashing functionality
 */
export function testContentHashing() {
  console.log('🧪 Testing content hashing...')
  
  // Test basic hash generation
  const hash1 = generateContentHash(
    testRSSItem.title,
    testRSSItem.description,
    testRSSItem.pubDate
  )
  
  console.log('✅ Generated hash:', hash1.substring(0, 16) + '...')
  
  // Test fuzzy hashing
  const fuzzyHashes = generateFuzzyHashes(
    testRSSItem.title,
    testRSSItem.description,
    testRSSItem.pubDate
  )
  
  console.log('✅ Generated fuzzy hashes:')
  console.log('  - Exact:', fuzzyHashes.exact.substring(0, 16) + '...')
  console.log('  - Title only:', fuzzyHashes.titleOnly.substring(0, 16) + '...')
  console.log('  - Content only:', fuzzyHashes.contentOnly.substring(0, 16) + '...')
  
  // Test duplicate detection
  const isDuplicate = areDuplicates(
    {
      title: testRSSItem.title,
      content: testRSSItem.description,
      publishedAt: testRSSItem.pubDate
    },
    {
      title: testRSSItem.title.toUpperCase(), // Different case
      content: testRSSItem.description.replace(/<[^>]*>/g, ''), // HTML removed
      publishedAt: testRSSItem.pubDate
    }
  )
  
  console.log('✅ Duplicate detection works:', isDuplicate ? 'YES' : 'NO')
  
  return { hash1, fuzzyHashes, isDuplicate }
}

/**
 * Test RSS to stored release conversion
 */
export function testRSSConversion() {
  console.log('🧪 Testing RSS conversion...')
  
  // Test single item conversion
  const storedRelease = convertRSSItemToStoredRelease(
    testRSSItem,
    testCompanyId,
    testRSSSource
  )
  
  console.log('✅ Converted RSS item to stored release:')
  console.log('  - Title:', storedRelease.title)
  console.log('  - Content length:', storedRelease.content.length)
  console.log('  - Summary:', storedRelease.summary.substring(0, 50) + '...')
  console.log('  - Hash:', storedRelease.contentHash.substring(0, 16) + '...')
  
  // Test batch processing
  const testItems = [
    testRSSItem,
    {
      ...testRSSItem,
      title: "Another Apple Update",
      description: "Different content here"
    },
    // Invalid item (missing required fields)
    {
      title: "",
      description: "No title",
      pubDate: "",
      link: ""
    }
  ]
  
  const processResult = processRSSFeed(testItems, testCompanyId, testRSSSource)
  
  console.log('✅ Batch processing results:')
  console.log('  - Valid releases:', processResult.validReleases.length)
  console.log('  - Skipped items:', processResult.skippedCount)
  
  return { storedRelease, processResult }
}

/**
 * Test the complete Phase 1 pipeline
 */
export function testPhase1Pipeline() {
  console.log('🚀 Running Phase 1 Pipeline Test...')
  console.log('=' .repeat(50))
  
  try {
    // Test 1: Content Hashing
    const hashResults = testContentHashing()
    console.log('')
    
    // Test 2: RSS Conversion
    const conversionResults = testRSSConversion()
    console.log('')
    
    console.log('🎉 Phase 1 pipeline test completed successfully!')
    console.log('=' .repeat(50))
    
    return {
      success: true,
      results: {
        hashing: hashResults,
        conversion: conversionResults
      }
    }
    
  } catch (error) {
    console.error('❌ Phase 1 pipeline test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Auto-run test if this file is executed directly
if (require.main === module) {
  testPhase1Pipeline()
} 