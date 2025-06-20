# Phase 2 Setup: Background Processing System 🤖

## Overview
Phase 2 adds always-listening RSS monitoring with automatic background polling, deduplication, and 30-day retention. Your app will now continuously monitor press releases even when users aren't actively checking.

## 🚀 Quick Start

### 1. Apply Database Migration
```bash
# Make sure you have Phase 1 environment variables set
npm run migrate
```

### 2. Set Environment Variables
Add these to your `.env.local`:

```env
# Existing variables (from Phase 1)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# New Phase 2 variables
CRON_SECRET=your-secure-random-string-here
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Update for production
```

### 3. Test the System
```bash
# Test Phase 1 foundation
npm run test:phase1

# Test Phase 2 background jobs
npm run dev  # Start the server first
npm run test:phase2  # In another terminal
```

## 📋 Environment Variables Guide

### Required Variables

**`CRON_SECRET`** - Secure string to protect cron endpoints
- **Development**: Any random string (e.g., `dev-secret-123`)
- **Production**: Use a secure random string (32+ characters)
- **Example**: `openssl rand -base64 32`

**`NEXT_PUBLIC_APP_URL`** - Your app's URL for internal API calls
- **Development**: `http://localhost:3000` 
- **Production**: `https://your-domain.com`
- **Vercel**: Automatically available as `VERCEL_URL`

### Optional Variables

**`NODE_ENV`** - Environment mode
- **Development**: `development` (default)
- **Production**: `production`

## 🔗 API Endpoints

### RSS Polling
- **Endpoint**: `POST /api/poll-rss`
- **Auth**: User session OR cron secret
- **Purpose**: Poll RSS feeds for a user's companies
- **Usage**: Called by users manually or by cron job

### Cron Polling (All Users)
- **Endpoint**: `POST /api/cron/poll-all-users`
- **Auth**: `Bearer ${CRON_SECRET}`
- **Purpose**: Poll RSS feeds for ALL users
- **Usage**: Called every 15-30 minutes by external cron service

### Cleanup Job
- **Endpoint**: `POST /api/cron/cleanup`
- **Auth**: `Bearer ${CRON_SECRET}`
- **Purpose**: Remove press releases older than 30 days
- **Usage**: Called daily by external cron service

### Health Checks
- **Endpoints**: `GET /api/cron/*`
- **Auth**: None
- **Purpose**: Verify cron endpoints are healthy

## ⏰ Cron Schedule Recommendations

### For Development (Manual Testing)
```bash
# Test RSS polling
curl -X POST http://localhost:3000/api/cron/poll-all-users \
  -H "Authorization: Bearer your-cron-secret"

# Test cleanup
curl -X POST http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer your-cron-secret"
```

### For Production

**Option 1: External Cron Service (Recommended)**
- Use cron-job.org, EasyCron, or similar
- **RSS Polling**: Every 15-30 minutes
- **Cleanup**: Daily at 2:00 AM

```
# RSS Polling (every 20 minutes)
*/20 * * * *

# Cleanup (daily at 2 AM)
0 2 * * *
```

**Option 2: Server Cron (if you have server access)**
```bash
# Add to crontab
crontab -e

# RSS polling every 20 minutes
*/20 * * * * curl -X POST https://your-domain.com/api/cron/poll-all-users -H "Authorization: Bearer your-cron-secret"

# Cleanup daily at 2 AM
0 2 * * * curl -X POST https://your-domain.com/api/cron/cleanup -H "Authorization: Bearer your-cron-secret"
```

**Option 3: Vercel Cron Functions**
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/poll-all-users",
      "schedule": "*/20 * * * *"
    },
    {
      "path": "/api/cron/cleanup", 
      "schedule": "0 2 * * *"
    }
  ]
}
```

## 📊 Monitoring & Logs

### Built-in Monitoring
- **Poll Logs**: Stored in `rss_poll_logs` table
- **API Responses**: Include detailed success/failure statistics
- **Console Logs**: Comprehensive logging for debugging

### Check Polling Status
```bash
# Get recent poll logs for authenticated user
curl -X GET http://localhost:3000/api/poll-rss \
  -H "Authorization: Bearer user-session-token"
```

### Health Checks
```bash
# Check cron endpoints
curl http://localhost:3000/api/cron/poll-all-users
curl http://localhost:3000/api/cron/cleanup
```

## 🏗️ Architecture Flow

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Cron Service  │───▶│   Cron API   │───▶│  Poll RSS API   │
│  (Every 20min)  │    │              │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                     │
                                                     ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  RSS Sources    │◀───│ Fetch RSS    │◀───│  For Each User  │
│  (PR Newswire)  │    │              │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐
│  Process Items  │───▶│   Store in   │
│  (Deduplication)│    │   Database   │
└─────────────────┘    └──────────────┘
```

## 🛠️ Troubleshooting

### Common Issues

**"Unauthorized" Error**
- Check `CRON_SECRET` is set correctly
- Verify `Authorization` header format: `Bearer your-secret`

**"No companies found"**
- User needs to add companies through the UI first
- Check database has companies for the user

**RSS Fetch Failures**
- Check `NEXT_PUBLIC_APP_URL` is correct
- Verify RSS sources are accessible
- Check network connectivity

**Database Connection Issues**
- Verify Supabase credentials are correct
- Check Row Level Security policies
- Ensure migration was applied

### Debugging Commands

```bash
# Check if endpoints are accessible
npm run test:phase2

# Manual RSS poll for testing
curl -X POST http://localhost:3000/api/cron/poll-all-users \
  -H "Authorization: Bearer development-secret" \
  -H "Content-Type: application/json"

# Check logs in browser console or server logs
```

## 📈 Production Checklist

### Security
- [ ] Set strong `CRON_SECRET` (32+ random characters)
- [ ] Use HTTPS in production
- [ ] Verify cron endpoints are not publicly accessible without auth
- [ ] Set up monitoring/alerting for failed cron jobs

### Performance
- [ ] Monitor database performance with new load
- [ ] Set up database connection pooling if needed
- [ ] Consider rate limiting for RSS endpoints
- [ ] Monitor memory usage during bulk operations

### Reliability
- [ ] Set up cron job monitoring (alerts for failures)
- [ ] Configure database backups
- [ ] Test failover scenarios
- [ ] Monitor disk space (for 30-day retention)

## 🎯 Success Metrics

After setup, you should see:
- ✅ Automated RSS polling every 20 minutes
- ✅ New press releases appearing without manual refresh
- ✅ Duplicate detection working (same releases not stored twice)
- ✅ Old releases automatically cleaned up after 30 days
- ✅ Comprehensive logging of all operations

---

**Phase 2 Status: Ready for Deployment**  
Your always-listening RSS monitoring system is now complete! 