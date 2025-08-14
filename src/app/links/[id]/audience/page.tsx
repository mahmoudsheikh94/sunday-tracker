import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatCopenhagen } from '@/lib/time'

interface AudiencePageProps {
  params: Promise<{ id: string }>
}

async function getAudienceData(linkId: string) {
  const link = await prisma.trackingLink.findUnique({
    where: { id: linkId },
    include: { playlist: true }
  })

  if (!link) {
    return null
  }

  const connections = await prisma.userConnection.findMany({
    where: { linkId },
    include: {
      user: true,
      _count: {
        select: {
          plays: true
        }
      }
    },
    orderBy: { connectedAt: 'desc' }
  })

  return { link, connections }
}

export default async function AudiencePage({ params }: AudiencePageProps) {
  const { id } = await params
  const data = await getAudienceData(id)
  
  if (!data) {
    notFound()
  }

  const { link, connections } = data

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
            <Link
              href={`/links/${link.id}`}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              {link.title || link.playlist.name}
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-3xl font-bold text-gray-900">Audience</h1>
          </div>
          <p className="text-gray-600">
            View detailed analytics for users who connected to this playlist
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Audience Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {connections.length}
            </div>
            <div className="text-sm text-gray-500">Total Connections</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {connections.filter((c: any) => c.isActive).length}
            </div>
            <div className="text-sm text-gray-500">Active (45 days)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {connections.filter((c: any) => c.isActive).length}
            </div>
            <div className="text-sm text-gray-500">Recent (7 days)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {connections.reduce((sum: any, c: any) => sum + c._count.plays, 0)}
            </div>
            <div className="text-sm text-gray-500">Total Plays</div>
          </div>
        </div>
      </div>

      {/* Audience Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Connected Users</h2>
        </div>
        
        {connections.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-500">
              <div className="text-2xl mb-2">👥</div>
              <p>No users have connected to this playlist yet</p>
              <p className="text-sm mt-1">Share your tracking link to start building an audience</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracks Played
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {connections.map((connection: any) => (
                  <tr key={connection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-600">
                            {connection.user.displayName?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {connection.user.displayName || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {connection.user.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {connection.user.country || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCopenhagen(connection.connectedAt, 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {connection.lastPolledAt 
                        ? formatCopenhagen(connection.lastPolledAt, 'MMM d, h:mm a')
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {connection._count.plays}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        connection.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {connection.isActive ? 'Active' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Options */}
      {connections.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Export Data</h2>
          <div className="flex space-x-3">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium">
              Export CSV
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
              Export JSON
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Download audience data for further analysis
          </p>
        </div>
      )}
    </div>
  )
}
