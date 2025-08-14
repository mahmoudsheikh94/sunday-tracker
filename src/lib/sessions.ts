import { SpotifyRecentlyPlayedItem } from './spotify'

export interface ListeningSession {
  startedAt: Date
  endedAt: Date
  trackCount: number
  totalMinutes: number
  superListenerHit: boolean
}

export interface PlayData {
  playedAt: Date
  durationMs: number
}

/**
 * Derive listening sessions from play data
 * A new session starts when there's a gap > 30 minutes between plays
 */
export function deriveSessions(plays: PlayData[]): ListeningSession[] {
  if (plays.length === 0) return []

  // Sort plays by timestamp (most recent first, as Spotify returns them)
  const sortedPlays = [...plays].sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
  
  const sessions: ListeningSession[] = []
  let currentSession: PlayData[] = []
  
  for (let i = 0; i < sortedPlays.length; i++) {
    const currentPlay = sortedPlays[i]
    
    if (currentSession.length === 0) {
      // Start a new session
      currentSession = [currentPlay]
    } else {
      const lastPlay = currentSession[currentSession.length - 1]
      const timeDiff = Math.abs(currentPlay.playedAt.getTime() - lastPlay.playedAt.getTime())
      const thirtyMinutes = 30 * 60 * 1000
      
      if (timeDiff <= thirtyMinutes) {
        // Continue current session
        currentSession.push(currentPlay)
      } else {
        // Gap > 30 minutes, end current session and start new one
        sessions.push(createSessionFromPlays(currentSession))
        currentSession = [currentPlay]
      }
    }
  }
  
  // Don't forget the last session
  if (currentSession.length > 0) {
    sessions.push(createSessionFromPlays(currentSession))
  }
  
  return sessions.reverse() // Return in chronological order
}

/**
 * Create a session from an array of plays
 */
function createSessionFromPlays(plays: PlayData[]): ListeningSession {
  if (plays.length === 0) {
    throw new Error('Cannot create session from empty plays array')
  }
  
  // Sort plays chronologically
  const sortedPlays = [...plays].sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime())
  
  const startedAt = sortedPlays[0].playedAt
  const endedAt = sortedPlays[sortedPlays.length - 1].playedAt
  const trackCount = plays.length
  
  // Calculate total minutes, capping each track at 1x duration to avoid double-counting
  const totalMinutes = plays.reduce((total, play) => {
    const trackMinutes = Math.min(play.durationMs / 60000, play.durationMs / 60000) // Cap at 1x duration
    return total + trackMinutes
  }, 0)
  
  const superListenerHit = trackCount >= 15
  
  return {
    startedAt,
    endedAt,
    trackCount,
    totalMinutes,
    superListenerHit
  }
}

/**
 * Check if a user is a super listener for a given day
 * Either (a) ≥15 tracks in a single session or (b) ≥15 tracks in the same calendar day
 */
export function isSuperListenerDay(plays: PlayData[]): boolean {
  if (plays.length === 0) return false
  
  // Check if any session has ≥15 tracks
  const sessions = deriveSessions(plays)
  const hasSuperSession = sessions.some(session => session.superListenerHit)
  
  if (hasSuperSession) return true
  
  // Check if total tracks in a day ≥15
  return plays.length >= 15
}

/**
 * Group plays by day (Copenhagen timezone)
 */
export function groupPlaysByDay(plays: PlayData[]): Map<string, PlayData[]> {
  const playsByDay = new Map<string, PlayData[]>()
  
  for (const play of plays) {
    // Convert to Copenhagen timezone for day grouping
    const copenhagenDate = new Date(play.playedAt.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }))
    const dayKey = copenhagenDate.toISOString().split('T')[0] // YYYY-MM-DD format
    
    if (!playsByDay.has(dayKey)) {
      playsByDay.set(dayKey, [])
    }
    
    playsByDay.get(dayKey)!.push(play)
  }
  
  return playsByDay
}

/**
 * Get the total duration of plays in minutes
 */
export function getTotalPlayDuration(plays: PlayData[]): number {
  return plays.reduce((total, play) => {
    const trackMinutes = Math.min(play.durationMs / 60000, play.durationMs / 60000) // Cap at 1x duration
    return total + trackMinutes
  }, 0)
}
