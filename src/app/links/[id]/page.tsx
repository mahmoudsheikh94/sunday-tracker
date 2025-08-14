import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getLinkMetrics } from '@/lib/metrics'
import { formatCopenhagen } from '@/lib/time'
import RefreshPlaylistButton from '@/components/RefreshPlaylistButton'

interface LinkDetailPageProps {
  params: Promise<{ id: string }>
}

async function getLinkData(id: string) {
  const link = await prisma.trackingLink.findUnique({
    where: { id },
    include: {
      playlist: {
        include: {
          tracks: true
        }
      },
      _count: {
        select: {
          connections: true,
          clicks: true
        }
      }
    }
  })

  if (!link) {
    return null
  }

  const metrics = await getLinkMetrics(id)
  return { link, metrics }
}

export default async function LinkDetailPage({ params }: LinkDetailPageProps) {
  const { id } = await params
  const data = await getLinkData(id)
  
  if (!data) {
    notFound()
  }

  const { link, metrics } = data

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Link
              href="/links"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              ← Back to Links
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-3xl font-bold text-gray-900">
              {link.title || link.playlist.name}
            </h1>
          </div>
          <p className="text-gray-600">
            Track engagement and analytics for this playlist
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link
            href={`/links/${link.id}/audience`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            View Audience
          </Link>
        </div>
      </div>

      {/* Playlist Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{link.playlist.name}</h2>
            <p className="text-gray-500">by {link.playlist.ownerName}</p>
          </div>
          <div className="flex space-x-3">
            <RefreshPlaylistButton linkId={link.id} />
            <a
              href={`https://open.spotify.com/playlist/${link.playlist.spotifyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
            >
              🎵 Open in Spotify
            </a>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {link.playlist.tracks?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Total Tracks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(link.playlist.tracks?.length || 0) > 0 ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-500">Tracks Imported</div>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start space-x-6">
          {link.playlist.imageUrl && (
            <img
              src={link.playlist.imageUrl}
              alt={link.playlist.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Analytics Overview
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {link._count.connections}
                </div>
                <div className="text-sm text-gray-500">Total Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.totalActiveListeners || 0}
                </div>
                <div className="text-sm text-gray-500">Active Listeners</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics?.totalTracksPlayed || 0}
                </div>
                <div className="text-sm text-gray-500">Total Streams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {metrics?.totalMinutesListened || 0}
                </div>
                <div className="text-sm text-gray-500">Total Minutes</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Tracking Link Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short URL
              </label>
              <code className="block w-full bg-gray-100 px-3 py-2 rounded text-sm font-mono text-green-600">
                {process.env.APP_BASE_URL}/{link.slug}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created
              </label>
              <p className="text-gray-900">
                {formatCopenhagen(link.createdAt, 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Clicks
              </label>
              <p className="text-gray-900">{link._count.clicks}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                link.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {link.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Last 7 Days Metrics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Last 7 Days</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {metrics?.last7Days?.newConnections || 0}
            </div>
            <div className="text-sm text-gray-500">New Connections</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics?.last7Days?.activeListeners || 0}
            </div>
            <div className="text-sm text-gray-500">Active Listeners</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {metrics?.last7Days?.tracksPlayed || 0}
            </div>
            <div className="text-sm text-gray-500">Streams</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {Math.round((metrics?.totalMinutesListened || 0) / 7)}
            </div>
            <div className="text-sm text-gray-500">Avg Minutes/Day</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {metrics.recentConnections?.slice(0, 5).map((connection: any) => (
            <div key={connection.id} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {connection.user.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {connection.user.displayName || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Connected {formatCopenhagen(connection.connectedAt, 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {connection.totalTracksPlayed || 0} streams
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round((connection.totalMinutes || 0) / 60)} min
                </div>
              </div>
            </div>
          ))}
          
          {(!metrics.recentConnections || metrics.recentConnections.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No recent activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
