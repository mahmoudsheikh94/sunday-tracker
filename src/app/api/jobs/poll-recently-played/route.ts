import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { spotify } from '@/lib/spotify'
import { deriveSessions } from '@/lib/sessions'
import { startOfCopenhagenDay } from '@/lib/time'

export async function POST(request: NextRequest) {
  // Verify cron key
  const cronKey = request.headers.get('X-CRON-KEY')
  if (cronKey !== process.env.CRON_KEY) {
    console.log('❌ Unauthorized cron job attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🔄 Starting daily recently played poll job...')

  try {
    // Get all active user connections within 45-day window
    const activeConnections = await prisma.userConnection.findMany({
      where: {
        isActive: true,
        connectedAt: {
          gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: {
          include: {
            tokens: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    console.log(`📊 Found ${activeConnections.length} active connections to poll`)

    let totalPlaysAdded = 0
    let totalSessionsDerived = 0
    let errors = 0

    for (const connection of activeConnections) {
      try {
        const token = connection.user.tokens[0]
        if (!token) {
          console.log(`⚠️ No token found for user ${connection.user.displayName || connection.user.email}`)
          continue
        }

        // Check if token is expired
        if (token.expiresAt <= new Date()) {
          console.log(`🔄 Token expired for user ${connection.user.displayName || connection.user.email}, refreshing...`)
          
          try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
              },
              body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken
              })
            })

            if (!response.ok) {
              throw new Error(`Failed to refresh token: ${response.status}`)
            }

            const newToken = await response.json()
            
            // Update token in database
            await prisma.oAuthToken.update({
              where: { id: token.id },
              data: {
                accessToken: newToken.access_token,
                expiresAt: new Date(Date.now() + newToken.expires_in * 1000)
              }
            })

            console.log(`✅ Token refreshed for user ${connection.user.displayName || connection.user.email}`)
          } catch (refreshError: any) {
            console.error(`❌ Failed to refresh token for user ${connection.user.displayName || connection.user.email}:`, refreshError.message)
            errors++
            continue
          }
        }

        // Get recently played tracks
        const recentlyPlayed = await spotify.getRecentlyPlayed(token.accessToken)
        
        if (!recentlyPlayed || recentlyPlayed.length === 0) {
          console.log(`📭 No recently played tracks for user ${connection.user.displayName || connection.user.email}`)
          continue
        }

        // Get playlist tracks to check if plays match
        const link = await prisma.trackingLink.findUnique({
          where: { id: connection.linkId },
          include: { playlist: { include: { tracks: true } } }
        })

        if (!link) {
          console.log(`⚠️ Link not found for connection ${connection.id}`)
          continue
        }

        const playlistTrackIds = new Set(link.playlist.tracks.map((t: any) => t.spotifyId))
        
        // Process each recently played track
        for (const item of recentlyPlayed) {
          const track = item.track
          const playedAt = new Date(item.played_at)
          
          // Check if this play is already recorded
          const existingPlay = await prisma.play.findFirst({
            where: {
              connectionId: connection.id,
              spotifyTrackId: track.id,
              playedAt: {
                gte: new Date(playedAt.getTime() - 5 * 60 * 1000), // 5 minute window
                lte: new Date(playedAt.getTime() + 5 * 60 * 1000)
              }
            }
          })

          if (existingPlay) {
            continue // Skip if already recorded
          }

          // Record the play
          await prisma.play.create({
            data: {
              connectionId: connection.id,
              spotifyTrackId: track.id,
              playedAt,
              durationMs: track.duration_ms,
              matchedPlaylist: playlistTrackIds.has(track.id)
            }
          })

          totalPlaysAdded++
        }

        // Derive sessions from plays
        const plays = await prisma.play.findMany({
          where: { connectionId: connection.id },
          orderBy: { playedAt: 'asc' }
        })

        if (plays.length > 0) {
          const playData = plays.map((play: any) => ({
            playedAt: play.playedAt,
            durationMs: play.durationMs || 0
          }))
          
          const sessions = deriveSessions(playData)
          
          // Clear existing sessions and create new ones
          await prisma.listeningSession.deleteMany({
            where: { connectionId: connection.id }
          })

          for (const session of sessions) {
            await prisma.listeningSession.create({
              data: {
                connectionId: connection.id,
                startedAt: session.startedAt,
                endedAt: session.endedAt,
                trackCount: session.trackCount,
                totalMinutes: session.totalMinutes,
                superListenerHit: session.superListenerHit
              }
            })
          }

          totalSessionsDerived += sessions.length
        }

        // Update last polled timestamp
        await prisma.userConnection.update({
          where: { id: connection.id },
          data: { lastPolledAt: new Date() }
        })

      } catch (error: any) {
        console.error(`❌ Error processing connection ${connection.id}:`, error.message)
        errors++
      }
    }

    console.log(`✅ Job completed: ${totalPlaysAdded} plays added, ${totalSessionsDerived} sessions derived, ${errors} errors`)

    return NextResponse.json({
      success: true,
      summary: {
        connectionsProcessed: activeConnections.length,
        playsAdded: totalPlaysAdded,
        sessionsDerived: totalSessionsDerived,
        errors
      }
    })

  } catch (error: any) {
    console.error('❌ Fatal error in recently played job:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
