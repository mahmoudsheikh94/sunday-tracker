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
    console.log(`🔄 Processing playlist: ${playlistId}`)

    // Test database connection first
    try {
      await prisma.$connect()
      console.log('✅ Database connected successfully')
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Check if playlist already exists
    let playlist = await prisma.playlist.findUnique({
      where: { spotifyId: playlistId }
    })

    if (!playlist) {
      try {
        console.log(`🔄 Creating new playlist: ${playlistId}`)
        
        // Try to get real playlist data from Spotify first
        try {
          const accessToken = await spotify.getClientCredentialsToken()
          const playlistMeta = await spotify.getPlaylistMeta(playlistId, accessToken)
          
          playlist = await prisma.playlist.create({
            data: {
              spotifyId: playlistId,
              name: playlistMeta.name,
              ownerName: playlistMeta.owner.display_name,
              imageUrl: playlistMeta.images[0]?.url || null,
              snapshotId: playlistMeta.snapshot_id
            }
          })
          
          console.log(`✅ Created playlist with real data: ${playlistMeta.name}`)
          
        } catch (spotifyError) {
          console.warn('⚠️ Spotify API failed, creating basic playlist:', spotifyError)
          
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
          
          console.log(`✅ Created basic playlist placeholder`)
        }

      } catch (error) {
        console.error('❌ Error creating playlist:', error)
        return NextResponse.json(
          { error: 'Failed to create playlist', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }
    } else {
      console.log(`✅ Playlist already exists: ${playlist.name}`)
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

    console.log(`🔄 Generated slug: ${slug}`)

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

    console.log(`✅ Created tracking link: ${trackingLink.id}`)

    const shortUrl = `${process.env.APP_BASE_URL}/${slug}`
    console.log(`🔗 Short URL: ${shortUrl}`)

    return NextResponse.json({
      link: trackingLink,
      url: shortUrl
    })

  } catch (error) {
    console.error('❌ Error creating tracking link:', error)
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Failed to create tracking link', 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  } finally {
    try {
      await prisma.$disconnect()
      console.log('✅ Database disconnected')
    } catch (disconnectError) {
      console.warn('⚠️ Error disconnecting from database:', disconnectError)
    }
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
