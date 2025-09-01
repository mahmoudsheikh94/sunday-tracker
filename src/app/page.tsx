import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getLinkMetrics, LinkMetrics } from '@/lib/metrics'
import { formatCopenhagen } from '@/lib/time'

// Force dynamic rendering to prevent build-time database access
export const dynamic = 'force-dynamic'

interface LinkWithMetrics {
  id: string
  title?: string | null
  createdAt: Date
  playlist: {
    name: string
    ownerName?: string | null
    imageUrl?: string | null
  }
  _count: {
    connections: number
    clicks: number
  }
  metrics: LinkMetrics
}

async function getOverviewData(): Promise<LinkWithMetrics[]> {
  try {
    // Test database connection first
    await prisma.$connect()
    
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

    const linksWithMetrics = await Promise.all(
      links.map(async (link: any) => {
        try {
          const metrics = await getLinkMetrics(link.id)
          return {
            ...link,
            metrics
          }
        } catch (error) {
          console.error(`Error getting metrics for link ${link.id}:`, error)
          // Return default metrics if there's an error
          return {
            ...link,
            metrics: {
              totalConnections: 0,
              totalActiveListeners: 0,
              totalTracksPlayed: 0,
              totalMinutesListened: 0,
              totalSuperListeners: 0,
              last7Days: {
                newConnections: 0,
                activeListeners: 0,
                tracksPlayed: 0,
                superListeners: 0
              },
              recentConnections: []
            }
          }
        }
      })
    )

    return linksWithMetrics
  } catch (error) {
    console.error('Database connection error:', error)
    // Return empty array if database is not available
    return []
  } finally {
    await prisma.$disconnect()
  }
}

export default async function OverviewPage() {
  let links: LinkWithMetrics[] = []
  let hasError = false

  try {
    links = await getOverviewData()
  } catch (error) {
    console.error('Error loading overview data:', error)
    hasError = true
  }

  // Show error state if database is not available
  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
            <p className="mt-2 text-gray-600">
              Track engagement across all your Spotify playlists
            </p>
          </div>
          <Link
            href="/links/new"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Create New Link
          </Link>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Database Connection Issue
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Unable to connect to the database. This usually means the environment variables 
                  haven't been configured yet in Vercel. Please check your Vercel dashboard 
                  and ensure all environment variables are set.
                </p>
                <p className="mt-2">
                  Required environment variables:
                </p>
                <ul className="mt-1 list-disc list-inside">
                  <li>DATABASE_URL</li>
                  <li>SPOTIFY_CLIENT_ID</li>
                  <li>SPOTIFY_CLIENT_SECRET</li>
                  <li>SPOTIFY_REDIRECT_URI</li>
                  <li>APP_BASE_URL</li>
                  <li>CRON_KEY</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tracking links available</h3>
          <p className="text-gray-600 mb-6">
            Once the database connection is fixed, you'll be able to create and view tracking links
          </p>
          <Link
            href="/links/new"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Create Your First Link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
          <p className="mt-2 text-gray-600">
            Track engagement across all your Spotify playlists
          </p>
        </div>
        <Link
          href="/links/new"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
        >
          Create New Link
        </Link>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tracking links yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first tracking link to start monitoring playlist engagement
          </p>
          <Link
            href="/links/new"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Create Your First Link
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {links.map((link) => (
            <Link
              key={link.id}
              href={`/links/${link.id}`}
              className="block bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {link.title || link.playlist.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {link.playlist.ownerName}
                    </p>
                  </div>
                  {link.playlist.imageUrl && (
                    <img
                      src={link.playlist.imageUrl}
                      alt={link.playlist.name}
                      className="w-16 h-16 rounded-md object-cover"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {link.metrics?.last7Days?.newConnections || 0}
                    </div>
                    <div className="text-xs text-gray-500">New (7d)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {link.metrics?.last7Days?.activeListeners || 0}
                    </div>
                    <div className="text-xs text-gray-500">Active (7d)</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {link.metrics?.last7Days?.tracksPlayed || 0}
                    </div>
                    <div className="text-xs text-gray-500">Tracks (7d)</div>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {link.metrics?.totalTracksPlayed || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total Streams</div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Total: {link.metrics?.totalConnections || 0}</span>
                    <span>Created: {formatCopenhagen(link.createdAt, 'MMM d')}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {links.slice(0, 5).map((link) => (
              <div key={link.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  {link.playlist.imageUrl && (
                    <img
                      src={link.playlist.imageUrl}
                      alt={link.playlist.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {link.title || link.playlist.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {link.metrics?.last7Days?.tracksPlayed || 0} tracks played this week
                    </div>
                  </div>
                </div>
                <Link
                  href={`/links/${link.id}`}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
