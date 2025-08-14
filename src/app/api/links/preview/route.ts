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

    // For now, we'll return mock data since we need admin authentication
    // In a real implementation, you'd need to authenticate with Spotify first
    
    const mockPlaylistData = {
      id: playlistId,
      name: `Playlist ${playlistId}`,
      ownerName: 'Spotify User',
      imageUrl: null,
      trackCount: 0,
      followers: 0
    }

    return NextResponse.json(mockPlaylistData)

    // TODO: Implement actual Spotify API call when admin auth is available
    // const playlistMeta = await spotify.getPlaylistMeta(playlistId, adminToken)
    // const tracks = await spotify.getAllPlaylistTracks(playlistId, adminToken)
    
    // return NextResponse.json({
    //   id: playlistMeta.id,
    //   name: playlistMeta.name,
    //   ownerName: playlistMeta.owner.display_name,
    //   imageUrl: playlistMeta.images[0]?.url || null,
    //   trackCount: tracks.length,
    //   followers: 0 // Would need additional API call
    // })

  } catch (error) {
    console.error('Error previewing playlist:', error)
    return NextResponse.json(
      { error: 'Failed to preview playlist' },
      { status: 500 }
    )
  }
}
