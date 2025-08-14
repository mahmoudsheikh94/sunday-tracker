import axios from 'axios'
import { prisma } from './prisma'

export interface SpotifyPlaylistMeta {
  id: string
  name: string
  owner: {
    display_name: string
  }
  images: Array<{
    url: string
    height: number
    width: number
  }>
  snapshot_id: string
}

export interface SpotifyTrack {
  added_at: string
  track: {
    id: string
    name: string
    duration_ms: number
    artists: Array<{
      id: string
      name: string
    }>
  }
}

export interface SpotifyProfile {
  id: string
  email: string
  country: string
  display_name: string
}

export interface SpotifyRecentlyPlayedItem {
  track: {
    id: string
    name: string
    duration_ms: number
    artists: Array<{
      id: string
      name: string
    }>
  }
  played_at: string
}

export class SpotifyAPI {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID!
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI!
  }

  buildAuthUrl(state: string): string {
    const scopes = [
      'user-read-recently-played',
      'user-read-email',
      'user-read-private',
      'user-library-read',
      'playlist-read-private',
      'user-follow-read'
    ].join(' ')

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes,
      state: state
    })

    return `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string) {
    const response = await axios.post('https://accounts.spotify.com/api/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await axios.post('https://api.spotify.com/api/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    }
  }

  async getClientCredentialsToken(): Promise<string> {
    const response = await axios.post('https://accounts.spotify.com/api/token', {
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    return response.data.access_token
  }

  async getProfile(accessToken: string): Promise<SpotifyProfile> {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    return response.data
  }

  async getPlaylistMeta(playlistId: string, accessToken: string): Promise<SpotifyPlaylistMeta> {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    return response.data
  }

  async getAllPlaylistTracks(playlistId: string, accessToken: string): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = []
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`

    while (url) {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      tracks.push(...response.data.items)
      url = response.data.next
    }

    return tracks
  }

  async getRecentlyPlayed(accessToken: string, limit: number = 50): Promise<SpotifyRecentlyPlayedItem[]> {
    const response = await axios.get(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    return response.data.items
  }

  async checkIfUserFollowsPlaylist(playlistId: string, userId: string, accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/followers/contains?ids=${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      return response.data[0] || false
    } catch (error) {
      console.error('Error checking playlist follow status:', error)
      return false
    }
  }

  async checkIfUserSavedTracks(trackIds: string[], accessToken: string): Promise<boolean[]> {
    try {
      const response = await axios.get(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      return response.data
    } catch (error) {
      console.error('Error checking saved tracks:', error)
      return new Array(trackIds.length).fill(false)
    }
  }
}

export const spotify = new SpotifyAPI()
