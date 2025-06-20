import type { Company, PressRelease } from "./types"

// Helper function to generate recent dates
const getRecentDate = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

export const mockCompanies: Company[] = [
  {
    id: "1",
    userId: "mock-user",
    name: "Blackstone",
    variations: ["Blackstone Inc.", "Blackstone Group", "BX", "Blackstone LP"],
    website: "https://blackstone.com",
    industry: "Private Equity",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    userId: "mock-user",
    name: "Apollo",
    variations: ["Apollo Global Management", "Apollo Global", "APO", "Apollo Management"],
    website: "https://apollo.com",
    industry: "Private Equity",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    userId: "mock-user",
    name: "CAIS",
    variations: ["CAIS Group", "CAIS Holdings", "CAIS Inc."],
    website: "https://cais.com",
    industry: "Alternative Investments",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "4",
    userId: "mock-user",
    name: "Addepar",
    variations: ["Addepar Inc.", "Addepar LLC"],
    website: "https://addepar.com",
    industry: "Wealth Management Technology",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "5",
    userId: "mock-user",
    name: "Subscribe",
    variations: ["Subscribe Technologies", "Subscribe Inc."],
    website: "https://subscribe.com",
    industry: "Subscription Management",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
]

export const mockPressReleases: PressRelease[] = [
  {
    id: "1",
    title: "Blackstone Announces Record Q4 2024 Results with $1.3 Trillion in Assets Under Management",
    content:
      'NEW YORK, January 15, 2025 - Blackstone Inc. (NYSE: BX) today announced its fourth quarter and full year 2024 results, reporting record assets under management of $1.3 trillion and strong performance across all business segments. The firm\'s distributable earnings reached $1.2 billion for the quarter, representing a 15% increase year-over-year. "We delivered exceptional results in 2024, driven by our disciplined investment approach and expanding into renewable energy sectors," said Stephen Schwarzman, Chairman and CEO. The company also announced the launch of a new AI-focused fund targeting $5 billion in commitments, positioning Blackstone at the forefront of technology investments. However, the firm noted potential headwinds from rising interest rates and geopolitical tensions that could impact future performance.',
    summary:
      "Blackstone reports record Q4 2024 results with $1.3T AUM and 15% earnings growth, while launching new AI fund and noting market risks.",
    sourceUrl: "https://www.prnewswire.com/news-releases/blackstone-announces-record-q4-2024-results-302345678.html",
    publishedAt: getRecentDate(2),
    companyId: "1",
    aiAnalysis: {
      summary:
        "Blackstone delivered strong Q4 2024 performance with record AUM of $1.3T and 15% earnings growth, while strategically expanding into AI and renewable energy sectors despite noting market headwinds.",
      keyPoints: ["Record $1.3T AUM", "$5B AI fund launch", "15% earnings growth", "Renewable energy expansion"],
    },
    highlights: [
      { type: "financial", text: "$1.3 trillion in assets under management", start: 145, end: 185 },
      { type: "financial", text: "$1.2 billion for the quarter", start: 298, end: 325 },
      { type: "financial", text: "15% increase year-over-year", start: 340, end: 365 },
      { type: "opportunity", text: "expanding into renewable energy sectors", start: 485, end: 522 },
      { type: "strategic", text: "new AI-focused fund targeting $5 billion", start: 625, end: 665 },
      {
        type: "risk",
        text: "potential headwinds from rising interest rates and geopolitical tensions",
        start: 780,
        end: 850,
      },
    ],
    createdAt: getRecentDate(2),
  },
  {
    id: "2",
    title: "Apollo Global Management Completes $25 Billion Infrastructure Fund Closing",
    content:
      'NEW YORK, January 12, 2025 - Apollo Global Management, Inc. (NYSE: APO) announced the successful final closing of its Apollo Infrastructure Fund at $25 billion, exceeding its initial target of $20 billion. The fund will focus on critical infrastructure investments across North America and Europe, including data centers, renewable energy projects, and transportation networks. "This record fundraising demonstrates strong investor confidence in our infrastructure strategy," said Marc Rowan, Chief Executive Officer. The fund has already committed $8 billion to strategic acquisitions, including a major data center portfolio and several wind energy projects. Apollo expects infrastructure investments to generate stable, long-term returns while supporting the energy transition. The firm cautioned that regulatory changes in key markets could affect deployment timelines and returns.',
    summary:
      "Apollo closes record $25B infrastructure fund, exceeding target, with focus on data centers and renewable energy across North America and Europe.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/apollo-global-management-completes-25-billion-infrastructure-fund-302345679.html",
    publishedAt: getRecentDate(5),
    companyId: "2",
    aiAnalysis: {
      summary:
        "Apollo successfully raised a record $25B infrastructure fund, surpassing targets by 25%, with strategic focus on data centers and renewable energy to capitalize on digital transformation and energy transition trends.",
      keyPoints: ["$25B fund closing", "Exceeded $20B target", "Data center focus", "Energy transition play"],
    },
    highlights: [
      { type: "financial", text: "$25 billion", start: 125, end: 135 },
      { type: "financial", text: "exceeding its initial target of $20 billion", start: 137, end: 175 },
      {
        type: "strategic",
        text: "data centers, renewable energy projects, and transportation networks",
        start: 285,
        end: 350,
      },
      { type: "financial", text: "$8 billion to strategic acquisitions", start: 520, end: 550 },
      { type: "opportunity", text: "supporting the energy transition", start: 720, end: 750 },
      {
        type: "risk",
        text: "regulatory changes in key markets could affect deployment timelines",
        start: 780,
        end: 845,
      },
    ],
    createdAt: getRecentDate(5),
  },
  {
    id: "3",
    title: "CAIS Launches Revolutionary AI-Powered Alternative Investment Platform",
    content:
      'NEW YORK, January 10, 2025 - CAIS, the leading alternative investment platform, today unveiled its next-generation AI-powered investment discovery and due diligence system. The new platform leverages machine learning algorithms to analyze over 10,000 alternative investment products, providing personalized recommendations for financial advisors and their clients. "This breakthrough technology will transform how advisors discover and evaluate alternative investments," said Matt Brown, CEO of CAIS. The platform processes real-time market data, performance analytics, and risk assessments to deliver actionable insights within seconds. Early beta testing showed a 40% improvement in advisor efficiency and client satisfaction scores. However, the company acknowledged concerns about AI reliability in financial decision-making and plans extensive testing before full deployment. CAIS expects the platform to drive significant revenue growth in 2025.',
    summary:
      "CAIS unveils AI-powered alternative investment platform with machine learning capabilities, showing 40% efficiency improvements in beta testing.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/cais-launches-revolutionary-ai-powered-alternative-investment-platform-302345680.html",
    publishedAt: getRecentDate(7),
    companyId: "3",
    aiAnalysis: {
      summary:
        "CAIS launched an innovative AI-powered platform that analyzes 10,000+ alternative investments, demonstrating 40% efficiency gains in beta testing while addressing AI reliability concerns in financial services.",
      keyPoints: [
        "AI-powered platform launch",
        "10,000+ products analyzed",
        "40% efficiency improvement",
        "Revenue growth expected",
      ],
    },
    highlights: [
      { type: "strategic", text: "AI-powered investment discovery and due diligence system", start: 145, end: 195 },
      { type: "financial", text: "over 10,000 alternative investment products", start: 250, end: 290 },
      { type: "opportunity", text: "40% improvement in advisor efficiency", start: 580, end: 615 },
      { type: "risk", text: "concerns about AI reliability in financial decision-making", start: 720, end: 775 },
      { type: "financial", text: "drive significant revenue growth in 2025", start: 850, end: 885 },
    ],
    createdAt: getRecentDate(7),
  },
  {
    id: "4",
    title: "Addepar Acquires WealthTech Startup for $500 Million to Expand Portfolio Analytics",
    content:
      "MOUNTAIN VIEW, CA, January 8, 2025 - Addepar, Inc., the leading wealth management technology platform, announced the acquisition of PortfolioIQ, a cutting-edge analytics startup, for $500 million in cash and stock. The acquisition will integrate advanced portfolio optimization and risk management capabilities into Addepar's existing platform, serving over 4,000 advisors managing $6 trillion in assets. \"This strategic acquisition accelerates our mission to democratize sophisticated investment analytics,\" said Eric Poirier, CEO of Addepar. PortfolioIQ's proprietary algorithms will enhance Addepar's ability to provide real-time portfolio insights and automated rebalancing recommendations. The combined platform is expected to reduce client onboarding time by 60% and increase advisor productivity significantly. Integration challenges and potential client churn during the transition period remain key risks to monitor.",
    summary:
      "Addepar acquires PortfolioIQ for $500M to enhance portfolio analytics capabilities for 4,000+ advisors managing $6T in assets.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/addepar-acquires-wealthtech-startup-for-500-million-302345681.html",
    publishedAt: getRecentDate(10),
    companyId: "4",
    aiAnalysis: {
      summary:
        "Addepar's $500M acquisition of PortfolioIQ strengthens its wealth management platform with advanced analytics, serving 4,000+ advisors and $6T in assets while promising 60% faster client onboarding.",
      keyPoints: [
        "$500M acquisition",
        "Portfolio analytics enhancement",
        "4,000+ advisors served",
        "60% faster onboarding",
      ],
    },
    highlights: [
      { type: "financial", text: "$500 million in cash and stock", start: 180, end: 210 },
      { type: "financial", text: "over 4,000 advisors managing $6 trillion in assets", start: 350, end: 395 },
      {
        type: "strategic",
        text: "advanced portfolio optimization and risk management capabilities",
        start: 240,
        end: 295,
      },
      { type: "opportunity", text: "reduce client onboarding time by 60%", start: 680, end: 715 },
      { type: "risk", text: "Integration challenges and potential client churn", start: 780, end: 825 },
    ],
    createdAt: getRecentDate(10),
  },
  {
    id: "5",
    title: "Subscribe Technologies Raises $150 Million Series C to Accelerate Global Expansion",
    content:
      "SAN FRANCISCO, January 5, 2025 - Subscribe Technologies, the leading subscription management platform, announced a $150 million Series C funding round led by Sequoia Capital with participation from existing investors. The funding will fuel international expansion into European and Asian markets, where subscription economy growth is accelerating rapidly. \"We're seeing unprecedented demand for subscription management solutions as businesses shift to recurring revenue models,\" said Sarah Chen, CEO of Subscribe. The company currently serves over 2,500 enterprise clients and processes $50 billion in annual recurring revenue. Subscribe plans to double its engineering team and invest heavily in AI-powered churn prediction and customer lifetime value optimization. Market saturation in North America and increasing competition from established players pose potential challenges to the company's aggressive growth targets.",
    summary:
      "Subscribe Technologies secures $150M Series C led by Sequoia to expand globally, serving 2,500+ clients processing $50B ARR.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/subscribe-technologies-raises-150-million-series-c-302345682.html",
    publishedAt: getRecentDate(12),
    companyId: "5",
    aiAnalysis: {
      summary:
        "Subscribe Technologies raised $150M Series C from Sequoia Capital to fuel global expansion, leveraging its position serving 2,500+ enterprise clients with $50B in processed ARR while facing North American market saturation risks.",
      keyPoints: [
        "$150M Series C funding",
        "Sequoia Capital led",
        "2,500+ enterprise clients",
        "Global expansion focus",
      ],
    },
    highlights: [
      { type: "financial", text: "$150 million Series C funding", start: 125, end: 150 },
      { type: "strategic", text: "international expansion into European and Asian markets", start: 220, end: 275 },
      { type: "financial", text: "over 2,500 enterprise clients", start: 480, end: 510 },
      { type: "financial", text: "$50 billion in annual recurring revenue", start: 525, end: 560 },
      {
        type: "opportunity",
        text: "AI-powered churn prediction and customer lifetime value optimization",
        start: 650,
        end: 720,
      },
      { type: "risk", text: "Market saturation in North America and increasing competition", start: 750, end: 805 },
    ],
    createdAt: getRecentDate(12),
  },
  // Additional press releases with recent dates
  {
    id: "6",
    title: "Blackstone Real Estate Income Trust Declares Monthly Distribution of $0.12 Per Share",
    content:
      "NEW YORK, January 3, 2025 - Blackstone Real Estate Income Trust, Inc. (NASDAQ: BREIT) announced its board of directors declared a monthly distribution of $0.12 per share for January 2025, maintaining its consistent distribution policy. The REIT, which focuses on high-quality real estate investments across multiple sectors, continues to deliver stable income to shareholders despite market volatility. BREIT's portfolio includes premium office buildings, industrial facilities, and residential properties valued at over $180 billion. The trust reported strong occupancy rates of 94% across its portfolio and expects continued growth in rental income. However, rising interest rates and potential economic slowdown could pressure property valuations and rental demand in certain markets.",
    summary:
      "BREIT maintains $0.12 monthly distribution with 94% occupancy across $180B real estate portfolio despite market headwinds.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/blackstone-real-estate-income-trust-declares-monthly-distribution-302345683.html",
    publishedAt: getRecentDate(15),
    companyId: "1",
    aiAnalysis: {
      summary:
        "BREIT maintains consistent monthly distributions and strong 94% occupancy rates across its $180B portfolio while navigating interest rate and economic headwinds.",
      keyPoints: [
        "$0.12 monthly distribution",
        "94% occupancy rate",
        "$180B portfolio value",
        "Interest rate concerns",
      ],
    },
    highlights: [
      { type: "financial", text: "$0.12 per share for January 2025", start: 145, end: 175 },
      { type: "financial", text: "valued at over $180 billion", start: 420, end: 445 },
      { type: "financial", text: "occupancy rates of 94%", start: 485, end: 510 },
      { type: "opportunity", text: "continued growth in rental income", start: 540, end: 570 },
      { type: "risk", text: "rising interest rates and potential economic slowdown", start: 590, end: 640 },
    ],
    createdAt: getRecentDate(15),
  },
  {
    id: "7",
    title: "Apollo Strategic Fund III Reaches First Close at $12 Billion",
    content:
      'NEW YORK, December 28, 2024 - Apollo Global Management announced that Apollo Strategic Fund III has reached its first close at $12 billion, with strong investor demand from institutional investors worldwide. The fund focuses on opportunistic investments in distressed assets, corporate carve-outs, and special situations across various industries. "We\'re seeing exceptional opportunities in the current market environment," said Jim Zelter, Co-President of Apollo. The fund has already identified several potential investments in the technology and healthcare sectors, where market dislocations have created attractive entry points. Apollo expects to reach its target size of $20 billion by mid-2025. Market volatility and credit tightening could create additional investment opportunities but may also increase execution risks.',
    summary:
      "Apollo Strategic Fund III reaches $12B first close, targeting distressed assets and special situations with $20B final target.",
    sourceUrl:
      "https://www.prnewswire.com/news-releases/apollo-strategic-fund-iii-reaches-first-close-at-12-billion-302345684.html",
    publishedAt: getRecentDate(20),
    companyId: "2",
    aiAnalysis: {
      summary:
        "Apollo Strategic Fund III achieved strong $12B first close targeting opportunistic investments in distressed assets, with plans to reach $20B by mid-2025 amid favorable market dislocations.",
      keyPoints: ["$12B first close", "Distressed asset focus", "$20B target size", "Market opportunities"],
    },
    highlights: [
      { type: "financial", text: "first close at $12 billion", start: 125, end: 150 },
      {
        type: "strategic",
        text: "opportunistic investments in distressed assets, corporate carve-outs",
        start: 220,
        end: 280,
      },
      { type: "opportunity", text: "market dislocations have created attractive entry points", start: 520, end: 570 },
      { type: "financial", text: "target size of $20 billion by mid-2025", start: 600, end: 635 },
      { type: "risk", text: "Market volatility and credit tightening", start: 650, end: 685 },
    ],
    createdAt: getRecentDate(20),
  },
]
