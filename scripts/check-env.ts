/**
 * Environment Variable Checker for Phase 2
 * Run this to verify your setup before testing
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

interface EnvCheck {
  name: string
  value?: string
  required: boolean
  description: string
  status?: 'missing' | 'set' | 'default'
}

function checkEnvironment(): EnvCheck[] {
  const checks: EnvCheck[] = [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      required: true,
      description: 'Supabase project URL'
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: true,
      description: 'Supabase service role key (for migrations and cron jobs)'
    },
    {
      name: 'CRON_SECRET',
      value: process.env.CRON_SECRET,
      required: true,
      description: 'Secret for protecting cron endpoints'
    },
    {
      name: 'NEXT_PUBLIC_APP_URL',
      value: process.env.NEXT_PUBLIC_APP_URL,
      required: false,
      description: 'App URL for internal API calls (defaults to localhost:3000)'
    },
    {
      name: 'NODE_ENV',
      value: process.env.NODE_ENV,
      required: false,
      description: 'Environment mode'
    }
  ]

  return checks.map(check => {
    if (!check.value) {
      return { ...check, status: 'missing' as const }
    } else if (check.value.includes('your_') || check.value.includes('your-')) {
      return { ...check, status: 'default' as const }
    } else {
      return { ...check, status: 'set' as const }
    }
  })
}

function printEnvironmentStatus() {
  console.log('🔍 Environment Variable Check')
  console.log('=' .repeat(50))
  
  const checks = checkEnvironment()
  let hasErrors = false
  let hasWarnings = false
  
  checks.forEach(check => {
    const statusIcon = 
      check.status === 'set' ? '✅' :
      check.status === 'default' ? '⚠️' : '❌'
    
    const statusText = 
      check.status === 'set' ? 'SET' :
      check.status === 'default' ? 'DEFAULT' : 'MISSING'
    
    console.log(`${statusIcon} ${check.name}: ${statusText}`)
    console.log(`   ${check.description}`)
    
    if (check.required && check.status !== 'set') {
      hasErrors = true
    }
    
    if (check.status === 'default') {
      hasWarnings = true
    }
    
    console.log('')
  })
  
  console.log('📋 Summary')
  console.log('-' .repeat(20))
  
  if (hasErrors) {
    console.log('❌ Environment setup is INCOMPLETE')
    console.log('   Missing required variables. Please set them in .env.local')
  } else if (hasWarnings) {
    console.log('⚠️ Environment setup has WARNINGS')
    console.log('   Some variables are using default values')
  } else {
    console.log('✅ Environment setup is COMPLETE')
    console.log('   All variables are properly configured')
  }
  
  console.log('')
  console.log('📝 Next Steps:')
  console.log('1. Create .env.local with your actual values')
  console.log('2. Run: npm run migrate (to apply database changes)')
  console.log('3. Run: npm run dev (to start the server)')
  console.log('4. Run: npm run test:phase2 (to test the system)')
  
  return !hasErrors
}

function generateEnvTemplate() {
  console.log('📄 .env.local Template:')
  console.log('=' .repeat(30))
  console.log(`# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Phase 2: Background Processing
CRON_SECRET=your-secure-random-string-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Claude API Key for AI Analysis
CLAUDE_API_KEY=your_claude_api_key`)
  console.log('')
}

// Main execution
const isSetupComplete = printEnvironmentStatus()

if (!isSetupComplete) {
  console.log('')
  generateEnvTemplate()
  process.exit(1)
} else {
  console.log('🎉 Ready to test Phase 2!')
  process.exit(0)
} 