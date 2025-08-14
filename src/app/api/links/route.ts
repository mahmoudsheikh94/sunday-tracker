import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { spotify } from '@/lib/spotify'
import { createTrackingLinkId } from '@/lib/shortid'

export async function POST(request: NextRequest) {
  try {
    const { playlistUrl, title } = await request.json()

    if (!playlistUrl) {
      return NextResponse.json(
        { error: 'Playlist URL is required' },
        { status: 400 }
      )
    }

    // Extract playlist ID from URL
    const playlistIdMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/)
    if (!playlistIdMatch) {
      return NextResponse.json(
        { error: 'Invalid Spotify playlist URL' },
        { status: 400 }
      )
    }

    const playlistId = playlistIdMatch[1]

    // Check if playlist already exists
    let playlist = await prisma.playlist.findUnique({
      where: { spotifyId: playlistId }
    })

    if (!playlist) {
      try {
        console.log(`🔄 Creating new playlist: ${playlistId}`)
        
        // For now, create a basic playlist without fetching from Spotify
        // In a production environment, you'd need admin Spotify API access
        playlist = await prisma.playlist.create({
          data: {
            spotifyId: playlistId,
            name: `Playlist ${playlistId}`,
            ownerName: 'Spotify User',
            imageUrl: null,
            snapshotId: null
          }
        })

        console.log(`✅ Created playlist placeholder. Use refresh button to import tracks.`)

      } catch (error) {
        console.error('❌ Error creating playlist:', error)
        
        // Fallback: create basic playlist
        playlist = await prisma.playlist.create({
          data: {
            spotifyId: playlistId,
            name: `Playlist ${playlistId}`,
            ownerName: 'Spotify User',
            imageUrl: null,
            snapshotId: null
          }
        })
      }
    }

    // Generate unique slug
    let slug: string
    let attempts = 0
    do {
      slug = createTrackingLinkId()
      attempts++
      if (attempts > 10) {
        throw new Error('Failed to generate unique slug')
      }
    } while (await prisma.trackingLink.findUnique({ where: { slug } }))

    // Create tracking link
    const trackingLink = await prisma.trackingLink.create({
      data: {
        slug,
        playlistId: playlist.id,
        title: title || null
      },
      include: {
        playlist: true
      }
    })

    const shortUrl = `${process.env.APP_BASE_URL}/${slug}`

    return NextResponse.json({
      link: trackingLink,
      url: shortUrl
    })

  } catch (error) {
    console.error('Error creating tracking link:', error)
    return NextResponse.json(
      { error: 'Failed to create tracking link' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const links = await prisma.trackingLink.findMany({
      where: { isActive: true },
      include: {
        playlist: true,
        _count: {
          select: {
            connections: true,
            clicks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(links)
  } catch (error) {
    console.error('Error fetching links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    )
  }
}
