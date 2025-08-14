import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { spotify } from '@/lib/spotify'

export async function POST(request: NextRequest) {
  try {
    // Verify cron key
    const cronKey = request.headers.get('X-CRON-KEY')
    if (cronKey !== process.env.CRON_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all active tracking links
    const trackingLinks = await prisma.trackingLink.findMany({
      where: { isActive: true },
      include: {
        playlist: true
      }
    })

    let processedCount = 0
    let errorCount = 0

    for (const link of trackingLinks) {
      try {
        // For now, we'll skip actual playlist refresh since we need admin authentication
        // In a real implementation, you'd need to authenticate with Spotify first
        
        console.log(`Skipping playlist refresh for ${link.playlist.name} (needs admin auth)`)
        processedCount++
        
        // TODO: Implement actual playlist refresh when admin auth is available
        // const tracks = await spotify.getAllPlaylistTracks(link.playlist.spotifyId, adminToken)
        // Update playlist tracks in database
        
      } catch (error) {
        console.error(`Error refreshing playlist ${link.playlist.name}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist refresh completed (skipped - needs admin auth)',
      processed: processedCount,
      errors: errorCount,
      total: trackingLinks.length
    })

  } catch (error) {
    console.error('Error in refresh-playlists job:', error)
    return NextResponse.json(
      { error: 'Failed to refresh playlists' },
      { status: 500 }
    )
  }
}
