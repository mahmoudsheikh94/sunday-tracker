import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { spotify } from '@/lib/spotify'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Decode state parameter
    let stateData: { slug: string; clickId: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      )
    }

    const { slug, clickId } = stateData

    // Find the tracking link
    const trackingLink = await prisma.trackingLink.findUnique({
      where: { slug },
      include: { playlist: true }
    })

    if (!trackingLink) {
      return NextResponse.json(
        { error: 'Invalid tracking link' },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    const tokens = await spotify.exchangeCodeForTokens(code)
    
    // Get user profile
    const profile = await spotify.getProfile(tokens.access_token)

    // Upsert Spotify user
    const spotifyUser = await prisma.spotifyUser.upsert({
      where: { spotifyUserId: profile.id },
      create: {
        spotifyUserId: profile.id,
        email: profile.email,
        country: profile.country,
        displayName: profile.display_name
      },
      update: {
        email: profile.email,
        country: profile.country,
        displayName: profile.display_name
      }
    })

    // Store OAuth tokens - delete existing and create new
    await prisma.oAuthToken.deleteMany({
      where: { spotifyUserId: profile.id }
    })
    
    await prisma.oAuthToken.create({
      data: {
        spotifyUserId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: 'user-read-recently-played,user-read-email,user-read-private,user-library-read,playlist-read-private,user-follow-read'
      }
    })

    // Create or update user connection (last-click attribution)
    await prisma.userConnection.upsert({
      where: {
        linkId_spotifyUserId: {
          linkId: trackingLink.id,
          spotifyUserId: profile.id
        }
      },
      create: {
        linkId: trackingLink.id,
        spotifyUserId: profile.id,
        clickId,
        connectedAt: new Date(),
        isActive: true
      },
      update: {
        clickId, // Update to latest click
        lastPolledAt: null // Reset polling status
      }
    })

    // Redirect to success page with both slug and playlist ID
    const redirectUrl = `/connected?slug=${slug}&playlist_id=${trackingLink.playlist.spotifyId}`
    return NextResponse.redirect(`${process.env.APP_BASE_URL}${redirectUrl}`)

  } catch (error) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.json(
      { error: 'Failed to complete OAuth flow' },
      { status: 500 }
    )
  }
}
