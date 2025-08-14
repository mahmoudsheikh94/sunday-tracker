import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getLinkMetrics } from '@/lib/metrics'
import { formatCopenhagen } from '@/lib/time'

async function getLinksData() {
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
    links.map(async (link) => {
      const metrics = await getLinkMetrics(link.id)
      return {
        ...link,
        metrics
      }
    })
  )

  return linksWithMetrics
}

export default async function LinksPage() {
  const links = await getLinksData()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tracking Links</h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor all your Spotify playlist tracking links
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
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Active Links</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {links.map((link) => (
              <div key={link.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {link.playlist.imageUrl && (
                      <img
                        src={link.playlist.imageUrl}
                        alt={link.playlist.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {link.title || link.playlist.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {link.playlist.ownerName} • Created {formatCopenhagen(link.createdAt, 'MMM d, yyyy')}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          Slug: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{link.slug}</code>
                        </span>
                        <span className="text-sm text-gray-600">
                          URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {process.env.APP_BASE_URL}/{link.slug}
                          </code>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {link.metrics?.totalConnections || 0}
                      </div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-blue-600">
                        {link.metrics?.last7Days?.activeListeners || 0}
                      </div>
                      <div className="text-xs text-gray-500">Active (7d)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {link.metrics?.last7Days?.tracksPlayed || 0}
                      </div>
                      <div className="text-sm text-gray-500">Streams (7d)</div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/links/${link.id}`}
                        className="text-green-600 hover:text-green-700 px-3 py-1 rounded-md text-sm font-medium border border-green-200 hover:bg-green-50"
                      >
                        View
                      </Link>
                      <Link
                        href={`/links/${link.id}/audience`}
                        className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md text-sm font-medium border border-blue-200 hover:bg-blue-50"
                      >
                        Audience
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
