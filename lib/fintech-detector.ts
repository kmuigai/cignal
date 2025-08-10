/**
 * Fintech Detection Utility
 * Identifies finance and fintech related content in press releases
 */

export type FintechCategory = 
  | 'funding'
  | 'banking'
  | 'payments'
  | 'crypto'
  | 'lending'
  | 'regulatory'
  | 'markets'
  | 'wealthtech'
  | 'insurtech'
  | 'regtech'

interface FintechKeywordSet {
  category: FintechCategory
  keywords: string[]
  patterns: RegExp[]
}

/**
 * Comprehensive fintech keyword configuration
 * Each category contains keywords and patterns to match
 */
const FINTECH_KEYWORDS: FintechKeywordSet[] = [
  {
    category: 'funding',
    keywords: [
      'series a', 'series b', 'series c', 'series d', 'series e',
      'seed round', 'seed funding', 'pre-seed',
      'funding round', 'capital raise', 'raised', 'raises',
      'venture capital', 'vc funding', 'private equity',
      'valuation', 'valued at', 'unicorn',
      'investment', 'investor', 'lead investor',
      'term sheet', 'cap table', 'equity round'
    ],
    patterns: [
      /\$\d+(\.\d+)?[MBK]\s*(million|billion|thousand)?\s*(in\s+)?(funding|investment|capital)/gi,
      /raised\s+\$\d+(\.\d+)?[MBK]/gi,
      /\d+(\.\d+)?[MBK]\s+round/gi,
      /series\s+[A-E]\d?/gi
    ]
  },
  {
    category: 'banking',
    keywords: [
      'digital banking', 'neobank', 'challenger bank',
      'banking as a service', 'baas', 'embedded banking',
      'banking license', 'bank charter', 'fdic',
      'core banking', 'open banking', 'banking api',
      'deposit', 'withdrawal', 'account opening',
      'kyc', 'know your customer', 'aml', 'anti money laundering',
      'checking account', 'savings account', 'money market'
    ],
    patterns: [
      /bank(ing)?\s+(license|charter|regulation)/gi,
      /FDIC[\s-]?insured/gi,
      /digital\s+bank/gi,
      /neo[\s-]?bank/gi
    ]
  },
  {
    category: 'payments',
    keywords: [
      'payment processing', 'payment gateway', 'payment processor',
      'stripe', 'square', 'paypal', 'adyen', 'checkout.com',
      'point of sale', 'pos system', 'terminal',
      'card processing', 'credit card', 'debit card',
      'ach', 'wire transfer', 'swift', 'sepa',
      'payment rails', 'payment infrastructure',
      'digital wallet', 'mobile payment', 'contactless',
      'buy now pay later', 'bnpl', 'installments',
      'merchant services', 'payment service provider', 'psp'
    ],
    patterns: [
      /payment\s+(gateway|processing|processor|platform)/gi,
      /pos\s+system/gi,
      /buy\s+now\s+pay\s+later/gi,
      /BNPL/g
    ]
  },
  {
    category: 'crypto',
    keywords: [
      'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain',
      'defi', 'decentralized finance', 'web3',
      'smart contract', 'nft', 'token', 'tokenization',
      'crypto exchange', 'digital asset', 'stablecoin',
      'cbdc', 'central bank digital currency',
      'wallet', 'crypto wallet', 'cold storage',
      'mining', 'staking', 'yield farming',
      'dex', 'decentralized exchange', 'liquidity pool'
    ],
    patterns: [
      /crypto(currency)?/gi,
      /block[\s-]?chain/gi,
      /\bNFT\b/g,
      /\bDeFi\b/gi,
      /web\s?3(\.\d)?/gi,
      /\b(BTC|ETH|USDC|USDT)\b/g
    ]
  },
  {
    category: 'lending',
    keywords: [
      'lending platform', 'loan origination', 'underwriting',
      'credit scoring', 'credit risk', 'risk assessment',
      'personal loan', 'business loan', 'mortgage',
      'line of credit', 'revolving credit',
      'apr', 'annual percentage rate', 'interest rate',
      'default rate', 'charge-off', 'collections',
      'loan servicing', 'debt consolidation',
      'peer to peer lending', 'p2p lending'
    ],
    patterns: [
      /lending\s+(platform|marketplace|solution)/gi,
      /loan\s+(origination|servicing|platform)/gi,
      /credit\s+(scoring|risk|assessment)/gi,
      /\bAPR\b/g,
      /P2P\s+lending/gi
    ]
  },
  {
    category: 'regulatory',
    keywords: [
      'sec', 'securities and exchange commission',
      'finra', 'occ', 'cfpb', 'federal reserve', 'fed',
      'compliance', 'regulatory approval', 'regulation',
      'license', 'charter', 'registration',
      'audit', 'examination', 'enforcement',
      'anti money laundering', 'aml', 'kyc',
      'dodd-frank', 'basel iii', 'mifid',
      'gdpr', 'psd2', 'open banking regulation',
      'sandbox', 'regulatory sandbox'
    ],
    patterns: [
      /\b(SEC|FINRA|OCC|CFPB|FDIC|Fed)\b/g,
      /regulatory\s+(approval|compliance|framework)/gi,
      /financial\s+regulation/gi,
      /\b(AML|KYC|BSA)\b/g,
      /regulatory\s+sandbox/gi
    ]
  },
  {
    category: 'markets',
    keywords: [
      'ipo', 'initial public offering', 'going public',
      'spac', 'direct listing', 'public offering',
      'acquisition', 'merger', 'm&a', 'buyout',
      'stock market', 'nasdaq', 'nyse', 'exchange',
      'trading', 'securities', 'equities', 'bonds',
      'market cap', 'market capitalization',
      'earnings', 'revenue', 'ebitda', 'profit margin',
      // Add major tech companies and business terms
      'apple', 'tesla', 'amazon', 'google', 'microsoft', 'meta',
      'openai', 'chatgpt', 'artificial intelligence', 'ai',
      'technology', 'tech company', 'silicon valley',
      'business', 'enterprise', 'corporate', 'ceo', 'cfo'
    ],
    patterns: [
      /\bIPO\b/g,
      /going\s+public/gi,
      /\bSPAC\b/g,
      /\bM&A\b/g,
      /(merger|acquisition|acquire)/gi,
      /\$\d+(\.\d+)?[BM]\s+(acquisition|merger|deal)/gi,
      /(apple|tesla|amazon|google|microsoft|meta)\s+(earnings|revenue|stock|announces)/gi,
      /(tech|technology)\s+(earnings|results|performance)/gi,
      /\b(AI|artificial intelligence)\b/gi
    ]
  },
  {
    category: 'wealthtech',
    keywords: [
      'robo advisor', 'robo-advisor', 'automated investing',
      'wealth management', 'asset management',
      'portfolio management', 'investment platform',
      'financial planning', 'retirement planning',
      'etf', 'mutual fund', 'index fund',
      'brokerage', 'trading platform', 'investment app',
      'financial advisor', 'ria', 'registered investment advisor'
    ],
    patterns: [
      /robo[\s-]?advisor/gi,
      /wealth\s+(management|tech)/gi,
      /investment\s+(platform|app|advisor)/gi,
      /\bETF\b/g,
      /\bRIA\b/g
    ]
  },
  {
    category: 'insurtech',
    keywords: [
      'insurtech', 'insurance technology',
      'digital insurance', 'embedded insurance',
      'underwriting', 'claims processing', 'claims automation',
      'actuarial', 'risk modeling', 'premium',
      'policy', 'coverage', 'deductible',
      'reinsurance', 'parametric insurance',
      'usage-based insurance', 'ubi', 'telematics'
    ],
    patterns: [
      /insur(ance)?[\s-]?tech/gi,
      /digital\s+insurance/gi,
      /embedded\s+insurance/gi,
      /claims\s+(processing|automation)/gi,
      /usage[\s-]based\s+insurance/gi
    ]
  },
  {
    category: 'regtech',
    keywords: [
      'regtech', 'regulatory technology',
      'compliance automation', 'compliance platform',
      'risk management', 'regulatory reporting',
      'transaction monitoring', 'suspicious activity',
      'sanctions screening', 'pep screening',
      'identity verification', 'document verification',
      'audit trail', 'compliance dashboard'
    ],
    patterns: [
      /reg[\s-]?tech/gi,
      /compliance\s+(automation|platform|technology)/gi,
      /regulatory\s+(technology|reporting)/gi,
      /transaction\s+monitoring/gi,
      /sanctions\s+screening/gi
    ]
  }
]

/**
 * Detection result with categories and relevance score
 */
export interface FintechDetectionResult {
  isFintech: boolean
  categories: FintechCategory[]
  relevanceScore: number
  matchedKeywords: string[]
}

/**
 * Analyzes text content to detect fintech-related topics
 * @param title - Title of the content
 * @param content - Main content/description
 * @returns Detection result with categories and relevance score
 */
export function detectFintechContent(
  title: string,
  content: string
): FintechDetectionResult {
  const fullText = `${title} ${content}`.toLowerCase()
  const categories = new Set<FintechCategory>()
  const matchedKeywords = new Set<string>()
  let matchCount = 0

  // Check each category
  for (const keywordSet of FINTECH_KEYWORDS) {
    let categoryMatches = 0

    // Check keywords
    for (const keyword of keywordSet.keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        categoryMatches++
        matchedKeywords.add(keyword)
      }
    }

    // Check regex patterns
    for (const pattern of keywordSet.patterns) {
      const matches = fullText.match(pattern)
      if (matches && matches.length > 0) {
        categoryMatches += matches.length
        matches.forEach(match => matchedKeywords.add(match))
      }
    }

    // If we have matches in this category, add it
    if (categoryMatches > 0) {
      categories.add(keywordSet.category)
      matchCount += categoryMatches
    }
  }

  // Calculate relevance score (0-100)
  // Higher score for more matches and more categories
  const categoryBonus = categories.size * 10
  const matchBonus = Math.min(matchCount * 5, 50)
  const relevanceScore = Math.min(categoryBonus + matchBonus, 100)

  return {
    isFintech: categories.size > 0,
    categories: Array.from(categories),
    relevanceScore,
    matchedKeywords: Array.from(matchedKeywords)
  }
}

/**
 * Quick check if content is fintech-related (optimized for performance)
 * @param title - Title of the content
 * @param content - Main content/description
 * @returns Boolean indicating if content is fintech-related
 */
export function isFintechContent(title: string, content: string): boolean {
  const result = detectFintechContent(title, content)
  return result.isFintech
}

/**
 * Get the primary fintech category for content
 * @param title - Title of the content
 * @param content - Main content/description
 * @returns Primary category or null if not fintech
 */
export function getPrimaryFintechCategory(
  title: string,
  content: string
): FintechCategory | null {
  const result = detectFintechContent(title, content)
  return result.categories.length > 0 ? result.categories[0] : null
}