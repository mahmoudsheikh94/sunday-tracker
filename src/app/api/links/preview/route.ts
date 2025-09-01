import { NextRequest, NextResponse } from 'next/server'
import { spotify } from '@/lib/spotify'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get('playlistId')

    if (!playlistId) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      )
    }

    // Extract playlist ID from URL if it's a full URL
    const cleanPlaylistId = playlistId.includes('playlist/') 
      ? playlistId.split('playlist/')[1]?.split('?')[0] 
      : playlistId

    if (!cleanPlaylistId) {
      return NextResponse.json(
        { error: 'Invalid playlist ID' },
        { status: 400 }
      )
    }

    try {
      // Get client credentials token for public playlist access
      const accessToken = await spotify.getClientCredentialsToken()
      
      // Get playlist metadata
      const playlistMeta = await spotify.getPlaylistMeta(cleanPlaylistId, accessToken)
      
      // Get playlist tracks
      const tracks = await spotify.getAllPlaylistTracks(cleanPlaylistId, accessToken)
      
      const playlistInfo = {
        id: playlistMeta.id,
        name: playlistMeta.name,
        ownerName: playlistMeta.owner.display_name,
        imageUrl: playlistMeta.images[0]?.url || null,
        trackCount: tracks.length,
        followers: 0, // Would need additional API call for followers
        url: `https://open.spotify.com/playlist/${cleanPlaylistId}`,
        snapshotId: playlistMeta.snapshot_id
      }

      return NextResponse.json(playlistInfo)

    } catch (spotifyError) {
      console.error('Spotify API error:', spotifyError)
      
      // Return basic info if Spotify API fails
      return NextResponse.json({
        id: cleanPlaylistId,
        name: `Playlist ${cleanPlaylistId}`,
        ownerName: 'Spotify User',
        imageUrl: null,
        trackCount: 0,
        followers: 0,
        url: `https://open.spotify.com/playlist/${cleanPlaylistId}`,
        note: 'Preview limited - full data will be available when users connect their Spotify accounts',
        error: 'Could not fetch playlist details from Spotify'
      })
    }

  } catch (error) {
    console.error('Error previewing playlist:', error)
    return NextResponse.json(
      { error: 'Failed to preview playlist' },
      { status: 500 }
    )
  }
}
