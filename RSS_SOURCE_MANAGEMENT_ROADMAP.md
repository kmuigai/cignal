# RSS Source Management - Implementation Roadmap

## 📋 Overview
Enable users to configure custom RSS feeds per company, dramatically increasing relevant content beyond the current PRNewswire limitation.

## 🎯 Goals
- Allow company-specific RSS feed configuration
- Support multiple RSS feed types (IR News, SEC Filings, Industry Publications)
- Provide feed health monitoring and management
- Improve content relevance and volume significantly

---

## Phase 1: Core Infrastructure 🏗️

### 1.1 Database Schema Migration
**Create new migration script:** `scripts/add-rss-sources-table.sql`

- [ ] **Step 1: Create rss_sources table** (consistent with existing schema)
  ```sql
  -- Create rss_sources table (follows existing patterns)
  CREATE TABLE IF NOT EXISTS rss_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    feed_url TEXT NOT NULL,
    feed_name TEXT NOT NULL,
    feed_type TEXT CHECK (feed_type IN ('ir-news', 'sec-filings', 'general-news', 'industry', 'custom')) DEFAULT 'custom',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    article_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    -- Ensure user can only access their own RSS sources
    CONSTRAINT rss_sources_user_company_check 
      CHECK (user_id = (SELECT user_id FROM companies WHERE id = company_id))
  );
  ```

- [ ] **Step 2: Add performance indexes** (matching existing pattern)
  ```sql
  CREATE INDEX IF NOT EXISTS rss_sources_company_id_idx ON rss_sources(company_id);
  CREATE INDEX IF NOT EXISTS rss_sources_user_id_idx ON rss_sources(user_id);
  CREATE INDEX IF NOT EXISTS rss_sources_enabled_idx ON rss_sources(enabled) WHERE enabled = true;
  CREATE INDEX IF NOT EXISTS rss_sources_last_fetched_idx ON rss_sources(last_fetched_at);
  ```

- [ ] **Step 3: Enable Row Level Security** (same pattern as companies table)
  ```sql
  ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Users can view own RSS sources" ON rss_sources
    FOR SELECT USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can insert own RSS sources" ON rss_sources
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update own RSS sources" ON rss_sources
    FOR UPDATE USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete own RSS sources" ON rss_sources
    FOR DELETE USING (auth.uid() = user_id);
  ```

- [ ] **Step 4: Add updated_at trigger** (using existing function)
  ```sql
  CREATE TRIGGER update_rss_sources_updated_at BEFORE UPDATE ON rss_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  ```

- [ ] **Step 5: Run migration on Supabase**
  - Execute migration script in Supabase SQL editor
  - Verify table creation and RLS policies
  - Test with sample data

### 1.2 RSS Sources Data Models & Manager
**File:** `lib/types.ts` and `lib/supabase/database.ts`

- [ ] **Step 6: Add TypeScript interfaces** (extend existing types)
  ```typescript
  // Add to lib/types.ts
  export interface RSSSource {
    id: string
    companyId: string
    userId: string
    feedUrl: string
    feedType: 'ir-news' | 'sec-filings' | 'general-news' | 'industry' | 'custom'
    feedName: string
    enabled: boolean
    createdAt: string
    updatedAt: string
    lastFetchedAt?: string
    lastError?: string
    articleCount: number
    successRate: number
  }

  // Add to database.ts
  export interface DatabaseRSSSource {
    id: string
    company_id: string
    user_id: string
    feed_url: string
    feed_type: string
    feed_name: string
    enabled: boolean
    created_at: string
    updated_at: string
    last_fetched_at: string | null
    last_error: string | null
    article_count: number
    success_rate: number
  }
  ```

- [ ] **Step 7: Create RSSSourceManager class** (follows CompanyManager pattern)
  ```typescript
  // Add to lib/supabase/database.ts
  export class RSSSourceManager {
    private supabase = createClientComponentClient()

    async getRSSSourcesByCompany(companyId: string): Promise<RSSSource[]>
    async createRSSSource(companyId: string, source: Omit<RSSSource, 'id' | 'companyId' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<RSSSource>
    async updateRSSSource(id: string, updates: Partial<RSSSource>): Promise<RSSSource>
    async deleteRSSSource(id: string): Promise<void>
    async testRSSFeed(feedUrl: string): Promise<{ valid: boolean; title?: string; itemCount?: number; error?: string }>
    private mapDatabaseToRSSSource(dbSource: DatabaseRSSSource): RSSSource
  }
  ```

- [ ] **Step 8: Add RSS feed validation utilities**
  ```typescript
  // Add to lib/rss-validation.ts
  export const validateRSSUrl = (url: string): { valid: boolean; error?: string }
  export const detectRSSFeedType = (url: string): RSSSource['feedType']
  export const testRSSConnectivity = async (url: string): Promise<{ success: boolean; data?: any; error?: string }>
  ```

---

## Phase 2: Backend API 🚀

### 2.1 RSS Sources CRUD API Routes
**Files to create:** API route handlers following existing pattern

- [ ] **Step 9: Create** `app/api/companies/[id]/rss-sources/route.ts`
  ```typescript
  // GET /api/companies/:id/rss-sources - Fetch all RSS sources for company
  export async function GET(request: Request, { params }: { params: { id: string } })
  
  // POST /api/companies/:id/rss-sources - Add new RSS source
  export async function POST(request: Request, { params }: { params: { id: string } })
  ```

- [ ] **Step 10: Create** `app/api/rss-sources/[id]/route.ts` 
  ```typescript
  // PUT /api/rss-sources/:id - Update RSS source
  export async function PUT(request: Request, { params }: { params: { id: string } })
  
  // DELETE /api/rss-sources/:id - Delete RSS source  
  export async function DELETE(request: Request, { params }: { params: { id: string } })
  ```

- [ ] **Step 11: Create** `app/api/rss-sources/[id]/test/route.ts`
  ```typescript
  // POST /api/rss-sources/:id/test - Test RSS feed connectivity
  export async function POST(request: Request, { params }: { params: { id: string } })
  ```

- [ ] **Step 12: Create** `app/api/rss-sources/validate/route.ts`
  ```typescript  
  // POST /api/rss-sources/validate - Validate RSS URL without saving
  export async function POST(request: Request)
  ```

### 2.2 Enhanced RSS Fetching Integration
**Files to modify:** `app/api/fetch-releases/route.ts`, `hooks/use-enhanced-press-releases.ts`

- [ ] **Step 13: Update RSS fetching to include company-specific sources**
  ```typescript
  // Modify app/api/fetch-releases/route.ts
  // 1. Query company RSS sources from database
  // 2. Combine with existing general feeds
  // 3. Fetch all sources in parallel
  // 4. Track source performance metrics
  ```

- [ ] **Step 14: Create RSS source integration hook**
  ```typescript
  // Create hooks/use-rss-sources.ts
  export function useRSSSourcesByCompany(companyId: string): {
    sources: RSSSource[]
    loading: boolean
    error: string | null
    addSource: (source: Omit<RSSSource, 'id'>) => Promise<RSSSource>
    updateSource: (id: string, updates: Partial<RSSSource>) => Promise<void>
    deleteSource: (id: string) => Promise<void>
    testSource: (url: string) => Promise<ValidationResult>
  }
  ```

- [ ] **Step 15: Update enhanced press releases hook**
  ```typescript  
  // Modify hooks/use-enhanced-press-releases.ts to:
  // 1. Include company-specific RSS sources in fetch
  // 2. Track per-source article counts
  // 3. Handle source-specific errors gracefully
  ```

---

## Phase 3: User Interface 🎨

### 3.1 RSS Management in Company Modal
**File to modify:** `components/dashboard/company-management-modal.tsx`

- [ ] **Step 16: Add RSS Sources tab to existing Company Modal**
  ```typescript
  // Add new tab: "RSS Sources" alongside "Companies" and "AI Settings"
  // Reuse existing modal structure and styling patterns
  ```

- [ ] **Step 17: Create RSS Sources management section**
  ```typescript
  // Create components/dashboard/rss-sources-section.tsx
  // - List existing RSS sources for selected company
  // - Enable/disable toggles for each source
  // - Add/Edit/Delete functionality
  // - Feed health status indicators
  ```

- [ ] **Step 18: Create RSS Source form components**
  ```typescript
  // Create components/dashboard/rss-source-form.tsx
  // - Feed URL input with real-time validation
  // - Feed name input (auto-populate from URL)
  // - Feed type dropdown (ir-news, sec-filings, etc.)
  // - "Test Feed" button with loading state
  // - Save/Cancel buttons
  ```

### 3.2 RSS Source Components
- [ ] `RSSSourceList` component
- [ ] `RSSSourceForm` component  
- [ ] `RSSSourceItem` component with status
- [ ] `TestFeedButton` component
- [ ] RSS source validation and error messaging

### 3.3 Enhanced Activity Feed
- [ ] Show RSS source attribution per article
- [ ] Filter articles by RSS source
- [ ] RSS source performance metrics in UI

---

## Phase 4: Feed Discovery & Templates 🔍

### 4.1 Auto-Discovery Features
- [ ] RSS feed auto-discovery from company websites
- [ ] Suggest popular RSS feeds for known companies
- [ ] Common feed URL patterns (Yahoo Finance, SEC EDGAR, etc.)

### 4.2 RSS Source Templates
- [ ] **Fintech Company Template**
  - Industry publications (TechCrunch, Fintech News)
  - Regulatory feeds (SEC, FINRA)
  - Company IR feed
  
- [ ] **Public Company Template**
  - SEC EDGAR filings
  - Yahoo Finance feeds
  - Company investor relations
  
- [ ] **Private Company Template**  
  - Industry news feeds
  - Company blog/news feeds
  - Funding databases

### 4.3 Popular Sources Database
- [ ] Curated list of high-quality RSS sources
- [ ] Source recommendations based on company industry
- [ ] Community-driven source suggestions

---

## Phase 5: Advanced Management 📊

### 5.1 Bulk Operations
- [ ] Import RSS sources from CSV/JSON
- [ ] Export RSS source configurations
- [ ] Bulk enable/disable feeds
- [ ] Copy RSS sources between similar companies

### 5.2 Feed Health & Monitoring  
- [ ] RSS feed health dashboard
- [ ] Dead feed detection and alerts
- [ ] Feed update frequency tracking
- [ ] Article volume metrics per source
- [ ] Performance analytics (response time, success rate)

### 5.3 Advanced Filtering
- [ ] Filter articles by RSS source
- [ ] Source-specific relevance scoring
- [ ] Feed quality ratings
- [ ] Source-based article categorization

---

## 📈 Success Metrics

### Immediate (Phase 1-3)
- [ ] Users can add custom RSS sources per company
- [ ] 5x increase in relevant articles per company
- [ ] RSS source management UI is intuitive and fast

### Long-term (Phase 4-5)  
- [ ] 90%+ RSS feed uptime
- [ ] Users discover new sources through templates
- [ ] Feed health monitoring prevents stale data
- [ ] Bulk operations improve power user efficiency

---

## 🚀 Implementation Priority

### **Week 1-2: Phase 1** (Foundation)
Most critical - establishes the core infrastructure

### **Week 3-4: Phase 2** (Backend)  
Enables RSS source CRUD operations

### **Week 5-6: Phase 3** (UI)
Makes the feature accessible to users

### **Future: Phase 4-5** (Polish)
Advanced features for power users

---

## 🚀 Ready-to-Implement Summary

### **To Get Started (Phase 1):**
1. **Run database migration:** Execute `scripts/add-rss-sources-table.sql` in Supabase
2. **Add TypeScript types:** Update `lib/types.ts` with RSS source interfaces  
3. **Create RSS manager:** Add `RSSSourceManager` class to `lib/supabase/database.ts`
4. **Add validation utilities:** Create `lib/rss-validation.ts` for URL validation

### **Next Steps (Phase 2):**
5. **Create API routes:** Add RSS CRUD endpoints in `app/api/`
6. **Update RSS fetching:** Modify existing `fetch-releases` to include company sources  
7. **Create RSS hooks:** Add `hooks/use-rss-sources.ts` for UI integration

### **UI Implementation (Phase 3):**
8. **Extend company modal:** Add RSS Sources tab to existing modal
9. **Create RSS components:** Build source list and form components
10. **Test integration:** Verify RSS sources show in activity feed

### **Files That Will Be Created/Modified:**
```
📁 scripts/
  └── add-rss-sources-table.sql ✨ (created)
  
📁 lib/
  ├── types.ts (add RSSSource interface)
  ├── rss-validation.ts ✨ (created)
  └── supabase/database.ts (add RSSSourceManager)
  
📁 app/api/
  ├── companies/[id]/rss-sources/route.ts ✨ (created)
  ├── rss-sources/[id]/route.ts ✨ (created)
  ├── rss-sources/[id]/test/route.ts ✨ (created)
  └── rss-sources/validate/route.ts ✨ (created)
  
📁 hooks/
  └── use-rss-sources.ts ✨ (created)
  
📁 components/dashboard/
  ├── company-management-modal.tsx (modify - add RSS tab)
  ├── rss-sources-section.tsx ✨ (created)
  └── rss-source-form.tsx ✨ (created)
```

This roadmap integrates seamlessly with your existing Supabase setup and follows all your established patterns for database schema, API routes, and UI components.

---

## 🔧 Technical Considerations

### Performance
- Cache RSS source lists per company
- Batch RSS fetching to avoid rate limits  
- Implement feed fetching queues for scalability

### Security
- Validate all RSS URLs to prevent SSRF attacks
- Sanitize RSS feed content
- Rate limit RSS source additions per user

### User Experience  
- Progressive disclosure in RSS management UI
- Clear feed status indicators
- Helpful error messages for invalid feeds
- Undo functionality for RSS source deletion

---

## 🎉 Expected Impact

**Before:** Limited to PRNewswire general news feeds
**After:** Rich, company-specific content from multiple curated sources

This feature will transform CIGNAL from a basic news aggregator into a comprehensive competitive intelligence platform with truly relevant, timely content for each tracked company.