import { prisma } from './prisma'
import { startOfCopenhagenDay, todayCopenhagenKey, getLastNDaysCopenhagen } from './time'
import { ListeningSession, PlayData } from './sessions'

export interface LinkMetrics {
  totalConnections: number
  totalActiveListeners: number
  totalTracksPlayed: number
  totalMinutesListened: number
  totalSuperListeners: number
  last7Days: {
    newConnections: number
    activeListeners: number
    tracksPlayed: number
    superListeners: number
  }
  recentConnections: Array<{
    id: string
    user: {
      displayName?: string | null
      email?: string | null
    }
    connectedAt: Date
    totalTracksPlayed: number
    totalMinutes: number
  }>
}

export interface UserMetrics {
  totalTracksPlayed: number
  totalMinutesListened: number
  totalSessions: number
  superListenerCount: number
  lastActive: Date | null
  followsPlaylist: boolean
  savedAny: boolean
}

/**
 * Get comprehensive metrics for a tracking link
 */
export async function getLinkMetrics(linkId: string): Promise<LinkMetrics> {
  const [
    totalConnections,
    activeConnections,
    totalTracksPlayed,
    totalMinutesListened,
    totalSuperListeners,
    last7DaysData,
    recentConnections
  ] = await Promise.all([
    // Total connections
    prisma.userConnection.count({
      where: { linkId }
    }),
    
    // Active connections (within 45 days)
    prisma.userConnection.count({
      where: {
        linkId,
        isActive: true,
        connectedAt: {
          gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    
    // Total tracks played
    prisma.play.count({
      where: {
        connection: { linkId },
        matchedPlaylist: true
      }
    }),
    
    // Total minutes listened
    prisma.play.aggregate({
      where: {
        connection: { linkId },
        matchedPlaylist: true
      },
      _sum: { durationMs: true }
    }),
    
    // Total super listeners
    prisma.userConnection.count({
      where: {
        linkId,
        dailyAggregates: {
          some: {
            superListenerDay: true
          }
        }
      }
    }),
    
    // Last 7 days data
    getLast7DaysMetrics(linkId),

    // Recent connections
    getRecentConnections(linkId)
  ])

  return {
    totalConnections,
    totalActiveListeners: activeConnections,
    totalTracksPlayed,
    totalMinutesListened: Math.round((totalMinutesListened._sum.durationMs || 0) / 60000),
    totalSuperListeners,
    last7Days: last7DaysData,
    recentConnections
  }
}

/**
 * Get metrics for the last 7 days
 */
async function getLast7DaysMetrics(linkId: string) {
  const last7Days = getLastNDaysCopenhagen(7)
  const startDate = last7Days[0]
  const endDate = last7Days[last7Days.length - 1]

  const [newConnections, activeListeners, tracksPlayed, superListeners] = await Promise.all([
    // New connections in last 7 days
    prisma.userConnection.count({
      where: {
        linkId,
        connectedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }),
    
    // Active listeners in last 7 days
    prisma.userConnection.count({
      where: {
        linkId,
        plays: {
          some: {
            playedAt: {
              gte: startDate,
              lte: endDate
            },
            matchedPlaylist: true
          }
        }
      }
    }),
    
    // Tracks played in last 7 days
    prisma.play.count({
      where: {
        connection: { linkId },
        matchedPlaylist: true,
        playedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    }),
    
    // Super listeners in last 7 days
    prisma.userConnection.count({
      where: {
        linkId,
        dailyAggregates: {
          some: {
            day: {
              gte: startDate,
              lte: endDate
            },
            superListenerDay: true
          }
        }
      }
    })
  ])

  return {
    newConnections,
    activeListeners,
    tracksPlayed,
    superListeners
  }
}

/**
 * Get recent connections for a link
 */
async function getRecentConnections(linkId: string) {
  const recentConnections = await prisma.userConnection.findMany({
    where: {
      linkId,
      connectedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    include: {
      user: {
        select: {
          displayName: true,
          email: true
        }
      },
      _count: {
        select: {
          plays: true
        }
      }
    },
    orderBy: { connectedAt: 'desc' },
    take: 10 // Get up to 10 recent connections
  })

  return recentConnections.map(conn => ({
    id: conn.id,
    user: conn.user,
    connectedAt: conn.connectedAt,
    totalTracksPlayed: conn._count.plays,
    totalMinutes: 0 // We'll calculate this if needed
  }))
}

/**
 * Get daily metrics for a link over a date range
 */
export async function getLinkDailyMetrics(linkId: string, days: number = 30) {
  const dateRange = getLastNDaysCopenhagen(days)
  
  const dailyMetrics = await prisma.linkDayAggregate.findMany({
    where: {
      linkId,
      day: {
        in: dateRange
      }
    },
    orderBy: { day: 'asc' }
  })

  // Fill in missing days with zero values
  const filledMetrics = dateRange.map(date => {
    const existing = dailyMetrics.find(m => 
      m.day.getTime() === date.getTime()
    )
    
    return existing || {
      day: date,
      connectionsNew: 0,
      activeListeners: 0,
      tracksPlayed: 0,
      minutesListened: 0,
      superListeners: 0
    }
  })

  return filledMetrics
}

/**
 * Get user metrics for audience table
 */
export async function getUserMetrics(connectionId: string): Promise<UserMetrics> {
  const [plays, sessions, followsPlaylist, savedAny] = await Promise.all([
    // Get all plays for this connection
    prisma.play.findMany({
      where: {
        connectionId,
        matchedPlaylist: true
      },
      orderBy: { playedAt: 'desc' }
    }),
    
    // Get all sessions for this connection
    prisma.listeningSession.findMany({
      where: { connectionId }
    }),
    
    // Check if user follows playlist (best effort)
    prisma.userDayAggregate.findFirst({
      where: {
        connectionId,
        followsPlaylist: true
      }
    }),
    
    // Check if user saved any tracks
    prisma.userDayAggregate.findFirst({
      where: {
        connectionId,
        savedAny: true
      }
    })
  ])

  const totalTracksPlayed = plays.length
  const totalMinutesListened = Math.round(
    plays.reduce((total, play) => total + (play.durationMs || 0), 0) / 60000
  )
  const totalSessions = sessions.length
  const superListenerCount = sessions.filter(s => s.superListenerHit).length
  const lastActive = plays.length > 0 ? plays[0].playedAt : null

  return {
    totalTracksPlayed,
    totalMinutesListened,
    totalSessions,
    superListenerCount,
    lastActive,
    followsPlaylist: !!followsPlaylist,
    savedAny: !!savedAny
  }
}

/**
 * Calculate cohort retention metrics
 */
export async function getCohortRetention(linkId: string, days: number = 30) {
  const dateRange = getLastNDaysCopenhagen(days)
  
  const cohortData = await prisma.userConnection.findMany({
    where: {
      linkId,
      connectedAt: {
        in: dateRange
      }
    },
    include: {
      dailyAggregates: {
        where: {
          day: {
            in: dateRange
          }
        },
        orderBy: { day: 'asc' }
      }
    }
  })

  // Group by connection date (cohort)
  const cohorts = new Map<string, typeof cohortData>()
  
  for (const connection of cohortData) {
    const cohortDate = startOfCopenhagenDay(connection.connectedAt).toISOString().split('T')[0]
    
    if (!cohorts.has(cohortDate)) {
      cohorts.set(cohortDate, [])
    }
    
    cohorts.get(cohortDate)!.push(connection)
  }

  // Calculate retention for each cohort
  const retentionData = Array.from(cohorts.entries()).map(([cohortDate, connections]) => {
    const retentionByDay = dateRange.map(date => {
      const dateKey = date.toISOString().split('T')[0]
      const activeUsers = connections.filter(connection => {
        return connection.dailyAggregates.some(agg => 
          agg.day.toISOString().split('T')[0] === dateKey
        )
      }).length
      
      return {
        date: dateKey,
        activeUsers,
        retentionRate: connections.length > 0 ? (activeUsers / connections.length) * 100 : 0
      }
    })

    return {
      cohortDate,
      totalUsers: connections.length,
      retentionByDay
    }
  })

  return retentionData
}
