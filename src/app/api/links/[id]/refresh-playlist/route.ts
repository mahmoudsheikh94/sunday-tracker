import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { spotify } from '@/lib/spotify'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the tracking link and playlist
    const trackingLink = await prisma.trackingLink.findUnique({
      where: { id },
      include: {
        playlist: true
      }
    })

    if (!trackingLink) {
      return NextResponse.json(
        { error: 'Tracking link not found' },
        { status: 404 }
      )
    }

    console.log(`🔄 Refreshing playlist: ${trackingLink.playlist.spotifyId}`)

    try {
      // Get admin access token for public playlist access
      const adminToken = await spotify.getClientCredentialsToken()
      
      // Fetch playlist details from Spotify
      const playlistData = await spotify.getPlaylistMeta(trackingLink.playlist.spotifyId, adminToken)
      
      // Fetch all tracks from the playlist
      const tracksData = await spotify.getAllPlaylistTracks(trackingLink.playlist.spotifyId, adminToken)
      
      console.log(`📊 Found ${tracksData.length} tracks in playlist`)

      // Update playlist metadata
      await prisma.playlist.update({
        where: { id: trackingLink.playlist.id },
        data: {
          name: playlistData.name,
          ownerName: playlistData.owner.display_name,
          imageUrl: playlistData.images[0]?.url || null,
          snapshotId: playlistData.snapshot_id,
          updatedAt: new Date()
        }
      })

      // Clear existing tracks
      await prisma.playlistTrack.deleteMany({
        where: { playlistId: trackingLink.playlist.id }
      })

      // Create new track records
      const trackData = tracksData.map(track => ({
        playlistId: trackingLink.playlist.id,
        spotifyId: track.track.id,
        addedAt: new Date(track.added_at),
        durationMs: track.track.duration_ms,
        artistIds: track.track.artists.map(artist => artist.id),
        trackName: track.track.name,
        artistNames: track.track.artists.map(artist => artist.name).join(', ')
      }))

      await prisma.playlistTrack.createMany({
        data: trackData
      })

      console.log(`✅ Successfully imported ${tracksData.length} tracks`)

      return NextResponse.json({
        success: true,
        message: `Playlist refreshed successfully with ${tracksData.length} tracks`,
        tracksCount: tracksData.length,
        playlistName: playlistData.name,
        ownerName: playlistData.owner.display_name
      })

    } catch (spotifyError) {
      console.error('❌ Spotify API error:', spotifyError)
      
      // Fallback: just update the playlist name if Spotify API fails
      await prisma.playlist.update({
        where: { id: trackingLink.playlist.id },
        data: {
          name: `Playlist ${trackingLink.playlist.spotifyId}`,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: false,
        message: 'Failed to fetch from Spotify API, but playlist name was updated',
        tracksCount: 0,
        note: 'Check your Spotify API credentials and try again'
      })
    }

  } catch (error) {
    console.error('Error refreshing playlist:', error)
    return NextResponse.json(
      { error: 'Failed to refresh playlist' },
      { status: 500 }
    )
  }
}
