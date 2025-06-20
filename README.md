# 🎯 Cignal

A modern RSS monitoring and content analysis platform built with Next.js 14, Supabase, and TypeScript. Cignal helps you track, analyze, and manage RSS feeds with AI-powered content extraction and real-time updates.

## ✨ Features

- **RSS Feed Monitoring** - Track multiple RSS feeds in real-time
- **AI Content Analysis** - Extract and analyze content using Claude AI
- **User Management** - Secure authentication with Supabase
- **Real-time Updates** - Live feed polling and notifications
- **Modern UI** - Beautiful interface built with Radix UI and Tailwind CSS
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Automated Cleanup** - Background jobs for data management
- **Analytics Dashboard** - Visual insights with interactive charts

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Package Manager**: pnpm
- **Deployment**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ 
- pnpm
- A Supabase account
- A Claude AI API key (for content analysis)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kmuigai/cignal.git
   cd cignal
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Claude AI
   CLAUDE_API_KEY=your_claude_api_key
   
   # Next.js
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Set up your Supabase database**
   - Create a new Supabase project
   - Run the provided SQL migrations (if available)
   - Set up your database tables and RLS policies

5. **Run the development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
cignal/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   │   ├── analyze-release/    # Content analysis
│   │   ├── cron/              # Background jobs
│   │   ├── extract-content/   # Content extraction
│   │   ├── fetch-releases/    # RSS fetching
│   │   └── ...
│   ├── auth/              # Authentication pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # Reusable components
├── lib/                  # Utility functions
├── public/               # Static assets
└── types/               # TypeScript type definitions
```

## 🔧 API Routes

### Core Endpoints

- `GET /api/fetch-releases` - Fetch RSS releases
- `GET /api/get-stored-releases` - Get stored releases from database
- `POST /api/extract-content` - Extract content from URLs
- `POST /api/analyze-release` - Analyze release content with AI
- `POST /api/validate-claude-key` - Validate Claude API key

### Cron Jobs

- `POST /api/cron/poll-all-users` - Poll RSS feeds for all users
- `POST /api/cron/cleanup` - Clean up old data

### Testing

- `GET /api/test-rss` - Test RSS functionality
- `GET /test-rss` - RSS testing page

## 🚀 Deployment

This project is configured for deployment on Vercel:

### Deploy to Vercel

1. **Connect your repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project" and import your repository

2. **Configure environment variables**
   - Add all environment variables from your `.env.local`

3. **Deploy**
   - Vercel will automatically deploy on push to main branch

### Build Configuration

The project uses:
- **Build Command**: `pnpm run build`
- **Package Manager**: pnpm
- **Node.js Version**: 18.x

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `CLAUDE_API_KEY` | Claude AI API key | Yes |
| `NEXTAUTH_URL` | Your app URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |

## 🧪 Testing

Run the test RSS functionality:

```bash
# Visit the test page
http://localhost:3000/test-rss

# Or test the API directly
curl http://localhost:3000/api/test-rss
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/kmuigai/cignal/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about the error and your environment

## 🏗️ Roadmap

- [ ] Enhanced AI content analysis
- [ ] Multi-language support
- [ ] Advanced filtering and search
- [ ] Export functionality
- [ ] Mobile app
- [ ] Integration with more content sources

---

Built with ❤️ using Next.js and Supabase
