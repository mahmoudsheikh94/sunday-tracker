# Sndy Tracker - Spotify Playlist Analytics

A comprehensive tracking system for Spotify playlists that provides detailed analytics on user engagement, listening patterns, and audience insights.

## Features

- **Short Tracking Links**: Generate unique, non-guessable URLs for each playlist
- **OAuth Integration**: Secure Spotify authentication with comprehensive scopes
- **Click Attribution**: Last-click attribution model with 45-day tracking window
- **Session Analysis**: Automatic detection of listening sessions with 30-minute gap logic
- **Super Listener Detection**: Identify users with ≥15 tracks in a session or day
- **Copenhagen Timezone**: All metrics displayed in Europe/Copenhagen timezone
- **Real-time Analytics**: Daily polling of recently played tracks
- **Comprehensive Dashboards**: Overview, link details, and audience analytics
- **No Authentication Required**: Simple admin-free setup for v1

## Architecture

- **Frontend**: Next.js 14 with App Router, React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **OAuth**: Spotify Web API integration
- **Deployment**: Vercel (frontend + API) + Supabase (database)
- **Jobs**: Vercel Cron for daily data processing

## Quick Start

### 1. Prerequisites

- Node.js 18+ and pnpm
- Supabase account with PostgreSQL database
- Spotify Developer account

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd sndy-tracker

# Install dependencies
pnpm install

# Set up environment variables
cp env.local .env.local
# Edit .env.local with your configuration
```

### 3. Environment Configuration

Create `.env.local` with:

```env
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/oauth/callback
APP_BASE_URL=http://localhost:3000
CRON_KEY=your_64_character_cron_key
```

### 4. Database Setup

```bash
# Initialize Prisma
npx prisma generate
npx prisma db push

# Or run migrations
npx prisma migrate dev
```

### 5. Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/oauth/callback`
4. Copy Client ID and Client Secret to `.env.local`

### 6. Development

```bash
# Start development server
pnpm dev

# Open http://localhost:3000
```

## Usage

### Creating Tracking Links

1. Navigate to `/links/new`
2. Paste a Spotify playlist URL
3. Preview playlist details
4. Create tracking link
5. Share the generated short URL

### User Flow

1. User clicks tracking link
2. Cookie consent + Spotify OAuth on single screen
3. User authorizes Spotify access
4. System begins daily polling of recently played tracks
5. Analytics populate dashboard over time

### Dashboard Features

- **Overview**: Summary cards for all tracking links
- **Link Details**: Comprehensive metrics and charts per link
- **Audience**: Detailed user table with engagement metrics
- **Real-time Updates**: Daily job processing with 45-day retention

## API Endpoints

### Public Endpoints

- `GET /:slug` - Short link handler (sets cookies, redirects to consent)
- `GET /consent` - Consent and OAuth screen
- `GET /connected` - Success page after OAuth

### Admin Endpoints

- `POST /api/links` - Create new tracking link
- `GET /api/links` - List all tracking links
- `GET /api/links/:id` - Get link details
- `GET /api/links/:id/audience` - Get audience data

### OAuth Endpoints

- `GET /api/oauth/authorize` - Start Spotify OAuth flow
- `GET /api/oauth/callback` - Handle OAuth callback

### Job Endpoints (Cron)

- `POST /api/jobs/poll-recently-played` - Daily track polling
- `POST /api/jobs/retention-sweep` - 45-day retention cleanup
- `POST /api/jobs/refresh-playlists` - Playlist snapshot updates

## Data Model

### Core Entities

- **Playlist**: Spotify playlist metadata and track snapshots
- **TrackingLink**: Short URLs with unique slugs
- **SpotifyUser**: Connected Spotify users
- **UserConnection**: Links between users and tracking links
- **Play**: Individual track plays with timestamps
- **ListeningSession**: Derived listening sessions
- **Daily Aggregates**: Per-user and per-link daily metrics

### Key Relationships

- Last-click attribution: `UserConnection` binds `click_id` to `spotify_user_id`
- 45-day tracking window: `connectedAt` + 45 days determines active status
- Session derivation: ≤30 minute gaps between plays create new sessions
- Super listener: ≥15 tracks in session OR ≥15 tracks in calendar day

## Cron Jobs

Set up Vercel Cron jobs:

```bash
# Daily at 3 AM UTC (4-5 AM Copenhagen)
POST /api/jobs/poll-recently-played
Headers: X-CRON-KEY: your_cron_key

# Daily retention sweep
POST /api/jobs/retention-sweep
Headers: X-CRON-KEY: your_cron_key

# Optional: Daily playlist refresh
POST /api/jobs/refresh-playlists
Headers: X-CRON-KEY: your_cron_key
```

## Deployment

### Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Set up cron jobs
5. Deploy

### Supabase

1. Create new project
2. Get connection string
3. Update `DATABASE_URL` in Vercel
4. Run database migrations

## Development Notes

### Current Limitations (v1)

- No admin authentication (planned for v2)
- Playlist refresh requires manual admin token
- Basic chart placeholders (Recharts integration pending)
- Limited error handling and logging

### Future Enhancements

- Admin authentication and user management
- Advanced charting with Recharts
- CSV export functionality
- Real-time WebSocket updates
- Enhanced error handling and monitoring
- A/B testing for different attribution models

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please open a GitHub issue or contact the development team.
