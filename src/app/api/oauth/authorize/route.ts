import { NextRequest, NextResponse } from 'next/server'
import { spotify } from '@/lib/spotify'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const clickId = searchParams.get('click_id')

    if (!slug || !clickId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Create state parameter with slug and click_id
    const state = Buffer.from(JSON.stringify({ slug, clickId })).toString('base64url')
    
    // Build Spotify authorization URL
    const authUrl = spotify.buildAuthUrl(state)

    // Log the OAuth URL for debugging
    console.log('OAuth redirect URI:', process.env.SPOTIFY_REDIRECT_URI)
    console.log('Generated auth URL:', authUrl)

    // Redirect to Spotify
    return NextResponse.redirect(authUrl)

  } catch (error) {
    console.error('Error in OAuth authorization:', error)
    return NextResponse.json(
      { error: 'Failed to start OAuth flow' },
      { status: 500 }
    )
  }
}
