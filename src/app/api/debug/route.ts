import { NextResponse } from 'next/server'

export async function GET() {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    database_url: process.env.DATABASE_URL ? 'set' : 'missing',
    database_url_preview: process.env.DATABASE_URL ? 
      process.env.DATABASE_URL.substring(0, 50) + '...' : 'not set',
    spotify_client_id: process.env.SPOTIFY_CLIENT_ID ? 'set' : 'missing',
    spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET ? 'set' : 'missing',
    spotify_redirect_uri: process.env.SPOTIFY_REDIRECT_URI ? 'set' : 'missing',
    app_base_url: process.env.APP_BASE_URL ? 'set' : 'missing',
    cron_key: process.env.CRON_KEY ? 'set' : 'missing',
    all_env_keys: Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || 
      key.includes('SPOTIFY') || 
      key.includes('APP') || 
      key.includes('CRON')
    )
  }

  return NextResponse.json(debug)
}
