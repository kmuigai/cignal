# 🚀 Vercel Deployment Guide - Background RSS Polling

This guide will help you deploy your CIGNAL app to Vercel with automatic background RSS polling every 20 minutes.

## 🏗️ What We've Set Up

✅ **Vercel Cron Jobs Configuration** (`vercel.json`)
- RSS polling every 20 minutes
- Daily cleanup at 2 AM UTC

✅ **Background Processing**
- Automatic article storage without user interaction
- Multi-user support (polls all users' companies)
- Smart deduplication and 30-day retention

✅ **Production-Ready Architecture**
- Secure cron endpoints with authentication
- Comprehensive error handling and logging
- Health checks and monitoring

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup

You'll need to set these environment variables in Vercel:

#### Required Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Cron Security
CRON_SECRET=your-secure-random-32-character-string

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# AI Analysis (Optional)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

#### Generate a Strong CRON_SECRET
```bash
# Generate a secure 32-character secret
openssl rand -hex 32
# Example: a1b2c3d4e5f6789012345678901234567890abcdefghijklmnopqrstuvwxyz
```

### 2. Database Migration

Make sure your database has the required tables:

```bash
# Run the migration locally first
npm run migrate

# Or apply manually in Supabase SQL Editor
# Use the SIMPLE-MIGRATION.sql file
```

## 🚀 Deployment Steps

### Step 1: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy your app
vercel

# Follow the prompts to:
# - Connect to your Vercel account
# - Link to your project
# - Set up domain
```

### Step 2: Configure Environment Variables

In your Vercel dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. Add all the required variables from above
3. Make sure to set them for **Production**, **Preview**, and **Development**

### Step 3: Verify Deployment

```bash
# Check if cron endpoints are working
curl https://your-app.vercel.app/api/cron/poll-all-users
curl https://your-app.vercel.app/api/cron/cleanup

# Both should return health check responses
```

## ⏰ How the Background Polling Works

### RSS Polling (Every 20 Minutes)
```
Vercel Cron → /api/cron/poll-all-users → For each user:
  ↓
  1. Get user's companies
  2. Fetch RSS feeds
  3. Process & deduplicate articles
  4. Store new releases
  5. Update poll logs
```

### Daily Cleanup (2 AM UTC)
```
Vercel Cron → /api/cron/cleanup → For each user:
  ↓
  1. Find releases older than 30 days
  2. Delete old releases
  3. Log cleanup results
```

## 🔧 Configuration Files

### vercel.json
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

### Cron Schedule Explanation
- `*/20 * * * *` = Every 20 minutes
- `0 2 * * *` = Daily at 2:00 AM UTC

## 📊 Monitoring & Testing

### Test Your Deployment

```bash
# 1. Check environment
npm run check-env

# 2. Test the system
npm run test:phase2

# 3. Monitor cron jobs in Vercel dashboard
# Go to Functions → Cron Jobs → View logs
```

### Monitor in Production

**Vercel Dashboard:**
- Functions → Cron Jobs → View execution logs
- Monitor success/failure rates
- Check execution duration

**Application Logs:**
- Each cron run logs detailed information
- Success: "✅ Successfully polled for user..."
- Errors: "❌ Failed to poll for user..."

## 🛠️ Troubleshooting

### Common Issues

#### "Unauthorized" on Cron Endpoints
**Problem:** Cron jobs returning 401 errors
**Solution:** 
- Check `CRON_SECRET` is set correctly in Vercel
- Ensure it's exactly 32+ characters
- Verify no extra spaces or quotes

#### "No users found" 
**Problem:** Cron job finds no users to poll
**Solution:**
- Make sure users have added companies through the UI
- Check database migration was applied
- Verify Supabase connection

#### RSS Fetch Failures
**Problem:** Can't fetch RSS feeds
**Solution:**
- Check `NEXT_PUBLIC_APP_URL` points to your Vercel domain
- Verify RSS sources are accessible
- Monitor for rate limiting

#### Database Connection Issues
**Problem:** Can't connect to Supabase
**Solution:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check Supabase URL is correct
- Ensure RLS policies allow service role access

### Debug Commands

```bash
# Check all environment variables
curl https://your-app.vercel.app/api/cron/poll-all-users

# Manual cron test with auth
curl -X POST https://your-app.vercel.app/api/cron/poll-all-users \
  -H "Authorization: Bearer your-cron-secret"

# Check cleanup endpoint
curl -X POST https://your-app.vercel.app/api/cron/cleanup \
  -H "Authorization: Bearer your-cron-secret"
```

## 🎯 Expected Results

After successful deployment, you should see:

### Immediate (Within 20 minutes)
- ✅ First cron job executes successfully
- ✅ RSS articles appear for users' companies
- ✅ Logs show successful polling in Vercel dashboard

### Ongoing (Daily operation)
- ✅ New articles automatically appear every 20 minutes
- ✅ No duplicate articles stored
- ✅ Users see fresh content without manual refresh
- ✅ Old articles (30+ days) cleaned up daily

### Performance Metrics
- ✅ Cron job completion: < 60 seconds per run
- ✅ Success rate: > 95%
- ✅ Zero manual intervention required
- ✅ Database storage stays under control

## 🔄 Architecture Summary

```
Vercel Cron Jobs (Background)
     ↓ (Every 20 min)
/api/cron/poll-all-users
     ↓ (For each user)
RSS Sources → Process → Store → Database
     ↓
User sees fresh articles automatically!
```

## ✨ Benefits of This Setup

**For Users:**
- 🎯 Never miss important press releases
- ⚡ Instant loading (pre-fetched articles)
- 📱 Works even when app is closed
- 🔄 Always up-to-date information

**For You:**
- 🤖 Fully automated background processing
- 📈 Scales automatically with Vercel
- 💰 Cost-effective (Vercel cron is free tier friendly)
- 🔧 Easy monitoring and debugging
- 🚀 Professional-grade reliability

---

## 🎉 You're All Set!

Your CIGNAL app now has professional-grade background RSS polling that ensures users never miss important company news. The system runs automatically every 20 minutes, fetching and storing articles for all users without any manual intervention required.

**Next Steps:**
1. Deploy to Vercel using the steps above
2. Monitor the first few cron executions
3. Add more companies through the UI to see it working
4. Enjoy your always-listening press release monitoring system! 🎯 